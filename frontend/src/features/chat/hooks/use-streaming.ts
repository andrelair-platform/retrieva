'use client';

import { useState, useCallback, useRef } from 'react';
import type { Source } from '@/types';
import { getActiveWorkspaceContextId } from '@/shared/lib/workspace-context';
import i18n from '@/shared/i18n/config';
import { getApiUrl } from '@/lib/runtime-env';

/**
 * ISSUE #41 FIX: Streaming timeout configuration
 * - Initial connection timeout: 30 seconds (time to establish connection)
 * - Stream timeout: 120 seconds (max time for entire stream)
 * - Chunk timeout: 60 seconds (max time between chunks)
 */
const STREAM_CONNECT_TIMEOUT_MS = 30000; // 30 seconds to connect
const STREAM_TOTAL_TIMEOUT_MS = 120000; // 120 seconds max for entire stream
const STREAM_CHUNK_TIMEOUT_MS = 60000; // 60 seconds max between chunks

interface StreamingState {
  content: string;
  status: string;
  sources: Source[];
  isStreaming: boolean;
  error: string | null;
}

interface UseStreamingOptions {
  onComplete?: (content: string, sources: Source[]) => void;
  onError?: (error: string) => void;
  /** Override default connection timeout (ms) */
  connectTimeout?: number;
  /** Override default total stream timeout (ms) */
  totalTimeout?: number;
}

type SetStreamingState = (updater: (prev: StreamingState) => StreamingState) => void;

interface ParsedEvent {
  message?: string;
  data?: unknown;
  sources?: Source[];
  text?: string;
  chunk?: string;
  type?: string;
}

// Value pickers mirroring the original `a || b || fallback` chains.
const pickStatus = (p: ParsedEvent): string => p.message || (p.data as string) || '';
const pickSources = (p: ParsedEvent): Source[] => p.sources || (p.data as Source[]) || [];
const pickChunk = (p: ParsedEvent): string => p.text || p.chunk || (p.data as string) || '';

// Apply one decoded SSE event to the accumulators + UI state. Returns whether the stream is done.
// Mirrors the original inline dispatch exactly (throws on an `error` event, breaks on `done`).
function applyStructuredEvent(
  eventType: string,
  parsed: ParsedEvent,
  acc: { fullContent: string; sources: Source[] },
  setState: SetStreamingState
): boolean {
  if (eventType === 'status') {
    setState((prev) => ({ ...prev, status: pickStatus(parsed) }));
    return false;
  }
  if (eventType === 'sources') {
    acc.sources = pickSources(parsed);
    const next = acc.sources;
    setState((prev) => ({ ...prev, sources: next }));
    return false;
  }
  if (eventType === 'chunk') {
    // Backend sends { text: chunk }
    acc.fullContent += pickChunk(parsed);
    const next = acc.fullContent;
    setState((prev) => ({ ...prev, content: next, status: '' }));
    return false;
  }
  if (eventType === 'replace') {
    // Hallucination detected — replace streamed content with fallback
    acc.fullContent = parsed.text || '';
    const next = acc.fullContent;
    setState((prev) => ({ ...prev, content: next }));
    return false;
  }
  if (eventType === 'done') {
    return true;
  }
  if (eventType === 'error') {
    throw new Error(parsed.message || 'Stream error');
  }
  return false;
}

// Process one raw SSE line. Mutates `ctx` (currentEventType / accumulators) and returns done.
function processSseLine(
  line: string,
  ctx: { currentEventType: string; fullContent: string; sources: Source[] },
  setState: SetStreamingState
): boolean {
  if (line.startsWith('event: ')) {
    ctx.currentEventType = line.slice(7).trim();
    return false;
  }
  if (!line.startsWith('data: ')) return false;

  const data = line.slice(6);
  try {
    // Try to parse as JSON first (for structured events)
    const parsed = JSON.parse(data) as ParsedEvent;
    // Use the event type from the 'event:' line
    const eventType = ctx.currentEventType || parsed.type || '';
    const done = applyStructuredEvent(eventType, parsed, ctx, setState);
    // Reset event type after processing
    ctx.currentEventType = '';
    return done;
  } catch {
    // If not JSON, treat as raw text chunk
    if (data && data !== '[DONE]') {
      ctx.fullContent += data;
      const next = ctx.fullContent;
      setState((prev) => ({ ...prev, content: next, status: '' }));
    }
    ctx.currentEventType = '';
    return false;
  }
}

interface TimeoutHandles {
  connect: ReturnType<typeof setTimeout> | null;
  total: ReturnType<typeof setTimeout> | null;
  chunk: ReturnType<typeof setTimeout> | null;
}

// Build the fetch RequestInit for the RAG stream (adds the workspace header only when present).
function buildStreamRequest(
  question: string,
  conversationId: string | undefined,
  resolvedWorkspaceId: string | null | undefined,
  signal: AbortSignal
): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(resolvedWorkspaceId ? { 'X-Workspace-Id': resolvedWorkspaceId } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ question, conversationId, lang: i18n.language }),
    signal,
  };
}

// Validate the response and return its body reader. Clears the connect timeout once the response is
// in. Throws the original messages on a non-ok response / missing body.
async function openStreamReader(
  response: Response,
  timeouts: TimeoutHandles
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  // Clear connection timeout once response is received
  if (timeouts.connect) {
    clearTimeout(timeouts.connect);
    timeouts.connect = null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get response' }));
    throw new Error(error.message || 'Request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  return reader;
}

// Read + parse the SSE body to completion. Resets the chunk-timeout on each read and feeds every
// line through processSseLine. Returns the accumulated content + sources. Behaviour-identical to the
// original inline while-loop.
async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  setState: SetStreamingState,
  timeouts: TimeoutHandles,
  controller: AbortController
): Promise<{ fullContent: string; sources: Source[] }> {
  const decoder = new TextDecoder();
  let buffer = '';
  const ctx = { currentEventType: '', fullContent: '', sources: [] as Source[] };

  const resetChunkTimeout = () => {
    if (timeouts.chunk) {
      clearTimeout(timeouts.chunk);
    }
    timeouts.chunk = setTimeout(() => {
      controller.abort();
    }, STREAM_CHUNK_TIMEOUT_MS);
  };

  resetChunkTimeout();

  while (true) {
    const { done, value } = await reader.read();
    if (!done) {
      resetChunkTimeout();
    }
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (processSseLine(line, ctx, setState)) break;
    }
  }

  return { fullContent: ctx.fullContent, sources: ctx.sources };
}

// Map a thrown stream error to the terminal state update. AbortError is distinguished from a real
// error (partial content → interrupted message); returns the user-facing message for onError, or
// null when it was an abort (no onError callback in that case).
function handleStreamError(error: unknown, setState: SetStreamingState): string | null {
  if ((error as Error).name === 'AbortError') {
    // Distinguish between user abort and timeout mid-stream (partial content present).
    setState((prev) => {
      if (prev.content.length > 0) {
        return {
          ...prev,
          isStreaming: false,
          error: 'The response was interrupted. Your partial answer is shown above.',
        };
      }
      return { ...prev, isStreaming: false };
    });
    return null;
  }

  let errorMessage = error instanceof Error ? error.message : 'An error occurred';
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    errorMessage = 'The request timed out. Please try again.';
  }
  setState((prev) => ({ ...prev, isStreaming: false, error: errorMessage }));
  return errorMessage;
}

// Clear any pending connect/total/chunk timeout and null the handles.
function clearAllTimeouts(timeouts: TimeoutHandles): void {
  if (timeouts.connect) {
    clearTimeout(timeouts.connect);
    timeouts.connect = null;
  }
  if (timeouts.total) {
    clearTimeout(timeouts.total);
    timeouts.total = null;
  }
  if (timeouts.chunk) {
    clearTimeout(timeouts.chunk);
    timeouts.chunk = null;
  }
}

interface RunStreamDeps {
  setState: SetStreamingState;
  timeouts: TimeoutHandles;
  controller: AbortController;
  connectTimeout: number;
  totalTimeout: number;
  clearTimeouts: () => void;
  options: UseStreamingOptions;
}

// The full fetch → read → complete/error flow for one stream. Extracted from the hook so the
// useStreaming body stays small; behaviour-identical to the original inline try/catch.
async function runStream(
  question: string,
  conversationId: string | undefined,
  workspaceId: string | undefined,
  deps: RunStreamDeps
): Promise<void> {
  const { setState, timeouts, controller, connectTimeout, totalTimeout, clearTimeouts, options } = deps;
  try {
    const baseUrl = getApiUrl();
    const resolvedWorkspaceId = getActiveWorkspaceContextId(workspaceId);

    // ISSUE #41 FIX: Set connection + total stream timeouts
    timeouts.connect = setTimeout(() => controller.abort(), connectTimeout);
    timeouts.total = setTimeout(() => controller.abort(), totalTimeout);

    const response = await fetch(
      `${baseUrl}/rag/stream`,
      buildStreamRequest(question, conversationId, resolvedWorkspaceId, controller.signal)
    );

    const reader = await openStreamReader(response, timeouts);
    const { fullContent, sources } = await readStream(reader, setState, timeouts, controller);

    // ISSUE #41 FIX: Clear all timeouts on successful completion
    clearTimeouts();
    setState((prev) => ({ ...prev, isStreaming: false }));
    options.onComplete?.(fullContent, sources);
  } catch (error) {
    // ISSUE #41 FIX: Clear all timeouts on error
    clearTimeouts();
    const errorMessage = handleStreamError(error, setState);
    if (errorMessage !== null) {
      options.onError?.(errorMessage);
    }
  }
}

export function useStreaming(options: UseStreamingOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    content: '',
    status: '',
    sources: [],
    isStreaming: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  // ISSUE #41 FIX: Track timeout handles for cleanup
  const timeoutRefs = useRef<{
    connect: ReturnType<typeof setTimeout> | null;
    total: ReturnType<typeof setTimeout> | null;
    chunk: ReturnType<typeof setTimeout> | null;
  }>({ connect: null, total: null, chunk: null });

  // Helper to clear all timeouts
  const clearTimeouts = useCallback(() => clearAllTimeouts(timeoutRefs.current), []);

  const startStreaming = useCallback(
    async (question: string, conversationId?: string, workspaceId?: string) => {
      // Abort any existing stream and clear timeouts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearTimeouts();

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const controller = abortControllerRef.current;

      // Reset state
      setState({
        content: '',
        status: 'Thinking...',
        sources: [],
        isStreaming: true,
        error: null,
      });

      await runStream(question, conversationId, workspaceId, {
        setState,
        timeouts: timeoutRefs.current,
        controller,
        // ISSUE #41 FIX: Get timeout values from options or use defaults
        connectTimeout: options.connectTimeout ?? STREAM_CONNECT_TIMEOUT_MS,
        totalTimeout: options.totalTimeout ?? STREAM_TOTAL_TIMEOUT_MS,
        clearTimeouts,
        options,
      });
    },
    [options, clearTimeouts]
  );

  const stopStreaming = useCallback(() => {
    // ISSUE #41 FIX: Clear timeouts when stopping
    clearTimeouts();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, [clearTimeouts]);

  const reset = useCallback(() => {
    stopStreaming();
    setState({
      content: '',
      status: '',
      sources: [],
      isStreaming: false,
      error: null,
    });
  }, [stopStreaming]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset,
  };
}

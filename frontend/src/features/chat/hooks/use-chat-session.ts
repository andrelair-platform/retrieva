'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { conversationsApi } from '@/features/chat/api/conversations';
import { useActiveWorkspace } from '@/features/workspaces/queries/use-workspace-queries';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useStreaming } from '@/features/chat/hooks/use-streaming';
import {
  setPendingFirstMessage,
  takePendingFirstMessage,
} from '@/features/chat/lib/pending-first-message';
import type { Conversation, Message } from '@/types';

const EMPTY_MESSAGES: Message[] = [];

function buildUserMessage(messageId: string, conversationId: string, question: string): Message {
  return {
    id: messageId,
    conversationId,
    role: 'user',
    content: question,
    createdAt: new Date().toISOString(),
    feedback: null,
  };
}

/** Drop a trailing empty assistant placeholder before a retry/regenerate re-stream. */
function dropTrailingEmptyAssistant(messages: Message[]): Message[] {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'assistant' && !lastMessage.content) {
    return messages.slice(0, -1);
  }
  return messages;
}

/** Find the user message preceding a given assistant message id, or null if not regenerable. */
function findUserMessageToRegenerate(messages: Message[], messageId: string): Message | null {
  const messageIndex = messages.findIndex((message) => message.id === messageId);
  if (messageIndex <= 0) return null;

  const userMessage = messages[messageIndex - 1];
  if (userMessage?.role !== 'user') return null;
  return userMessage;
}

interface SendDispatchDeps {
  canQuery: boolean;
  activeWorkspace: ReturnType<typeof useActiveWorkspace>;
  conversation?: Conversation;
  setPendingQuestion: (value: string | null) => void;
  createConversationMutation: ReturnType<typeof useCreateConversationMutation>;
  sendWithConversation: (question: string, conversationId: string, workspaceId: string | null) => void;
}

/**
 * First-message handoff (issue #397): when this conversation page mounts right
 * after being created on /chat, send the stashed question once. takePending…
 * clears it, so StrictMode's double-invoke can't double-send.
 */
function usePendingFirstMessageHandoff(
  conversationId: string | undefined,
  send: (question: string, conversationId: string, workspaceId: string | null) => void
): void {
  useEffect(() => {
    if (!conversationId) return;
    const handoff = takePendingFirstMessage(conversationId);
    if (handoff) {
      send(handoff.question, conversationId, handoff.workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
}

interface RegenerateDeps {
  localMessages: Message[];
  setLocalMessages: Dispatch<SetStateAction<Message[]>>;
  conversation?: Conversation;
  startStreaming: ReturnType<typeof useStreaming>['startStreaming'];
  activeWorkspace: ReturnType<typeof useActiveWorkspace>;
}

/** Drop the last assistant message and re-stream the preceding user message. */
function regenerate(messageId: string, deps: RegenerateDeps): void {
  const { localMessages, setLocalMessages, conversation, startStreaming, activeWorkspace } = deps;
  const userMessage = findUserMessageToRegenerate(localMessages, messageId);
  if (!userMessage) return;

  setLocalMessages((prev) => prev.slice(0, -1));
  if (conversation?.id) {
    void startStreaming(userMessage.content, conversation.id, activeWorkspace?.id);
  }
}

/** Validate + route a send: permission/workspace guards, then create-conversation or stream. */
function dispatchSend(question: string, deps: SendDispatchDeps): void {
  const { canQuery, activeWorkspace, conversation, setPendingQuestion, createConversationMutation, sendWithConversation } = deps;
  if (!canQuery) {
    toast.error('You do not have permission to ask questions');
    return;
  }

  if (!activeWorkspace) {
    toast.error('Please select a workspace');
    return;
  }

  if (!conversation) {
    setPendingQuestion(question);
    createConversationMutation.mutate(question);
    return;
  }

  sendWithConversation(question, conversation.id, activeWorkspace.id);
}

interface UseChatSessionOptions {
  conversation?: Conversation;
  messages?: Message[];
  onConversationCreated?: (conversation: Conversation) => void;
  onMessageAdded?: (message: Message) => void;
}

function useCreateConversationMutation(opts: {
  activeWorkspace: ReturnType<typeof useActiveWorkspace>;
  pendingQuestion: string | null;
  setPendingQuestion: (value: string | null) => void;
  onConversationCreated?: (conversation: Conversation) => void;
}) {
  const { activeWorkspace, pendingQuestion, setPendingQuestion, onConversationCreated } = opts;
  return useMutation({
    mutationFn: async (question: string) => {
      if (!activeWorkspace) {
        throw new Error('No workspace selected');
      }

      const response = await conversationsApi.create({
        workspaceId: activeWorkspace.id,
        title: question.slice(0, 50) + (question.length > 50 ? '...' : ''),
      });
      return response.data?.conversation;
    },
    onSuccess: (newConversation) => {
      if (!newConversation) return;

      // Stash the question BEFORE navigating: onConversationCreated unmounts this
      // page, so sending here would abort the stream. The destination conversation
      // page picks it up on mount and sends it (issue #397).
      if (pendingQuestion) {
        setPendingFirstMessage({
          conversationId: newConversation.id,
          question: pendingQuestion,
          workspaceId: activeWorkspace?.id ?? null,
        });
        setPendingQuestion(null);
      }
      onConversationCreated?.(newConversation);
    },
    onError: () => {
      toast.error('Failed to create conversation');
      setPendingQuestion(null);
    },
  });
}

function useChatStreaming(opts: {
  conversation?: Conversation;
  canViewSourcesRef: MutableRefObject<boolean>;
  optimisticUserMessageIdRef: MutableRefObject<string | null>;
  setLocalMessages: Dispatch<SetStateAction<Message[]>>;
  onMessageAdded?: (message: Message) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const {
    conversation,
    canViewSourcesRef,
    optimisticUserMessageIdRef,
    setLocalMessages,
    onMessageAdded,
    queryClient,
  } = opts;
  return useStreaming({
    onComplete: (content, sources) => {
      optimisticUserMessageIdRef.current = null;
      const assistantMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversation?.id || '',
        role: 'assistant',
        content,
        sources: canViewSourcesRef.current ? sources : undefined,
        createdAt: new Date().toISOString(),
        feedback: null,
      };
      setLocalMessages((prev) => [...prev, assistantMessage]);
      onMessageAdded?.(assistantMessage);

      if (conversation?.id) {
        void queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      }
    },
    onError: (error) => {
      if (optimisticUserMessageIdRef.current) {
        setLocalMessages((prev) =>
          prev.filter((message) => message.id !== optimisticUserMessageIdRef.current)
        );
        optimisticUserMessageIdRef.current = null;
      }
      toast.error(error);
    },
  });
}

function useFeedbackMutation(opts: {
  conversation?: Conversation;
  setLocalMessages: Dispatch<SetStateAction<Message[]>>;
}) {
  const { conversation, setLocalMessages } = opts;
  return useMutation({
    mutationFn: async ({
      messageId,
      feedback,
    }: {
      messageId: string;
      feedback: 'positive' | 'negative' | null;
    }) => {
      if (!conversation?.id) return;
      await conversationsApi.submitFeedback(conversation.id, messageId, { feedback });
    },
    onSuccess: (_, { messageId, feedback }) => {
      setLocalMessages((prev) =>
        prev.map((message) => (message.id === messageId ? { ...message, feedback } : message))
      );
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });
}

function useChatHandlers({
  conversation,
  activeWorkspace,
  canQuery,
  localMessages,
  setLocalMessages,
  optimisticUserMessageIdRef,
  startStreaming,
  createConversationMutation,
  feedbackMutation,
  setPendingQuestion,
}: {
  conversation?: Conversation;
  activeWorkspace: ReturnType<typeof useActiveWorkspace>;
  canQuery: boolean;
  localMessages: Message[];
  setLocalMessages: Dispatch<SetStateAction<Message[]>>;
  optimisticUserMessageIdRef: MutableRefObject<string | null>;
  startStreaming: ReturnType<typeof useStreaming>['startStreaming'];
  createConversationMutation: ReturnType<typeof useCreateConversationMutation>;
  feedbackMutation: ReturnType<typeof useFeedbackMutation>;
  setPendingQuestion: (value: string | null) => void;
}) {
  const lastQuestionRef = useRef<{
    question: string;
    conversationId: string;
    workspaceId: string | null;
  } | null>(null);
  const [hasLastQuestion, setHasLastQuestion] = useState(false);

  const handleSendWithConversation = useCallback(
    async (question: string, conversationId: string, workspaceId: string | null) => {
      lastQuestionRef.current = { question, conversationId, workspaceId };
      setHasLastQuestion(true);
      const messageId = `user-${Date.now()}`;
      optimisticUserMessageIdRef.current = messageId;
      setLocalMessages((prev) => [...prev, buildUserMessage(messageId, conversationId, question)]);
      void startStreaming(question, conversationId, workspaceId ?? undefined);
    },
    [startStreaming, optimisticUserMessageIdRef, setLocalMessages]
  );

  usePendingFirstMessageHandoff(conversation?.id, (q, cId, wsId) =>
    void handleSendWithConversation(q, cId, wsId)
  );

  const handleSend = useCallback(
    async (question: string) => {
      dispatchSend(question, {
        canQuery,
        activeWorkspace,
        conversation,
        setPendingQuestion,
        createConversationMutation,
        sendWithConversation: (q, cId, wsId) => void handleSendWithConversation(q, cId, wsId),
      });
    },
    [activeWorkspace, canQuery, conversation, createConversationMutation, handleSendWithConversation, setPendingQuestion]
  );

  const handleRetry = useCallback(() => {
    if (!lastQuestionRef.current) {
      toast.error('No previous question to retry');
      return;
    }

    const { question, conversationId, workspaceId } = lastQuestionRef.current;
    setLocalMessages(dropTrailingEmptyAssistant);
    void startStreaming(question, conversationId, workspaceId ?? undefined);
  }, [startStreaming, setLocalMessages]);

  const handleFeedback = useCallback(
    (messageId: string, feedback: 'positive' | 'negative' | null) => {
      feedbackMutation.mutate({ messageId, feedback });
    },
    [feedbackMutation]
  );

  const handleRegenerate = (messageId: string) =>
    regenerate(messageId, { localMessages, setLocalMessages, conversation, startStreaming, activeWorkspace });

  return { hasLastQuestion, handleSend, handleRetry, handleFeedback, handleRegenerate };
}

export function useChatSession({
  conversation,
  messages,
  onConversationCreated,
  onMessageAdded,
}: UseChatSessionOptions) {
  const queryClient = useQueryClient();
  const activeWorkspace = useActiveWorkspace();
  const { canQuery, canViewSources } = usePermissions();
  const canViewSourcesRef = useRef(canViewSources);
  const stableMessages = messages ?? EMPTY_MESSAGES;
  const [localMessages, setLocalMessages] = useState<Message[]>(stableMessages);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const optimisticUserMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    canViewSourcesRef.current = canViewSources;
  }, [canViewSources]);

  useEffect(() => {
    if (stableMessages.length > 0 || localMessages.length > 0) {
      // Keep the optimistic message buffer aligned with server-driven message resets.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalMessages(stableMessages);
    }
  }, [stableMessages, localMessages.length]);

  const {
    content: streamingContent,
    status: streamingStatus,
    sources: streamingSources,
    isStreaming,
    error: streamingError,
    startStreaming,
    stopStreaming,
  } = useChatStreaming({
    conversation,
    canViewSourcesRef,
    optimisticUserMessageIdRef,
    setLocalMessages,
    onMessageAdded,
    queryClient,
  });

  const createConversationMutation = useCreateConversationMutation({
    activeWorkspace,
    pendingQuestion,
    setPendingQuestion,
    onConversationCreated,
  });

  const feedbackMutation = useFeedbackMutation({ conversation, setLocalMessages });

  const { hasLastQuestion, handleSend, handleRetry, handleFeedback, handleRegenerate } =
    useChatHandlers({
      conversation,
      activeWorkspace,
      canQuery,
      localMessages,
      setLocalMessages,
      optimisticUserMessageIdRef,
      startStreaming,
      createConversationMutation,
      feedbackMutation,
      setPendingQuestion,
    });

  return {
    activeWorkspace,
    canQuery,
    canViewSources,
    localMessages,
    streamingContent,
    streamingStatus,
    streamingSources,
    streamingError,
    isStreaming,
    isLoading:
      createConversationMutation.isPending || (isStreaming && streamingContent.length === 0),
    hasLastQuestion,
    handleSend,
    handleRetry,
    handleFeedback,
    handleRegenerate,
    stopStreaming,
  };
}

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

// Derived flags/strings for the chat input (keeps the branch logic out of the render body).
function chatInputState(args: {
  disabled: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  message: string;
  maxLength: number;
  onStop?: () => void;
  placeholder?: string;
  translatedDisabled: string;
  translatedPlaceholder: string;
}) {
  const { disabled, isLoading, isStreaming, message, maxLength, onStop } = args;
  const charCount = message.length;
  return {
    charCount,
    isDisabled: disabled || (!isStreaming && (isLoading || !message.trim())),
    showStop: isStreaming && Boolean(onStop),
    isNearLimit: charCount > maxLength * 0.9,
    overLimit: charCount >= maxLength,
    textareaDisabled: disabled || isLoading,
    resolvedPlaceholder: disabled ? args.translatedDisabled : (args.placeholder ?? args.translatedPlaceholder),
  };
}

export function ChatInput({
  onSend,
  onStop,
  isLoading = false,
  isStreaming = false,
  disabled = false,
  placeholder,
  maxLength = 4000,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || isStreaming || disabled) return;

    onSend(trimmedMessage);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    if (onStop && isStreaming) {
      onStop();
    }
  };

  const {
    charCount,
    isDisabled,
    showStop,
    isNearLimit,
    overLimit,
    textareaDisabled,
    resolvedPlaceholder,
  } = chatInputState({
    disabled,
    isLoading,
    isStreaming,
    message,
    maxLength,
    onStop,
    placeholder,
    translatedDisabled: t('chat.ui.input.disabledSend'),
    translatedPlaceholder: t('chat.ui.input.placeholder'),
  });

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            disabled={textareaDisabled}
            className={cn(
              'min-h-[52px] max-h-[200px] resize-none pr-24 py-3',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {/* Character count */}
            {isNearLimit && (
              <span
                className={cn(
                  'text-xs',
                  overLimit ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {charCount}/{maxLength}
              </span>
            )}

            {/* Send/Stop button */}
            {showStop ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={handleStop}
              >
                <StopCircle className="h-4 w-4" />
                <span className="sr-only">{t('chat.ui.input.stop')}</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                disabled={isDisabled}
                className="h-8 w-8"
                onClick={handleSubmit}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">{t('chat.ui.input.send')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Help text */}
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {t('chat.ui.input.helpPress')}{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> {t('chat.ui.input.helpToSend')}{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift+Enter</kbd> {t('chat.ui.input.helpNewLine')}
        </p>
      </div>
    </div>
  );
}

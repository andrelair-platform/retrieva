'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ChatInterface } from '@/components/chat';
import { Button } from '@/components/ui/button';
import { conversationsApi } from '@/shared/api';
import { useActiveWorkspace, useWorkspaceListQuery } from '@/lib/hooks';
import type { Conversation, Message } from '@/types';

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

type RawConversation = NonNullable<
  Awaited<ReturnType<typeof conversationsApi.get>>['data']
>['conversation'];
type RawMessage = NonNullable<
  NonNullable<Awaited<ReturnType<typeof conversationsApi.get>>['data']>['messages']
>[number];

function conversationTimestamps(conv: RawConversation | undefined): {
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
} {
  const now = new Date().toISOString();
  return {
    lastMessageAt: conv?.lastMessageAt || now,
    createdAt: conv?.createdAt || now,
    updatedAt: conv?.updatedAt || now,
  };
}

function conversationMeta(conv: RawConversation | undefined): {
  title: string;
  workspaceId: string;
  userId: string;
  messageCount: number;
} {
  return {
    title: conv?.title || 'Untitled',
    workspaceId: conv?.workspaceId || '',
    userId: conv?.userId || '',
    messageCount: conv?.messageCount || 0,
  };
}

function toConversation(conv: RawConversation | undefined, id: string): Conversation {
  return {
    id: String(conv?.id || id),
    isPinned: false,
    ...conversationMeta(conv),
    ...conversationTimestamps(conv),
  };
}

function toMessage(message: RawMessage, conversationId: string): Message {
  return {
    id: String(message.id),
    conversationId,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    sources: message.sources || undefined,
    createdAt: message.createdAt || message.timestamp || new Date().toISOString(),
    feedback: null,
  };
}

export function ConversationPage({ params }: ConversationPageProps) {
  const { t } = useTranslation();
  const { id } = use(params);
  const activeWorkspace = useActiveWorkspace();
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaceListQuery();

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const response = await conversationsApi.get(id);
      const conv = response.data?.conversation;
      const rawMessages = response.data?.messages || [];

      const conversation = toConversation(conv, id);
      const messages: Message[] = rawMessages.map((message) =>
        toMessage(message, conversation.id)
      );

      return { conversation, messages };
    },
    enabled: !!id,
  });

  if (workspacesLoading || (workspaces.length === 0 && !activeWorkspace) || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-destructive">{t('chat.conversation.failedLoad')}</p>
        <Link href="/conversations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('chat.conversation.back')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Link href="/conversations" aria-label={t('chat.conversation.backAriaList')}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('chat.conversation.backAria')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium truncate">{data.conversation.title}</h1>
          <p className="text-xs text-muted-foreground">
            {t('chat.messageCount', { count: data.conversation.messageCount })}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          conversation={data.conversation}
          messages={data.messages}
        />
      </div>
    </div>
  );
}

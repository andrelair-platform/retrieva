'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Pin,
  Calendar,
  MessageCircle,
  Plus,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/onboarding/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { conversationsApi } from '@/shared/api';
import { useActiveWorkspace, useWorkspaceListQuery } from '@/lib/hooks';
import { destructiveActionClasses } from '@/lib/styles/status-colors';
import type { Conversation } from '@/types';

/** True if any of the given boolean flags is set. */
function anyTrue(...flags: boolean[]): boolean {
  return flags.some(Boolean);
}

/** Split the loaded conversations into pinned/recent buckets + presence flags. */
function partitionConversations(data: Conversation[] | undefined) {
  const conversations: Conversation[] = data || [];
  const pinnedConversations = conversations.filter((conversation) => conversation.isPinned);
  const recentConversations = conversations.filter((conversation) => !conversation.isPinned);
  return {
    conversations,
    pinnedConversations,
    recentConversations,
    hasConversations: conversations.length > 0,
    hasPinned: pinnedConversations.length > 0,
    hasRecent: recentConversations.length > 0,
  };
}

/** i18n key for the "no active workspace" message, by workspace count. */
function noWorkspaceMessageKey(workspaceCount: number): string {
  return workspaceCount === 0 ? 'chat.createWorkspace' : 'chat.selectWorkspaceConv';
}

/** The mutually-exclusive render state of the conversation list body. */
type ListState = 'loading' | 'error' | 'empty' | 'list';

function listState(isLoading: boolean, error: unknown, count: number): ListState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (count === 0) return 'empty';
  return 'list';
}

/** The selection toolbar shows only in selection mode with at least one item picked. */
function isSelecting(selectionMode: boolean, selectedCount: number): boolean {
  return selectionMode && selectedCount > 0;
}

/** Button variant for the select-mode toggle. */
function selectModeVariant(selectionMode: boolean): 'secondary' | 'outline' {
  return selectionMode ? 'secondary' : 'outline';
}

// eslint-disable-next-line complexity -- residual count is irreducible JSX conditional rendering (loading/error/empty/list branches + selection-mode toggles); non-JSX logic already extracted to helpers and rule 3 forbids splitting the JSX into sub-components; tracked minicloud-gitops#2353
export function ConversationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeWorkspace = useActiveWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaceListQuery();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: async () => {
      const response = await conversationsApi.list({ limit: 100 });
      return response.data?.conversations || [];
    },
    enabled: Boolean(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('chat.list.toast.deleted'));
      setConversationToDelete(null);
    },
    onError: () => {
      toast.error(t('chat.list.toast.deleteFailed'));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => conversationsApi.bulkDelete(ids),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('chat.list.toast.bulkDeleted', { count: response.data?.deletedCount || 0 }));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error(t('chat.list.toast.bulkDeleteFailed'));
    },
  });

  const { conversations, pinnedConversations, recentConversations, hasConversations, hasPinned, hasRecent } =
    partitionConversations(data);
  const bodyState = listState(isLoading, error, conversations.length);
  const isDeleting = anyTrue(deleteMutation.isPending, bulkDeleteMutation.isPending);
  const showSelectionBar = isSelecting(isSelectionMode, selectedIds.size);
  const confirmingSingle = Boolean(conversationToDelete);
  const selectButtonVariant = selectModeVariant(isSelectionMode);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(conversations.map((conversation) => conversation.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteClick = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteMutation.mutate(conversationToDelete);
    } else if (selectedIds.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  if (workspacesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t(noWorkspaceMessageKey(workspaces.length))}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{t('chat.list.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('chat.list.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasConversations && (
            <Button
              variant={selectButtonVariant}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) {
                  setSelectedIds(new Set());
                }
              }}
            >
              {isSelectionMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {t('common.cancel')}
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {t('chat.list.select')}
                </>
              )}
            </Button>
          )}
          <Button onClick={() => router.push('/chat')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('chat.list.newChat')}
          </Button>
        </div>
      </div>

      {showSelectionBar && (
        <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{t('chat.list.selectedCount', { count: selectedIds.size })}</span>
            <Button variant="ghost" size="sm" onClick={selectAll}>{t('chat.list.selectAll')}</Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>{t('chat.list.deselectAll')}</Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {t('chat.list.deleteSelected')}
          </Button>
        </div>
      )}

      {bodyState === 'loading' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bodyState === 'error' ? (
        <div className="text-center py-12">
          <p className="text-destructive">{t('chat.list.failedLoad')}</p>
        </div>
      ) : bodyState === 'empty' ? (
        <EmptyState
          icon={MessageSquare}
          heading={t('chat.list.empty.heading')}
          description={t('chat.list.empty.description')}
          cta={t('chat.list.empty.cta')}
          onAction={() => router.push('/chat')}
          hint={t('chat.list.empty.hint')}
        />
      ) : (
        <div className="space-y-6">
          {hasPinned && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Pin className="h-4 w-4" />
                {t('chat.list.pinned', { count: pinnedConversations.length })}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pinnedConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/conversations/${conversation.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isSelectionMode && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleSelection(conversation.id);
                                }}
                                className="shrink-0"
                              >
                                {selectedIds.has(conversation.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <h3 className="font-medium truncate">{conversation.title}</h3>
                            <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {t('chat.messageCount', { count: conversation.messageCount })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(conversation.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {!isSelectionMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 shrink-0 ${destructiveActionClasses}`}
                            onClick={(event) => handleDeleteClick(conversation.id, event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {hasRecent && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {t('chat.list.recent', { count: recentConversations.length })}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/conversations/${conversation.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isSelectionMode && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleSelection(conversation.id);
                                }}
                                className="shrink-0"
                              >
                                {selectedIds.has(conversation.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <h3 className="font-medium truncate">{conversation.title}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {t('chat.messageCount', { count: conversation.messageCount })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(conversation.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {!isSelectionMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 shrink-0 ${destructiveActionClasses}`}
                            onClick={(event) => handleDeleteClick(conversation.id, event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmingSingle ? t('chat.list.deleteOne') : t('chat.list.deleteMany', { count: selectedIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingSingle
                ? t('chat.list.deleteOneDesc')
                : t('chat.list.deleteManyDesc', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={destructiveActionClasses}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

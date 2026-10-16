'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

// Realtime subscription for the AgentOps workspace. The backend emits `run.updated` on run
// start/resume + gate decisions (org-scoped room); on each event we invalidate the runs + approvals
// queries so the UI reflects it instantly. Polling stays as a fallback (if the socket can't connect,
// nothing breaks). Same-origin: the ingress routes /socket.io → the backend; the JWT cookie auths it.

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

/** Subscribe the component to live run/approval updates. Invalidates React Query on `run.updated`. */
export function useRunUpdates(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    const onUpdate = () => {
      qc.invalidateQueries({ queryKey: ['assessment-runs'] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
    };
    s.on('run.updated', onUpdate);
    return () => {
      s.off('run.updated', onUpdate);
    };
  }, [qc]);
}

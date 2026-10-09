import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const connect = useSocketStore((state) => state.connect);
  const disconnect = useSocketStore((state) => state.disconnect);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      // Don't disconnect on unmount, we want the connection to persist across the app
      // Only disconnect when not authenticated
    };
  }, [isAuthenticated, connect, disconnect]);
}

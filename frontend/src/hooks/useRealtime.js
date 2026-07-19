import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectRealtime, disconnectRealtime } from '../lib/realtime';
import { qk } from '../lib/query';

/**
 * Keeps Socket.IO connected for the active portal session and
 * invalidates notification queries the moment events arrive.
 */
export function useRealtime({ portal } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const tokenKey =
      portal === 'vendor'
        ? 'rentelio_vendor_token'
        : portal === 'admin'
          ? 'rentelio_token'
          : 'rentelio_customer_token';

    if (!localStorage.getItem(tokenKey)) return undefined;

    connectRealtime({
      onNotification: () => {
        if (portal === 'vendor') {
          queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications'] });
          queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications', 'unread'] });
        } else if (portal === 'user') {
          queryClient.invalidateQueries({ queryKey: qk.userNotifications });
          queryClient.invalidateQueries({ queryKey: ['user', 'notifications', 'unread'] });
        } else {
          queryClient.invalidateQueries({ queryKey: qk.adminNotifications });
        }
      },
    });

    return () => {
      disconnectRealtime();
    };
  }, [portal, queryClient]);
}

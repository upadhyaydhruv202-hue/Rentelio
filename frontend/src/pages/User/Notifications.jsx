import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDate, userApi } from '../../services/api';
import { invalidateLifecycle, POLL_MS, qk } from '../../lib/query';

function resolveLink(n) {
  if (n.link) return n.link;
  if (n.type === 'wallet' || n.type === 'deposit') return '/user/wallet';
  if (n.type === 'rental' || n.type === 'pickup' || n.type === 'order') return '/user/rentals';
  if (n.type === 'promo') return '/user/browse';
  return '/user/notifications';
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: qk.userNotifications,
    queryFn: userApi.getNotifications,
    refetchInterval: POLL_MS,
  });

  const markRead = useMutation({
    mutationFn: userApi.markNotificationRead,
    onSuccess: () => {
      invalidateLifecycle(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user', 'notifications', 'unread'] });
    },
  });

  const openNotification = async (n) => {
    const path = resolveLink(n);
    if (!n.read) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        /* still navigate */
      }
    }
    if (path && path !== '/user/notifications') navigate(path);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Notifications'}</h1>
        <p className="text-sm text-ink-500">
          Real-time alerts — tap any item to open the related screen
        </p>
      </div>

      {error && <p className="text-rose-600">{error.message}</p>}
      {isLoading ? (
        <p className="text-ink-500">{'Loading…'}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-500">{'No notifications'}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openNotification(n)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:border-brand-400 ${
                  n.read
                    ? 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
                    : 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {formatDate(n.createdAt)}
                      {resolveLink(n) ? ` · Open ${resolveLink(n)}` : ''}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      New
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../services/api';
import { vendorApi } from '../../services/vendorApi';
import { POLL_MS } from '../../lib/query';

function resolveLink(n) {
  if (n.link) return n.link;
  if (n.type === 'inventory') return '/vendor/inventory';
  if (n.type === 'pickup' || n.type === 'order') return '/vendor/pickup-return';
  if (n.type === 'deposit') return '/vendor/money';
  return '/vendor/notifications';
}

export default function VendorNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['vendor', 'notifications'],
    queryFn: vendorApi.getNotifications,
    refetchInterval: POLL_MS,
  });

  const markRead = useMutation({
    mutationFn: vendorApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications', 'unread'] });
    },
  });

  const openNotification = async (n) => {
    const path = resolveLink(n);
    if (!n.read) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        /* navigate anyway */
      }
    }
    if (path) navigate(path);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Notifications'}</h1>
        <p className="text-sm text-ink-500">
          Live seller alerts — tap to jump into the matching workflow
        </p>
      </div>

      {error && <p className="text-rose-600">{error.message}</p>}
      {isLoading ? (
        <p className="text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-500">No notifications</p>
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
                      {n.type} · {formatDate(n.createdAt)}
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

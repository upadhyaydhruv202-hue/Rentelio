import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../components/Card';
import Table, { StatusBadge } from '../components/Table';
import PageHeader, { ActionBtn } from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import { api, formatDate } from '../services/api';
import { invalidateLifecycle, POLL_MS, qk } from '../lib/query';

const PLATFORM_TABS = ['health', 'backups', 'ads', 'reviews', 'overview'];

export default function Platform() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [adForm, setAdForm] = useState({
    title: '',
    body: '',
    placement: 'home',
    linkUrl: '/user/browse',
    active: true,
  });
  const tab = PLATFORM_TABS.includes(params.get('tab')) ? params.get('tab') : 'health';
  const setTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'health') next.delete('tab');
    else next.set('tab', t);
    setParams(next, { replace: true });
  };

  const { data: overview } = useQuery({
    queryKey: [...qk.adminPlatform, 'overview'],
    queryFn: api.getPlatformOverview,
    refetchInterval: POLL_MS,
  });

  const { data: health } = useQuery({
    queryKey: [...qk.adminPlatform, 'health'],
    queryFn: api.getPlatformHealth,
    refetchInterval: POLL_MS,
  });

  const { data: backups = [] } = useQuery({
    queryKey: [...qk.adminPlatform, 'backups'],
    queryFn: api.listBackups,
  });

  const { data: ads = [] } = useQuery({
    queryKey: qk.adminAds,
    queryFn: api.getAdminAds,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: qk.adminReviews,
    queryFn: () => api.getAdminReviews(),
  });

  const refresh = () => invalidateLifecycle(queryClient);

  const createBackup = useMutation({
    mutationFn: () => api.createBackup({ note: 'Manual Super Admin backup', backupType: 'manual' }),
    onSuccess: refresh,
  });

  const restore = useMutation({
    mutationFn: (filename) => api.restoreBackup(filename),
    onSuccess: refresh,
  });

  const createAd = useMutation({
    mutationFn: () => api.createAd(adForm),
    onSuccess: () => {
      setAdForm({ title: '', body: '', placement: 'home', linkUrl: '/user/browse', active: true });
      refresh();
    },
  });

  const lastBackup = backups[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health & Platform"
        subtitle="Infrastructure monitoring · backups · ads · moderation"
      />

      <div className="flex flex-wrap gap-1">
        {PLATFORM_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              tab === t ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'health' && (
        <>
          <StatGrid
            items={[
              {
                title: 'Server',
                value: health?.server?.online ? 'Online' : 'Offline',
                subtitle: `CPU ${health?.server?.cpuUsage ?? '—'}% · RAM ${health?.server?.memoryUsage ?? '—'}%`,
                accent: 'brand',
              },
              {
                title: 'Database',
                value: health?.database?.health || '—',
                subtitle: `Ping ${health?.database?.queryPerformanceMs ?? '—'}ms`,
                accent: 'sky',
              },
              {
                title: 'API Uptime',
                value: `${health?.api?.uptimePercent ?? '—'}%`,
                subtitle: `${health?.api?.errors24h ?? 0} errors (24h)`,
                accent: 'violet',
              },
              {
                title: 'Payment Gateway',
                value: health?.paymentGateway?.status || '—',
                subtitle: `Success ${health?.paymentGateway?.successRate ?? '—'}%`,
                accent: 'amber',
              },
            ]}
          />
          <div className="holo-card flex items-center gap-3 px-4 py-3 text-sm">
            <span className="inline-flex h-3 w-3 rounded-full bg-brand-500 heartbeat" />
            <span>Infrastructure lattice · server heartbeat synchronized</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card
              title="Storage used"
              value={health?.storage?.usedLabel || '—'}
              subtitle={`${health?.storage?.remainingGb?.toFixed?.(1) ?? '—'} GB remaining of ${health?.storage?.totalGb ?? 50} GB`}
              accent="slate"
            />
            <Card
              title="Active users"
              value={health?.users?.activeUsers ?? '—'}
              subtitle={`Concurrent ~${health?.users?.concurrentUsers ?? '—'} · logins 24h ${health?.users?.loginActivity24h ?? 0}`}
              accent="sky"
            />
            <Card
              title="Response time"
              value={`${health?.server?.responseTimeMs ?? '—'} ms`}
              subtitle={`Uptime ${Math.floor((health?.uptimeSeconds || 0) / 3600)}h`}
              accent="brand"
            />
          </div>
          <div className="rounded-2xl border border-ink-200/80 bg-white p-4 dark:border-ink-700 dark:bg-ink-900">
            <h2 className="font-display text-lg font-semibold">Real-time logs</h2>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
              {(health?.logs || []).map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 rounded-xl border border-ink-100 px-3 py-2 dark:border-ink-800"
                >
                  <StatusBadge status={log.level === 'alert' ? 'Cancelled' : 'Active'} />
                  <div>
                    <p>{log.message}</p>
                    <p className="text-xs text-ink-400">{formatDate(log.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'backups' && (
        <>
          <StatGrid
            items={[
              {
                title: 'Last Backup',
                value: lastBackup ? formatDate(lastBackup.createdAt) : 'None',
                accent: 'brand',
              },
              {
                title: 'Backup Size',
                value: lastBackup ? `${(lastBackup.sizeBytes / 1024).toFixed(1)} KB` : '—',
                accent: 'sky',
              },
              {
                title: 'Storage Location',
                value: 'local:/backups',
                accent: 'slate',
              },
              {
                title: 'Status',
                value: lastBackup ? 'Ready' : 'Empty',
                accent: 'amber',
              },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <ActionBtn tone="brand" onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
              Create manual backup
            </ActionBtn>
            <span className="self-center text-xs text-ink-400">
              Automatic backups are represented as demo schedule metadata in history.
            </span>
          </div>
          <Table
            columns={[
              { key: 'id', label: 'Backup ID' },
              {
                key: 'createdAt',
                label: 'Date',
                render: (b) => formatDate(b.createdAt),
              },
              {
                key: 'sizeBytes',
                label: 'Size',
                render: (b) => `${(b.sizeBytes / 1024).toFixed(1)} KB`,
              },
              { key: 'backupType', label: 'Type', render: (b) => b.backupType || 'manual' },
              {
                key: 'status',
                label: 'Status',
                render: () => <StatusBadge status="Completed" />,
              },
              { key: 'createdBy', label: 'Created By', render: (b) => b.createdBy || 'system' },
              {
                key: 'actions',
                label: 'Actions',
                render: (b) => (
                  <div className="flex gap-1">
                    <ActionBtn
                      tone="sky"
                      onClick={() => window.open(b.downloadPath, '_blank')}
                    >
                      Download
                    </ActionBtn>
                    <ActionBtn tone="amber" onClick={() => restore.mutate(b.filename)}>
                      Restore
                    </ActionBtn>
                  </div>
                ),
              },
            ]}
            rows={backups}
          />
          {restore.data && (
            <p className="text-sm text-amber-700 dark:text-amber-300">{restore.data.message}</p>
          )}
        </>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Customers" value={overview?.customers ?? '—'} accent="sky" />
          <Card title="Products" value={overview?.products ?? '—'} accent="brand" />
          <Card title="Vendors" value={overview?.vendors ?? '—'} accent="violet" />
          <Card title="Open fraud" value={overview?.openFraudAlerts ?? '—'} accent="rose" />
        </div>
      )}

      {tab === 'ads' && (
        <>
          <form
            className="grid gap-2 rounded-2xl border border-ink-200 p-4 dark:border-ink-700 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createAd.mutate();
            }}
          >
            <input
              required
              placeholder="Ad title"
              value={adForm.title}
              onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
            />
            <input
              placeholder="Link URL"
              value={adForm.linkUrl}
              onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })}
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
            />
            <textarea
              placeholder="Body"
              value={adForm.body}
              onChange={(e) => setAdForm({ ...adForm, body: e.target.value })}
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950 sm:col-span-2"
            />
            <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white sm:col-span-2">
              Create ad
            </button>
          </form>
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'placement', label: 'Placement' },
              {
                key: 'active',
                label: 'Active',
                render: (a) => (a.active ? 'Yes' : 'No'),
              },
            ]}
            rows={ads}
          />
        </>
      )}

      {tab === 'reviews' && (
        <Table
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'rating', label: 'Rating' },
            { key: 'comment', label: 'Comment' },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex gap-1">
                  <ActionBtn
                    tone="brand"
                    onClick={() => api.moderateReview(r.id, 'Approved').then(refresh)}
                  >
                    Approve
                  </ActionBtn>
                  <ActionBtn
                    tone="rose"
                    onClick={() => api.moderateReview(r.id, 'Rejected').then(refresh)}
                  >
                    Reject
                  </ActionBtn>
                </div>
              ),
            },
          ]}
          rows={reviews}
        />
      )}
    </div>
  );
}

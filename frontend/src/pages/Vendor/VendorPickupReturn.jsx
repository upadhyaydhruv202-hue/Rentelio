import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table, { StatusBadge } from '../../components/Table';
import { formatDate } from '../../services/api';
import { vendorApi } from '../../services/vendorApi';
import { POLL_MS } from '../../lib/query';

const STAGES = [
  'Pickup Scheduled',
  'Pickup Assigned',
  'Out For Pickup',
  'Picked Up',
  'Rental Active',
  'Return Scheduled',
  'Returned',
  'Inspection',
  'Completed',
];

const FILTERS = ['today', 'tomorrow', 'week', 'month'];

export default function VendorPickupReturn() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'week';
  const focusId = Number(params.get('focus')) || null;

  const setFilter = (f) => {
    const next = new URLSearchParams(params);
    if (f === 'week') next.delete('filter');
    else next.set('filter', f);
    setParams(next, { replace: true });
  };

  const [otpDrafts, setOtpDrafts] = useState({});
  const [msg, setMsg] = useState('');

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['vendor', 'pickup', filter],
    queryFn: () => vendorApi.getSchedule({ filter }),
    refetchInterval: POLL_MS,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'pickup'] });

  const genMutation = useMutation({
    mutationFn: vendorApi.generateOtps,
    onSuccess: refresh,
  });

  const verifyPickup = useMutation({
    mutationFn: ({ id, otp }) => vendorApi.verifyPickupOtp(id, otp),
    onSuccess: () => {
      setMsg('Pickup OTP verified');
      refresh();
    },
    onError: (e) => setMsg(e.message),
  });

  const verifyReturn = useMutation({
    mutationFn: ({ id, otp }) => vendorApi.verifyReturnOtp(id, { otp }),
    onSuccess: () => {
      setMsg('Return OTP verified');
      refresh();
    },
    onError: (e) => setMsg(e.message),
  });

  const advance = useMutation({
    mutationFn: ({ id, stage }) => vendorApi.advanceTracker(id, stage),
    onSuccess: refresh,
    onError: (e) => setMsg(e.message),
  });

  const orderedRows = focusId
    ? [...rows].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : rows;

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (r) => (
        <span className={focusId === r.id ? 'font-bold text-brand-700' : ''}>#{r.id}</span>
      ),
    },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Product' },
    {
      key: 'scheduledPickup',
      label: 'Pickup',
      render: (r) => formatDate(r.scheduledPickup || r.startDate),
    },
    {
      key: 'scheduledReturn',
      label: 'Return',
      render: (r) => formatDate(r.scheduledReturn || r.returnDate),
    },
    {
      key: 'trackerStage',
      label: 'Tracker',
      render: (r) => <StatusBadge status={r.trackerStage || '—'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div
          className={`flex min-w-[240px] flex-col gap-2 rounded-lg p-1 ${
            focusId === r.id ? 'bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-950/40' : ''
          }`}
        >
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded-lg bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800"
              onClick={() => genMutation.mutate(r.id)}
            >
              Gen OTP
            </button>
            <select
              className="rounded-lg border border-ink-200 px-1 py-1 text-xs dark:border-ink-700 dark:bg-ink-950"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) advance.mutate({ id: r.id, stage: e.target.value });
              }}
            >
              <option value="">Advance stage…</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            <input
              className="w-20 rounded border border-ink-200 px-1 text-xs dark:border-ink-700 dark:bg-ink-950"
              placeholder="OTP"
              value={otpDrafts[r.id] || ''}
              onChange={(e) => setOtpDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
            />
            <button
              type="button"
              className="rounded bg-sky-600 px-2 text-xs text-white"
              onClick={() => verifyPickup.mutate({ id: r.id, otp: otpDrafts[r.id] })}
            >
              Pickup
            </button>
            <button
              type="button"
              className="rounded bg-brand-600 px-2 text-xs text-white"
              onClick={() => verifyReturn.mutate({ id: r.id, otp: otpDrafts[r.id] })}
            >
              Return
            </button>
          </div>
          {(r.pickupOtp || r.returnOtp) && (
            <p className="text-[10px] text-ink-400">
              OTPs — Pickup: {r.pickupOtp || '—'} · Return: {r.returnOtp || '—'}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pickup & Return</h1>
          <p className="text-sm text-ink-500">Schedule, OTP verify, and tracker stages</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-sm text-brand-700 dark:text-brand-300">{msg}</p>}
      {error && <p className="text-rose-600">{error.message}</p>}
      {isLoading ? (
        <p className="text-ink-500">Loading schedule…</p>
      ) : (
        <Table columns={columns} rows={orderedRows} />
      )}
    </div>
  );
}

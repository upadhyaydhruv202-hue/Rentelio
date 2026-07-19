import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table, { StatusBadge } from '../../components/Table';
import { formatINR, formatDate } from '../../services/api';
import { vendorApi } from '../../services/vendorApi';
import { POLL_MS } from '../../lib/query';
import VendorRentalScheduler from './VendorRentalScheduler';

const STATUSES = ['Requested', 'Approved', 'Active', 'Return Pending', 'Overdue', 'Completed', 'Cancelled'];

const VIEWS = [
  { id: 'orders', label: 'Orders' },
  { id: 'schedule', label: 'Schedule' },
];

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [msg, setMsg] = useState('');
  const view = VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'orders';
  const setView = (id) => {
    const next = new URLSearchParams(params);
    if (id === 'orders') next.delete('view');
    else next.set('view', id);
    setParams(next, { replace: true });
  };

  const { data: rentals = [], isLoading, error } = useQuery({
    queryKey: ['vendor', 'rentals'],
    queryFn: vendorApi.getRentals,
    refetchInterval: POLL_MS,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => vendorApi.updateRentalStatus(id, status),
    onSuccess: () => {
      setMsg('Status updated');
      queryClient.invalidateQueries({ queryKey: ['vendor', 'rentals'] });
    },
    onError: (e) => setMsg(e.message),
  });

  const columns = [
    { key: 'id', label: 'Order', render: (r) => `#${r.id}` },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Product' },
    { key: 'startDate', label: 'Start', render: (r) => formatDate(r.startDate) },
    { key: 'returnDate', label: 'Return', render: (r) => formatDate(r.returnDate) },
    { key: 'amount', label: 'Amount', render: (r) => formatINR(r.amount) },
    {
      key: 'depositAmount',
      label: 'Deposit',
      render: (r) => formatINR(r.depositAmount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <select
          value={r.status}
          onChange={(e) => updateStatus.mutate({ id: r.id, status: e.target.value })}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-950"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'badge',
      label: 'Current',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{'Rental Orders'}</h1>
          <p className="text-sm text-ink-500">Manage orders and view the rental schedule</p>
        </div>
        <div className="inline-flex rounded-xl border border-ink-200 bg-white/70 p-1 dark:border-ink-700 dark:bg-ink-950/50">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === v.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'schedule' ? (
        <VendorRentalScheduler rentals={rentals} isLoading={isLoading} error={error} />
      ) : (
        <>
          {msg && <p className="text-sm text-brand-700">{msg}</p>}
          {error && <p className="text-rose-600">{error.message}</p>}
          {isLoading ? (
            <p className="text-ink-500">Loading orders…</p>
          ) : (
            <Table columns={columns} rows={rentals} emptyMessage="No orders yet" />
          )}
        </>
      )}
    </div>
  );
}

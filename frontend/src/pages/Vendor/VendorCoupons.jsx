import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table, { StatusBadge } from '../../components/Table';
import { formatINR, formatDate } from '../../services/api';
import { vendorApi } from '../../services/vendorApi';
import { POLL_MS } from '../../lib/query';

const emptyForm = {
  code: '',
  label: '',
  description: '',
  type: 'percent',
  value: '',
  minAmount: '',
  maxUsage: '',
  expiresAt: '',
  active: true,
};

export default function VendorCoupons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: coupons = [], isLoading, error: loadError } = useQuery({
    queryKey: ['vendor', 'coupons'],
    queryFn: vendorApi.getCoupons,
    refetchInterval: POLL_MS,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'coupons'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        value: Number(form.value),
        minAmount: Number(form.minAmount) || 0,
        maxUsage: Number(form.maxUsage) || 0,
        expiresAt: form.expiresAt || null,
      };
      if (editingId) return vendorApi.updateCoupon(editingId, payload);
      return vendorApi.createCoupon(payload);
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setError('');
      refresh();
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: vendorApi.deleteCoupon,
    onSuccess: refresh,
    onError: (err) => setError(err.message),
  });

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      label: c.label || '',
      description: c.description || '',
      type: c.type || 'percent',
      value: c.value,
      minAmount: c.minAmount ?? '',
      maxUsage: c.maxUsage ?? '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      active: c.active !== false,
    });
    setShowForm(true);
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description', render: (c) => c.description || '—' },
    { key: 'type', label: 'Type' },
    {
      key: 'value',
      label: 'Value',
      render: (c) => (c.type === 'percent' ? `${c.value}%` : formatINR(c.value)),
    },
    { key: 'minAmount', label: 'Min Amount', render: (c) => formatINR(c.minAmount) },
    { key: 'maxUsage', label: 'Max Usage', render: (c) => c.maxUsage || '∞' },
    {
      key: 'expiresAt',
      label: 'Expires',
      render: (c) => formatDate(c.expiresAt),
    },
    {
      key: 'active',
      label: 'Active',
      render: (c) => <StatusBadge status={c.active ? 'Available' : 'Cancelled'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEdit(c)}
            className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs dark:border-ink-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this coupon?')) deleteMutation.mutate(c.id);
            }}
            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-700 dark:border-rose-800"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{'Coupons'}</h1>
          <p className="text-sm text-ink-500">Create and manage coupon codes</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowForm(true);
          }}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500"
        >
          Add Coupon
        </button>
      </div>

      {(error || loadError) && <p className="text-sm text-rose-600">{error || loadError?.message}</p>}

      {showForm && (
        <form
          className="grid gap-4 rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <h2 className="sm:col-span-2 font-display text-lg font-semibold">
            {editingId ? 'Edit Coupon' : 'New Coupon'}
          </h2>
          {!editingId && (
            <label className="text-sm font-medium">
              Code
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
              />
            </label>
          )}
          <label className="text-sm font-medium">
            Label
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Shown at checkout"
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="text-sm font-medium">
            Type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Value
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="text-sm font-medium">
            Min Amount
            <input
              type="number"
              min="0"
              value={form.minAmount}
              onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="text-sm font-medium">
            Max Usage
            <input
              type="number"
              min="0"
              value={form.maxUsage}
              onChange={(e) => setForm({ ...form, maxUsage: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="text-sm font-medium">
            Expires At
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">
            Description
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white"
            >
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-xl border border-ink-200 px-4 py-2 text-sm dark:border-ink-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? <p className="text-ink-500">Loading coupons…</p> : <Table columns={columns} rows={coupons} />}
    </div>
  );
}

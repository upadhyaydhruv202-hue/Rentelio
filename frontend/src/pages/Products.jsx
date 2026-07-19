import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table, { StatusBadge } from '../components/Table';
import ProductMedia from '../components/ProductMedia';
import { api, calcSecurityDeposit, formatINR } from '../services/api';
import { invalidateLifecycle, POLL_MS, qk } from '../lib/query';

const emptyForm = {
  name: '',
  category: '',
  quantity: 1,
  pricePerDay: '',
  pricePerHour: '',
  status: 'Available',
  description: '',
  brand: '',
  color: '',
  size: '',
  storage: '',
  edition: '',
  condition: 'Good',
  warranty: '',
  maintenanceStatus: 'None',
  maintenanceNote: '',
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function Products({ user }) {
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState('');

  const { data: products = [], isLoading, error: loadError } = useQuery({
    queryKey: qk.adminProducts,
    queryFn: api.getProducts,
    refetchInterval: POLL_MS,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ payload, file }) => {
      if (editingId) return api.updateProduct(editingId, payload, file);
      return api.createProduct(payload, file);
    },
    onSuccess: async () => {
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      setImageFile(null);
      setImagePreview('');
      setExistingImage('');
      setError('');
      await invalidateLifecycle(queryClient);
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: async () => invalidateLifecycle(queryClient),
    onError: (err) => setError(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setExistingImage('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      pricePerDay: product.pricePerDay,
      pricePerHour: product.pricePerHour || '',
      status: product.status,
      description: product.description || '',
      brand: product.brand || '',
      color: product.color || '',
      size: product.size || '',
      storage: product.storage || '',
      edition: product.edition || '',
      condition: product.condition || 'Good',
      warranty: product.warranty || '',
      maintenanceStatus: product.maintenanceStatus || 'None',
      maintenanceNote: product.maintenanceNote || '',
    });
    setImageFile(null);
    setImagePreview('');
    setExistingImage(product.image || product.imageUrl || '');
    setError('');
    setShowForm(true);
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0] || null;
    setError('');
    if (!file) {
      setImageFile(null);
      setImagePreview('');
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPG, JPEG, PNG, and WEBP images are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!editingId && !imageFile) {
      setError('Please upload a product image before creating the product.');
      return;
    }

    saveMutation.mutate({
      payload: {
        ...form,
        quantity: Number(form.quantity),
        pricePerDay: Number(form.pricePerDay),
        pricePerHour:
          form.pricePerHour !== '' && form.pricePerHour != null
            ? Number(form.pricePerHour)
            : undefined,
      },
      file: imageFile || undefined,
    });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this product?')) return;
    deleteMutation.mutate(id);
  };

  const liveDeposit = calcSecurityDeposit(form.pricePerDay);

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (r) =>
        r.image || r.imageUrl ? (
          <ProductMedia
            src={r.image || r.imageUrl}
            alt={r.name}
            frameClassName="h-12 w-12 rounded-lg border border-ink-100 p-0.5 dark:border-ink-800"
          />
        ) : (
          '—'
        ),
    },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'brand', label: 'Brand', render: (r) => r.brand || '—' },
    { key: 'quantity', label: 'Qty' },
    {
      key: 'pricePerDay',
      label: 'Price/Day',
      render: (r) => formatINR(r.pricePerDay),
    },
    {
      key: 'pricePerHour',
      label: 'Price/Hr',
      render: (r) => formatINR(r.pricePerHour),
    },
    {
      key: 'securityDeposit',
      label: 'Deposit',
      render: (r) => formatINR(r.securityDeposit),
    },
    { key: 'status', label: 'Availability', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'maintenanceStatus',
      label: 'Maintenance',
      render: (r) =>
        r.maintenanceStatus && r.maintenanceStatus !== 'None' ? (
          <StatusBadge status={r.maintenanceStatus} />
        ) : (
          '—'
        ),
    },
    {
      key: 'archived',
      label: 'Archived',
      render: (r) => (r.archived ? 'Yes' : 'No'),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                >
                  Edit
                </button>
                {r.archived ? (
                  <button
                    type="button"
                    onClick={() => api.restoreProduct(r.id).then(() => invalidateLifecycle(queryClient))}
                    className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs text-brand-700"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => api.archiveProduct(r.id).then(() => invalidateLifecycle(queryClient))}
                    className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs text-amber-700"
                  >
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-ink-500">
            {isAdmin
              ? 'Product image upload is required — archive, maintenance & variants supported'
              : 'Browse inventory'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Add Product
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loadError && <p className="text-sm text-rose-600">{loadError.message}</p>}

      {isAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900 sm:grid-cols-2 lg:grid-cols-3"
        >
          <h2 className="sm:col-span-2 lg:col-span-3 font-display text-lg font-semibold">
            {editingId ? 'Edit Product' : 'New Product'}
          </h2>
          {[
            { key: 'name', label: 'Product Name', type: 'text', required: true },
            { key: 'category', label: 'Category', type: 'text', required: true },
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'color', label: 'Color', type: 'text' },
            { key: 'size', label: 'Size', type: 'text' },
            { key: 'storage', label: 'Storage', type: 'text' },
            { key: 'edition', label: 'Edition', type: 'text' },
            { key: 'warranty', label: 'Warranty', type: 'text' },
            { key: 'quantity', label: 'Quantity', type: 'number', required: true },
            { key: 'pricePerDay', label: 'Price Per Day', type: 'number', required: true },
            { key: 'pricePerHour', label: 'Price Per Hour', type: 'number', required: false },
          ].map((field) => (
            <label key={field.key} className="text-sm font-medium text-ink-600 dark:text-ink-300">
              {field.label}
              <input
                type={field.type}
                required={field.required}
                min={field.type === 'number' ? 0 : undefined}
                step={
                  field.key === 'pricePerDay' || field.key === 'pricePerHour' ? '0.01' : undefined
                }
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-ink-700 dark:bg-ink-950"
              />
            </label>
          ))}
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300">
            Condition
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none dark:border-ink-700 dark:bg-ink-950"
            >
              <option>New</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300">
            Maintenance
            <select
              value={form.maintenanceStatus}
              onChange={(e) => setForm({ ...form, maintenanceStatus: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none dark:border-ink-700 dark:bg-ink-950"
            >
              <option>None</option>
              <option>InspectionDue</option>
              <option>CleaningDue</option>
              <option>RepairPending</option>
              <option>UnderMaintenance</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300">
            Security Deposit
            <input
              type="text"
              readOnly
              value={
                form.pricePerDay === '' || form.pricePerDay == null
                  ? ''
                  : formatINR(liveDeposit)
              }
              placeholder="Auto: price × 1.5"
              className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-ink-700 outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200"
            />
            <span className="mt-1 block text-xs text-ink-400">
              Auto-calculated as Price Per Day × 1.5 (read-only)
            </span>
          </label>
          <label className="text-sm font-medium text-ink-600 dark:text-ink-300">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none dark:border-ink-700 dark:bg-ink-950"
            >
              <option>Available</option>
              <option>Rented</option>
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-950">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="aspect-square w-full object-contain object-center p-3"
                />
              ) : existingImage ? (
                <ProductMedia
                  src={existingImage}
                  alt="Current product"
                  frameClassName="aspect-square w-full p-3"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center px-3 text-center text-xs text-ink-400">
                  Image preview
                </div>
              )}
            </div>
            <label className="text-sm font-medium text-ink-600 dark:text-ink-300">
              Product image{' '}
              <span className="font-normal text-rose-600">
                {editingId ? '(optional — upload to replace)' : '(required)'}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={onPickImage}
                required={!editingId}
                className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-500"
              />
              <p className="mt-2 text-xs text-ink-500">
                JPG, JPEG, PNG, or WEBP · max 5 MB. Only Admin-uploaded images are used — no
                automatic fetching.
              </p>
              {imageFile && (
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="mt-2 text-xs text-rose-600 hover:underline"
                >
                  Remove selected image
                </button>
              )}
            </label>
          </div>

          <label className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-ink-600 dark:text-ink-300">
            Maintenance note
            <input
              value={form.maintenanceNote}
              onChange={(e) => setForm({ ...form, maintenanceNote: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-ink-600 dark:text-ink-300">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 outline-none dark:border-ink-700 dark:bg-ink-950"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-ink-200 px-4 py-2 text-sm dark:border-ink-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? <p className="text-ink-500">Loading products…</p> : <Table columns={columns} rows={products} />}
    </div>
  );
}

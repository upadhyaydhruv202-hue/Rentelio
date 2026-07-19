import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ProductMedia from '../../components/ProductMedia';
import { formatINR, productDeposit, productHourlyRate, userApi } from '../../services/api';
import { invalidateLifecycle, POLL_MS, qk } from '../../lib/query';

export default function Cart() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: qk.userCart,
    queryFn: userApi.getCart,
    refetchInterval: POLL_MS,
  });

  const remove = useMutation({
    mutationFn: userApi.removeFromCart,
    onSuccess: () => invalidateLifecycle(queryClient),
  });

  const clear = useMutation({
    mutationFn: userApi.clearCart,
    onSuccess: () => invalidateLifecycle(queryClient),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{'Cart'}</h1>
          <p className="text-sm text-ink-500">{'Items saved for checkout'}</p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clear.mutate()}
            className="text-sm text-rose-600 hover:underline"
          >
            {'Clear cart'}
          </button>
        )}
      </div>

      {error && <p className="text-rose-600">{error.message}</p>}
      {isLoading ? (
        <p className="text-ink-500">{'Loading…'}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center text-ink-500">
          {'Cart is empty.'}{' '}
          <Link to="/user/browse" className="text-brand-700 hover:underline">
            {'Browse products'}
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const p = item.product || item;
            return (
              <li
                key={item.id || p.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-900"
              >
                <ProductMedia
                  src={p.image}
                  alt={p.name}
                  frameClassName="h-20 w-20 rounded-xl border border-ink-100 p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{p.name}</p>
                  <p className="text-sm text-ink-500">
                    {formatINR(p.pricePerDay)} / {'day'} · {formatINR(productHourlyRate(p))} / {'hr'} · {'Deposit'}{' '}
                    {formatINR(productDeposit(p))}
                  </p>
                </div>
                <Link
                  to={`/user/products/${p.id}`}
                  className="rounded-xl bg-brand-600 px-3 py-2 text-sm text-white"
                >
                  {'Rent'}
                </Link>
                <button
                  type="button"
                  onClick={() => remove.mutate(p.id)}
                  className="text-sm text-rose-600"
                >
                  {'Remove'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

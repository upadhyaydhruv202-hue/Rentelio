import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductMedia from '../../components/ProductMedia';
import { formatINR, productDeposit, productHourlyRate, userApi } from '../../services/api';

const STORAGE_KEY = 'rentelio_compare_ids';

export function getCompareIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function toggleCompareId(id) {
  const ids = getCompareIds().map(Number);
  const n = Number(id);
  let next;
  if (ids.includes(n)) next = ids.filter((x) => x !== n);
  else if (ids.length >= 3) next = [...ids.slice(1), n];
  else next = [...ids, n];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('rentelio-compare'));
  return next;
}

export default function Compare() {
  const [ids, setIds] = useState(getCompareIds);

  useEffect(() => {
    const sync = () => setIds(getCompareIds());
    window.addEventListener('rentelio-compare', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('rentelio-compare', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['user', 'compare', ids],
    queryFn: async () => {
      const rows = await Promise.all(ids.map((id) => userApi.getProduct(id).catch(() => null)));
      return rows.filter(Boolean);
    },
    enabled: ids.length > 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Compare'}</h1>
        <p className="text-sm text-ink-500">{'Side-by-side up to 3 products'}</p>
      </div>

      {ids.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center text-ink-500">
          {'No products selected.'}{' '}
          <Link to="/user/browse" className="text-brand-700 hover:underline">
            {'Browse and add to compare'}
          </Link>
        </p>
      ) : isLoading ? (
        <p className="text-ink-500">{'Loading…'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left text-ink-400">{'Spec'}</th>
                {products.map((p) => (
                  <th key={p.id} className="min-w-[180px] p-3 text-left">
                    <ProductMedia
                      src={p.image}
                      alt={p.name}
                      frameClassName="mb-2 h-28 w-full rounded-xl border border-ink-100 p-2"
                    />
                    <Link to={`/user/products/${p.id}`} className="font-display font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      className="mt-1 block text-xs text-rose-600"
                      onClick={() => setIds(toggleCompareId(p.id))}
                    >
                      {'Remove'}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Category', (p) => p.category],
                ['Brand', (p) => p.brand || '—'],
                ['Price / day', (p) => formatINR(p.pricePerDay)],
                ['Price / hour', (p) => formatINR(productHourlyRate(p))],
                ['Deposit', (p) => formatINR(productDeposit(p))],
                ['Condition', (p) => p.condition || '—'],
                ['Storage', (p) => p.storage || '—'],
                ['Edition', (p) => p.edition || '—'],
                ['Warranty', (p) => p.warranty || '—'],
              ].map(([label, fn]) => (
                <tr key={label} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="p-3 font-medium text-ink-500">{label}</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      {fn(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

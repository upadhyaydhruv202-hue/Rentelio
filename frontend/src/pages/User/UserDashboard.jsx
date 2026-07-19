import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import OrderCard from '../../components/OrderCard';
import AdBanner from '../../components/AdBanner';
import AiPulseBar from '../../components/AiPulseBar';
import RentelioLogo from '../../components/RentelioLogo';
import { userApi } from '../../services/api';
import { POLL_MS, qk } from '../../lib/query';

export default function UserDashboard({ customer }) {
  const { data, error, isLoading } = useQuery({
    queryKey: qk.userDashboard,
    queryFn: userApi.getDashboard,
    refetchInterval: POLL_MS,
  });

  const { data: ads = [] } = useQuery({
    queryKey: qk.ads('home'),
    queryFn: () => userApi.getAds('home'),
  });

  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem('rentelio_recent_products') || '[]');
  } catch {
    recent = [];
  }

  if (isLoading) return <p className="text-ink-500">{'Loading your store…'}</p>;
  if (error) return <p className="text-rose-600">{error.message}</p>;

  const firstName = customer?.name?.split(' ')[0] || 'there';
  const cards = [
    { label: 'Active Rentals', value: data.stats.activeRentals },
    { label: 'Upcoming Returns', value: data.stats.upcomingReturns },
    { label: 'Completed Rentals', value: data.stats.completedRentals },
    { label: 'Pending Requests', value: data.stats.pendingRequests },
  ];

  return (
    <div className="space-y-8">
      <AdBanner ads={ads} />

      <AiPulseBar
        title={`Hello ${firstName} — your rental space is ready.`}
        body={`${data.stats.activeRentals} active · ${data.stats.upcomingReturns} returns upcoming · ${data.stats.pendingRequests} pending.`}
      />

      <section className="panel-ink px-6 py-10">
        <div className="relative z-[1] max-w-2xl text-left">
          <RentelioLogo
            size="lg"
            spin
            colorClass="text-white"
            showTagline
            taglineClass="!text-brand-300 !mt-2"
          />
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {firstName}, {'ready to rent?'}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            {'Live inventory from Rentelio — book available gear and track it in My Rentals.'}
          </p>
          <Link
            to="/user/browse"
            className="btn-living mt-5 inline-flex rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400"
          >
            {'Browse all products'}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="holo-card p-5">
            <p className="text-sm text-ink-500 dark:text-ink-400">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink-900 dark:text-white">
              {c.value}
            </p>
          </div>
        ))}
      </section>

      {data.categories?.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">
            {'Shop by category'}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.categories.map((cat) => (
              <Link
                key={cat}
                to={`/user/browse?category=${encodeURIComponent(cat)}`}
                className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-800 hover:border-brand-400 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">
            {'Recommended for you'}
          </h2>
          <Link to="/user/browse" className="text-sm text-brand-700 hover:underline dark:text-brand-300">
            {'See all'}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">
            {'Recently viewed'}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">
            {'Active Rentals'}
          </h2>
          <Link to="/user/rentals" className="text-sm text-brand-700 hover:underline dark:text-brand-300">
            {'Your orders'}
          </Link>
        </div>
        {data.activeRentals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
            {'No active rentals yet. Find something to rent!'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.activeRentals.map((r) => (
              <OrderCard key={r.id} rental={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../../components/Card';
import AnimatedCounter from '../../components/AnimatedCounter';
import AiPulseBar from '../../components/AiPulseBar';
import { formatINR, formatDate } from '../../services/api';
import { vendorApi } from '../../services/vendorApi';
import { POLL_MS } from '../../lib/query';

const PIE_COLORS = ['#8f79bc', '#9aabd9', '#d97706', '#7c3aed'];
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

export default function VendorDashboard() {
  const [params, setParams] = useSearchParams();
  const period = PERIODS.includes(params.get('period')) ? params.get('period') : 'daily';
  const setPeriod = (p) => {
    const next = new URLSearchParams(params);
    if (p === 'daily') next.delete('period');
    else next.set('period', p);
    setParams(next, { replace: true });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'dashboard'],
    queryFn: vendorApi.getDashboard,
    refetchInterval: POLL_MS,
  });

  const series = useMemo(() => data?.revenueSeries?.[period] || [], [data, period]);
  const inventoryData = useMemo(() => {
    if (!data?.inventoryMix) return [];
    const m = data.inventoryMix;
    return [
      { name: 'Available', value: m.available },
      { name: 'Reserved', value: m.reserved },
      { name: 'Rented', value: m.rented },
      { name: 'Maintenance', value: m.maintenance },
    ];
  }, [data]);

  const maxDay = useMemo(() => {
    const days = data?.heatmap?.days || {};
    return Math.max(1, ...Object.values(days));
  }, [data]);

  if (isLoading) return <p className="text-ink-500">{'Loading seller dashboardâ€¦'}</p>;
  if (error) return <p className="text-rose-600">{error.message}</p>;

  const { stats, profit, activities = [], heatmap } = data;

  const kpis = [
    { title: 'Total Products', value: stats.totalProducts, accent: 'brand' },
    { title: 'Available Products', value: stats.availableProducts, accent: 'sky' },
    { title: 'Active Rentals', value: stats.activeRentals, accent: 'violet' },
    { title: 'Rentals Due Today', value: stats.dueToday, accent: 'amber' },
    { title: 'Upcoming Pickups', value: stats.upcomingPickups, accent: 'sky' },
    { title: 'Upcoming Returns', value: stats.upcomingReturns, accent: 'amber' },
    { title: 'Overdue Rentals', value: stats.overdueRentals, accent: 'rose' },
    { title: 'Under Maintenance', value: stats.underMaintenance, accent: 'rose' },
    { title: 'Revenue From Rentals', value: formatINR(stats.totalRevenue), accent: 'brand' },
    { title: 'Profit Earned', value: formatINR(stats.totalProfit), accent: 'sky' },
    { title: 'Deposits Held', value: formatINR(stats.depositsHeld), accent: 'amber' },
    { title: 'Deposits Pending Refund', value: formatINR(stats.depositsPendingRefund), accent: 'violet' },
    { title: 'Late Fee Collection', value: formatINR(stats.lateFeeCollected), accent: 'rose' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Seller Dashboard'}</h1>
        <p className="text-sm text-ink-500">{'Your storefront KPIs â€” isolated to your catalog only'}</p>
      </div>

      <AiPulseBar
        title={'Vendor node synchronized'}
        body={`${stats.activeRentals} active rentals Â· ${formatINR(stats.totalRevenue)} revenue Â· ${stats.availableProducts} available SKUs.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.title} title={k.title} value={k.value} accent={k.accent} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's Profit", value: profit.daily },
          { label: 'Weekly Profit', value: profit.weekly },
          { label: 'Monthly Profit', value: profit.monthly },
          { label: 'Yearly Profit', value: profit.yearly },
        ].map((p) => (
          <div
            key={p.label}
            className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900"
          >
            <p className="text-sm text-ink-500">{p.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-brand-700 dark:text-brand-300">
              â‚¹<AnimatedCounter value={Math.round(p.value)} />
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Revenue</h2>
            <div className="flex gap-1">
              {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${
                    period === p ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="value" fill="#8f79bc" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
          <h2 className="mb-4 font-display text-lg font-semibold">Inventory utilization</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inventoryData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {inventoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0284c7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold">Live activity</h2>
          <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">
            {activities.map((a) => (
              <li key={a.id} className="border-l-2 border-brand-500 pl-3 text-sm">
                <p className="font-medium">{a.message}</p>
                <p className="text-xs text-ink-400">
                  {a.type} Â· {formatDate(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">Rental heat map</h2>
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(heatmap?.days || {}).map(([day, count]) => (
              <div key={day} className="text-center">
                <div
                  className="mx-auto flex h-14 w-full items-center justify-center rounded-xl text-sm font-semibold text-white"
                  style={{ background: `rgba(13, 148, 136, ${0.2 + count / maxDay * 0.8})` }}
                >
                  {count}
                </div>
                <p className="mt-1 text-xs text-ink-500">{day}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-ink-400">Most rented / profitable</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(heatmap?.products || []).map((p) => (
                  <li key={p.name} className="flex justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className="text-ink-500">
                      {p.count} Â· {formatINR(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-ink-400">Top categories</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(heatmap?.categories || []).map((c) => (
                  <li key={c.category} className="rounded-lg bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">
                    {c.category} ({c.count})
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-medium uppercase text-ink-400">Peak hours</p>
              <div className="mt-2 flex h-10 items-end gap-0.5">
                {(heatmap?.hours || []).map((h) => {
                  const maxH = Math.max(1, ...(heatmap?.hours || []).map((x) => x.count));
                  return (
                    <div
                      key={h.hour}
                      title={`${h.hour}:00 â€” ${h.count}`}
                      className="flex-1 rounded-t bg-brand-500/80"
                      style={{ height: `${Math.max(8, (h.count / maxH) * 100)}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

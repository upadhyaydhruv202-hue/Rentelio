import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatGrid from '../components/StatGrid';
import PageHeader from '../components/PageHeader';
import Table, { StatusBadge } from '../components/Table';
import AiPulseBar from '../components/AiPulseBar';
import { api, formatINR, formatDate } from '../services/api';
import { POLL_MS, qk } from '../lib/query';

export default function Dashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: qk.adminControlCenter,
    queryFn: api.getControlCenter,
    refetchInterval: POLL_MS,
  });

  const cards = useMemo(() => {
    if (!data?.cards) return [];
    const c = data.cards;
    return [
      { title: 'Registered Users', value: c.totalUsers, accent: 'sky' },
      { title: 'Verified Vendors', value: c.verifiedVendors, accent: 'brand' },
      { title: 'Pending Verification', value: c.pendingVendorVerification, accent: 'amber' },
      { title: 'Active Rentals', value: c.activeRentals, accent: 'sky' },
      { title: 'Completed Rentals', value: c.completedRentals, accent: 'brand' },
      { title: 'Cancelled Rentals', value: c.cancelledRentals, accent: 'rose' },
      { title: 'Total Revenue', value: formatINR(c.totalRevenue), accent: 'brand' },
      { title: 'Platform Commission', value: formatINR(c.platformCommission), accent: 'violet' },
      { title: 'Pending Payouts', value: formatINR(c.pendingPayouts), accent: 'amber' },
      { title: 'Blacklisted Accounts', value: c.blacklisted, accent: 'rose' },
      {
        title: 'Settlements Pending',
        value: formatINR(c.settlementsPendingAmount),
        subtitle: `${c.settlementsPendingCount} payouts`,
        accent: 'slate',
      },
    ];
  }, [data]);

  const rentalActivity = useMemo(() => {
    const rows = data?.charts?.rentalActivity || [];
    let end = rows.length;
    while (end > 1 && !Number(rows[end - 1]?.value) && !Number(rows[end - 1]?.revenue)) {
      end -= 1;
    }
    return rows.slice(0, end);
  }, [data?.charts?.rentalActivity]);

  if (isLoading) return <p className="text-ink-500">Loading control center…</p>;
  if (error) return <p className="text-rose-600">{error.message}</p>;

  const charts = data.charts || {};
  const insights = data.aiInsights || [];
  const recent = data.recent || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Control Center"
        subtitle="Platform-wide visibility · finance · growth"
        actions={
          <Link
            to="/admin/payouts"
            className="btn-living rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          >
            Payouts
          </Link>
        }
      />

      <AiPulseBar
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}. Your rental ecosystem is online.`}
        body={`${data.cards.activeRentals} active rentals · ${formatINR(data.cards.totalRevenue)} GMV · ${data.cards.verifiedVendors} verified vendors.`}
      />

      <StatGrid items={cards} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="holo-card chart-living p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Rental activity & revenue</h2>
            <span className="text-xs text-ink-400">Conversion {data.conversionRate}%</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rentalActivity}
                margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                barCategoryGap="28%"
              >
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8f79bc" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8f79bc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-ink-200 dark:stroke-ink-700"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                  minTickGap={12}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  yAxisId="l"
                  tick={{ fontSize: 11 }}
                  width={36}
                  allowDecimals={false}
                  tickMargin={6}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={44}
                  tickMargin={6}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'Revenue' ? formatINR(value) : value
                  }
                />
                <Legend verticalAlign="bottom" height={28} iconType="circle" />
                <Bar
                  yAxisId="l"
                  dataKey="value"
                  name="Rentals"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Area
                  yAxisId="r"
                  type="linear"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#8f79bc"
                  strokeWidth={2}
                  fill="url(#rev)"
                  dot={{ r: 3, fill: '#8f79bc', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="holo-card ai-pulse p-4">
          <h2 className="font-display text-lg font-semibold">AI Insights</h2>
          <ul className="mt-3 space-y-3">
            {insights.map((ins) => (
              <li
                key={ins.title}
                className="rounded-xl border border-ink-200/60 bg-white/70 p-3 text-sm dark:border-ink-700 dark:bg-ink-950/60"
              >
                <p className="font-medium text-ink-800 dark:text-ink-100">{ins.title}</p>
                <p className="mt-1 text-ink-500">{ins.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="User growth">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-ink-200 dark:stroke-ink-700" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Vendor growth">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.vendorGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-ink-200 dark:stroke-ink-700" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Commission earnings">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.commissionEarnings || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-ink-200 dark:stroke-ink-700" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Top vendors</h2>
          <Table
            columns={[
              { key: 'name', label: 'Vendor' },
              { key: 'rentals', label: 'Rentals' },
              { key: 'revenue', label: 'GMV', render: (r) => formatINR(r.revenue) },
            ]}
            rows={charts.topVendors || []}
          />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Most rented categories</h2>
          <Table
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'count', label: 'Listings' },
            ]}
            rows={charts.categories || []}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Location stats</h2>
          <Table
            columns={[
              { key: 'location', label: 'Location' },
              { key: 'count', label: 'Vendors' },
            ]}
            rows={charts.locations || []}
          />
        </div>
        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Recent platform activity</h2>
          <Table
            columns={[
              { key: 'type', label: 'Type', render: (a) => <StatusBadge status={a.type} /> },
              { key: 'message', label: 'Message' },
              { key: 'createdAt', label: 'When', render: (a) => formatDate(a.createdAt) },
            ]}
            rows={recent.activities || []}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">New vendors</h2>
          <Table
            columns={[
              { key: 'company', label: 'Business' },
              { key: 'name', label: 'Owner' },
              { key: 'kycStatus', label: 'KYC', render: (v) => <StatusBadge status={v.kycStatus} /> },
              { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v.status} /> },
            ]}
            rows={recent.vendors || []}
          />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">New users</h2>
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              {
                key: 'verified',
                label: 'Verified',
                render: (u) => (u.verified ? 'Yes' : 'No'),
              },
              { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
            ]}
            rows={recent.users || []}
          />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="holo-card chart-living p-4">
      <h2 className="mb-2 font-display text-base font-semibold">{title}</h2>
      <div className="h-48">{children}</div>
    </div>
  );
}

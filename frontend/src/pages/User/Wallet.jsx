import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatINR, formatDate, userApi } from '../../services/api';
import { POLL_MS, qk } from '../../lib/query';

const BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra',
  'Yes Bank',
];

const METHOD_META = {
  card: { label: 'Card', hint: 'Visa / Mastercard / RuPay' },
  upi: { label: 'UPI', hint: 'GPay, PhonePe, Paytm' },
  netbanking: { label: 'Net Banking', hint: 'All major banks' },
  wallet: { label: 'Other', hint: 'Demo instant credit' },
};

function formatCardInput(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function Wallet() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: qk.userWallet,
    queryFn: userApi.getWallet,
    refetchInterval: POLL_MS,
  });

  const quickAmounts = data?.quickAmounts || [100, 250, 500, 1000, 2000, 5000];
  const methods = useMemo(() => {
    if (data?.paymentMethods?.length) return data.paymentMethods;
    return Object.entries(METHOD_META).map(([id, m]) => ({ id, label: m.label }));
  }, [data]);

  const depositMutation = useMutation({
    mutationFn: () => {
      const details =
        method === 'card'
          ? { cardNumber, cardName, expiry, cvv }
          : method === 'upi'
            ? { upiId }
            : method === 'netbanking'
              ? { bank }
              : {};
      return userApi.depositWallet({
        amount: Number(amount),
        method,
        details,
      });
    },
    onSuccess: async (result) => {
      setErr('');
      setMsg(result.message || 'Deposit successful');
      setAmount('');
      setCardNumber('');
      setCardName('');
      setExpiry('');
      setCvv('');
      setUpiId('');
      await queryClient.invalidateQueries({ queryKey: qk.userWallet });
      await queryClient.invalidateQueries({ queryKey: qk.userNotifications });
    },
    onError: (e) => {
      setMsg('');
      setErr(e.message || 'Deposit failed');
    },
  });

  if (isLoading) return <p className="text-ink-500">{'Loading wallet…'}</p>;
  if (error) return <p className="text-rose-600">{error.message}</p>;

  const txns = data?.transactions || data?.txns || [];
  const canSubmit =
    Number(amount) >= 1 &&
    !depositMutation.isPending &&
    (method === 'wallet' ||
      (method === 'card' && cardNumber && cardName && expiry && cvv) ||
      (method === 'upi' && upiId) ||
      (method === 'netbanking' && bank));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Wallet'}</h1>
        <p className="text-sm text-ink-500">
          {'Deposit money by card, UPI, or net banking — balance updates instantly'}
        </p>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-ink-900 to-brand-800 p-6 text-white">
        <p className="text-sm text-white/60">{'Available balance'}</p>
        <p className="mt-1 font-display text-4xl font-bold">{formatINR(data?.balance)}</p>
      </div>

      <section className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
        <h2 className="font-display text-lg font-semibold">{'Add money'}</h2>
        <p className="mt-1 text-xs text-ink-500">
          Test card: <span className="font-medium text-ink-700 dark:text-ink-200">4111 1111 1111 1111</span>{' '}
          · any future MM/YY · any CVV
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className={`rounded-full px-3 py-1.5 text-sm ${
                Number(amount) === q
                  ? 'bg-brand-600 text-white'
                  : 'border border-ink-200 text-ink-700 dark:border-ink-700 dark:text-ink-200'
              }`}
            >
              {formatINR(q)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-medium">
          Amount (₹)
          <input
            type="number"
            min="1"
            max="100000"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-950"
          />
        </label>

        <p className="mt-4 text-sm font-medium">{'Payment method'}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMethod(m.id);
                setErr('');
                setMsg('');
              }}
              className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                method === m.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-ink-200 dark:border-ink-700'
              }`}
            >
              <span className="font-semibold">{m.label || METHOD_META[m.id]?.label}</span>
              <span className="mt-0.5 block text-xs text-ink-500">
                {METHOD_META[m.id]?.hint || ''}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-ink-200 p-4 dark:border-ink-700">
          {method === 'card' && (
            <>
              <label className="block text-sm font-medium">
                Card number
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
                />
              </label>
              <label className="block text-sm font-medium">
                Name on card
                <input
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name as on card"
                  className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Expiry (MM/YY)
                  <input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="12/28"
                    className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
                  />
                </label>
                <label className="block text-sm font-medium">
                  CVV
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
                  />
                </label>
              </div>
            </>
          )}

          {method === 'upi' && (
            <label className="block text-sm font-medium">
              UPI ID
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
              />
            </label>
          )}

          {method === 'netbanking' && (
            <label className="block text-sm font-medium">
              Bank
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}

          {method === 'wallet' && (
            <p className="text-sm text-ink-500">
              Instant demo credit — no extra payment details required.
            </p>
          )}
        </div>

        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
        {msg && <p className="mt-3 text-sm text-brand-700">{msg}</p>}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => depositMutation.mutate()}
          className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {depositMutation.isPending
            ? 'Processing payment…'
            : `Pay ${amount ? formatINR(Number(amount)) : ''} & deposit`}
        </button>
      </section>

      <div>
        <h2 className="font-display text-lg font-semibold">{'Transaction history'}</h2>
        {txns.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{'No transactions yet'}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {txns.map((txn) => (
              <li
                key={txn.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm dark:border-ink-700 dark:bg-ink-900"
              >
                <div>
                  <p className="font-medium capitalize">{String(txn.type).replace(/_/g, ' ')}</p>
                  <p className="text-xs text-ink-400">
                    {txn.note || '—'} · {formatDate(txn.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      txn.type === 'deposit' || txn.type === 'admin_credit' || txn.type === 'refund'
                        ? 'text-emerald-600'
                        : 'text-ink-800 dark:text-ink-100'
                    }`}
                  >
                    {txn.type === 'deposit' || txn.type === 'admin_credit' || txn.type === 'refund'
                      ? '+'
                      : ''}
                    {formatINR(txn.amount)}
                  </p>
                  <p className="text-xs text-ink-400">
                    {'Bal'} {formatINR(txn.balanceAfter)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { formatDate, formatINR } from '../services/api';

export default function RentalSummary({
  productName,
  startDate,
  returnDate,
  days,
  hours,
  billingUnit = 'daily',
  rentalCost,
  securityDeposit,
  totalAmount,
  subtotal,
  discountAmount = 0,
  discountLabel = '',
}) {
  const isHourly = billingUnit === 'hourly' || (hours != null && days == null);
  const durationValue = isHourly
    ? `${hours} hour${hours === 1 ? '' : 's'}`
    : `${days} day${days === 1 ? '' : 's'}`;

  const formatSlot = (value) => {
    if (!value) return '—';
    if (isHourly && String(value).includes('T')) {
      return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    return formatDate(value);
  };

  const hasDiscount = Number(discountAmount) > 0;
  const listPrice = hasDiscount && subtotal != null ? subtotal : rentalCost;

  const rows = [
    { label: 'Product', value: productName },
    { label: isHourly ? 'Start time' : 'Start Date', value: formatSlot(startDate) },
    { label: isHourly ? 'Return time' : 'Return Date', value: formatSlot(returnDate) },
    { label: 'Billing', value: isHourly ? 'Hourly' : 'Daily' },
    { label: 'Duration', value: durationValue },
    { label: hasDiscount ? 'Rental (list)' : 'Rental Cost', value: formatINR(listPrice) },
  ];

  if (hasDiscount) {
    rows.push({
      label: discountLabel ? `Discount (${discountLabel})` : 'Discount',
      value: `−${formatINR(discountAmount)}`,
    });
    rows.push({ label: 'Rental Cost', value: formatINR(rentalCost) });
  }

  rows.push({ label: 'Security Deposit', value: formatINR(securityDeposit) });

  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
      <h3 className="font-display text-lg font-semibold">Rental Summary</h3>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-ink-500">{row.label}</span>
            <span
              className={`font-medium ${
                row.label.startsWith('Discount')
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-ink-900 dark:text-ink-100'
              }`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
        <span className="font-semibold">Total Amount</span>
        <span className="font-display text-xl font-bold text-brand-700 dark:text-brand-300">
          {formatINR(totalAmount)}
        </span>
      </div>
    </div>
  );
}

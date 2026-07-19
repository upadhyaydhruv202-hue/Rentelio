import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import RentalSummary from '../../components/RentalSummary';
import ProductMedia from '../../components/ProductMedia';
import { formatINR, productDeposit, productHourlyRate, userApi } from '../../services/api';
import { invalidateLifecycle, qk } from '../../lib/query';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [fulfillment, setFulfillment] = useState('pickup');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const productId = state?.productId;
  const startDate = state?.startDate;
  const returnDate = state?.returnDate;
  const billingUnit = state?.billingUnit === 'hourly' ? 'hourly' : 'daily';

  const { data: product } = useQuery({
    queryKey: qk.userProduct(productId),
    queryFn: () => userApi.getProduct(productId),
    enabled: Boolean(productId),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      userApi.createRental({
        productId,
        startDate,
        returnDate,
        billingUnit,
        fulfillment,
        shippingAddress: fulfillment === 'delivery' ? shippingAddress : '',
        couponCode: coupon?.code || '',
      }),
    onSuccess: async (result) => {
      setDone(result);
      await invalidateLifecycle(queryClient);
    },
    onError: (err) => setError(err.message),
  });

  const durationUnits = useMemo(() => {
    if (!startDate || !returnDate) return 0;
    const start = new Date(startDate);
    const end = new Date(returnDate);
    if (billingUnit === 'hourly') {
      if (end <= start) return 0;
      return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    }
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }, [startDate, returnDate, billingUnit]);

  const unitPrice =
    billingUnit === 'hourly' ? productHourlyRate(product) : Number(product?.pricePerDay || 0);
  const rentalCost = product ? durationUnits * unitPrice : 0;
  const deposit = productDeposit(product);
  const discountedRental = Math.max(0, rentalCost - discountAmount);

  useEffect(() => {
    setError('');
  }, [productId]);

  // Re-validate coupon when rental cost changes (dates / product)
  useEffect(() => {
    if (!coupon?.code || !rentalCost) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await userApi.validateCoupon(coupon.code, rentalCost, productId);
        if (cancelled) return;
        if (res.valid) {
          setCoupon(res.coupon);
          setDiscountAmount(Number(res.discountAmount) || 0);
          setCouponMsg(`Applied: ${res.coupon.label || res.coupon.code}`);
        }
      } catch (err) {
        if (cancelled) return;
        setCoupon(null);
        setDiscountAmount(0);
        setCouponMsg(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rentalCost, productId, coupon?.code]);

  if (!productId || !startDate || !returnDate) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="text-ink-500">{'No rental selection found.'}</p>
        <Link to="/user/browse" className="mt-4 inline-block text-brand-700 hover:underline">
          {'Browse products'}
        </Link>
      </div>
    );
  }

  const clearCoupon = () => {
    setCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponMsg('');
  };

  const applyCoupon = async () => {
    setCouponMsg('');
    setApplyingCoupon(true);
    try {
      const res = await userApi.validateCoupon(couponCode, rentalCost, productId);
      if (res.valid) {
        setCoupon(res.coupon);
        setDiscountAmount(Number(res.discountAmount) || 0);
        setCouponMsg(
          `Applied: ${res.coupon.label || res.coupon.code} (−${formatINR(res.discountAmount)})`
        );
      }
    } catch (err) {
      setCoupon(null);
      setDiscountAmount(0);
      setCouponMsg(err.message);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const steps = ['Select Product', 'Choose Duration', 'Review Summary', 'Confirm Booking'];

  if (done) {
    const summaryUnit = done.summary.billingUnit || billingUnit;
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-brand-200 bg-white p-8 text-center dark:border-brand-800 dark:bg-ink-900">
        <p className="text-sm font-medium text-brand-700">{'Booking confirmed'}</p>
        <h1 className="font-display text-2xl font-bold">{"You're all set!"}</h1>
        <p className="text-sm text-ink-500">
          {`Rental #${done.rental.id} for ${done.summary.productName} is confirmed. ${
            done.summary.discountAmount > 0
              ? `Coupon ${done.summary.couponCode} saved you ${formatINR(done.summary.discountAmount)}.`
              : 'The product is reserved pending vendor approval.'
          }`}
        </p>
        <RentalSummary
          productName={done.summary.productName}
          startDate={done.summary.startDate}
          returnDate={done.summary.returnDate}
          days={done.summary.days}
          hours={done.summary.hours}
          billingUnit={summaryUnit}
          subtotal={done.summary.subtotal}
          discountAmount={done.summary.discountAmount}
          discountLabel={done.summary.discountLabel || done.summary.couponCode}
          rentalCost={done.summary.rentalCost}
          securityDeposit={done.summary.securityDeposit}
          totalAmount={done.summary.totalAmount}
        />
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/user/rentals/${done.rental.id}`)}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm text-white"
          >
            {'View rental'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm dark:border-ink-700"
          >
            {'Back home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{'Checkout'}</p>
        <h1 className="font-display text-2xl font-semibold">{'Review & confirm'}</h1>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs text-ink-500">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`rounded-full px-3 py-1 ${
              i === 2 || i === 3 ? 'bg-brand-600 text-white' : 'bg-ink-200 dark:bg-ink-800'
            }`}
          >
            {step}
          </li>
        ))}
      </ol>

      {!product ? (
        <p className="text-ink-500">{'Loading…'}</p>
      ) : (
        <>
          <div className="flex gap-4 rounded-2xl border border-ink-200/80 bg-white p-4 dark:border-ink-700 dark:bg-ink-900">
            <ProductMedia
              src={product.image || product.imageUrl}
              alt={product.name}
              frameClassName="h-24 w-24 shrink-0 rounded-xl border border-ink-100 p-1.5 dark:border-ink-800"
            />
            <div>
              <h2 className="font-display text-lg font-semibold">{product.name}</h2>
              <p className="text-sm text-ink-500">{product.category}</p>
              <p className="mt-1 text-xs font-medium text-brand-700">
                {billingUnit === 'hourly' ? 'Hourly rental' : 'Daily rental'}
              </p>
            </div>
          </div>

          <RentalSummary
            productName={product.name}
            startDate={startDate}
            returnDate={returnDate}
            days={billingUnit === 'daily' ? durationUnits : undefined}
            hours={billingUnit === 'hourly' ? durationUnits : undefined}
            billingUnit={billingUnit}
            subtotal={rentalCost}
            discountAmount={discountAmount}
            discountLabel={coupon?.label || coupon?.code || ''}
            rentalCost={discountedRental}
            securityDeposit={deposit}
            totalAmount={discountedRental + deposit}
          />

          <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
            <h3 className="font-display text-base font-semibold">{'Coupon'}</h3>
            <p className="mt-1 text-xs text-ink-500">
              Try <span className="font-semibold text-ink-700 dark:text-ink-200">DEV15</span> (15%
              off) or <span className="font-semibold text-ink-700 dark:text-ink-200">SAVE100</span>{' '}
              (₹100 off)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEV15"
                className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={applyingCoupon || !couponCode.trim() || !rentalCost}
                className="rounded-xl bg-ink-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-brand-600"
              >
                {applyingCoupon ? 'Checking…' : 'Apply'}
              </button>
              {coupon && (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="rounded-xl border border-ink-200 px-4 py-2 text-sm dark:border-ink-700"
                >
                  Remove
                </button>
              )}
            </div>
            {couponMsg && (
              <p
                className={`mt-2 text-xs ${
                  coupon ? 'text-brand-700' : 'text-rose-600'
                }`}
              >
                {couponMsg}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-ink-200/80 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
            <h3 className="font-display text-base font-semibold">{'Fulfillment'}</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { id: 'pickup', label: 'Collect from store' },
                { id: 'delivery', label: 'Home delivery' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFulfillment(opt.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    fulfillment === opt.id
                      ? 'bg-brand-600 text-white'
                      : 'border border-ink-200 dark:border-ink-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {fulfillment === 'delivery' && (
              <label className="mt-4 block text-sm font-medium">
                {'Shipping address'}
                <textarea
                  required
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
                  placeholder={'Enter delivery address'}
                />
              </label>
            )}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            disabled={
              bookMutation.isPending ||
              (fulfillment === 'delivery' && !shippingAddress.trim())
            }
            onClick={() => bookMutation.mutate()}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {bookMutation.isPending
              ? 'Confirming…'
              : `Confirm Booking · ${formatINR(discountedRental + deposit)}`}
          </button>
        </>
      )}
    </div>
  );
}

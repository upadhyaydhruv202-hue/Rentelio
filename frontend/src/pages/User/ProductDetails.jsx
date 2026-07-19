import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import RentalSummary from '../../components/RentalSummary';
import ProductMedia from '../../components/ProductMedia';
import AdBanner from '../../components/AdBanner';
import { formatINR, productDeposit, productHourlyRate, userApi } from '../../services/api';
import { invalidateLifecycle, qk } from '../../lib/query';

function HeartIcon({ filled }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function pushRecent(product) {
  try {
    const key = 'rentelio_recent_products';
    const prev = JSON.parse(localStorage.getItem(key) || '[]').filter((p) => p.id !== product.id);
    localStorage.setItem(key, JSON.stringify([product, ...prev].slice(0, 8)));
  } catch {
    /* ignore */
  }
}

function toDateTimeLocalValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState(null);
  const [billingUnit, setBillingUnit] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [error, setError] = useState('');
  const [cartMsg, setCartMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        pushRecent(p);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const { data: wishlist = [] } = useQuery({
    queryKey: qk.userWishlist,
    queryFn: userApi.getWishlist,
  });

  const wishlisted = wishlist.some((item) => Number(item.productId) === Number(id));

  const addCart = useMutation({
    mutationFn: () => userApi.addToCart(Number(id)),
    onSuccess: () => {
      setCartMsg('Added to cart');
      invalidateLifecycle(queryClient);
    },
    onError: (err) => setError(err.message),
  });

  const addWish = useMutation({
    mutationFn: () => userApi.addToWishlist(Number(id)),
    onSuccess: () => invalidateLifecycle(queryClient),
    onError: (err) => setError(err.message),
  });

  const removeWish = useMutation({
    mutationFn: () => userApi.removeFromWishlist(Number(id)),
    onSuccess: () => invalidateLifecycle(queryClient),
    onError: (err) => setError(err.message),
  });

  const durationUnits = useMemo(() => {
    if (!startDate || !returnDate) return 0;
    const start = new Date(startDate);
    const end = new Date(returnDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    if (billingUnit === 'hourly') {
      if (end <= start) return 0;
      return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    }
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }, [startDate, returnDate, billingUnit]);

  const hourlyRate = productHourlyRate(product);
  const unitPrice = billingUnit === 'hourly' ? hourlyRate : Number(product?.pricePerDay || 0);
  const rentalCost = product ? durationUnits * unitPrice : 0;
  const deposit = productDeposit(product);
  const available = product && product.status === 'Available' && Number(product.quantity) > 0;

  const switchBillingUnit = (unit) => {
    setBillingUnit(unit);
    setStartDate('');
    setReturnDate('');
    setError('');
  };

  const goCheckout = () => {
    if (!startDate || !returnDate) {
      setError(billingUnit === 'hourly' ? 'Please select start and return times' : 'Please select rental dates');
      return;
    }
    if (new Date(returnDate) < new Date(startDate)) {
      setError(
        billingUnit === 'hourly'
          ? 'Return time must be after start time'
          : 'Return date must be on or after start date'
      );
      return;
    }
    if (billingUnit === 'hourly' && new Date(returnDate) <= new Date(startDate)) {
      setError('Return time must be after start time');
      return;
    }
    navigate('/user/checkout', {
      state: { productId: product.id, startDate, returnDate, billingUnit },
    });
  };

  const toggleWishlist = () => {
    if (wishlisted) removeWish.mutate();
    else addWish.mutate();
  };

  if (loading) return <p className="text-ink-500">{'Loading product…'}</p>;
  if (!product) return <p className="text-rose-600">{error || 'Product not found'}</p>;

  return (
    <div className="space-y-6">
      <DetailsAds />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-ink-200/80 bg-white dark:border-ink-700 dark:bg-ink-900">
          <ProductMedia
            src={product.image || product.imageUrl}
            alt={product.name}
            frameClassName="aspect-[4/3] w-full p-6"
          />
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-brand-700">{product.category}</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold">{product.name}</h1>
              <button
                type="button"
                onClick={toggleWishlist}
                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`rounded-lg p-1.5 transition ${
                  wishlisted
                    ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-ink-400 hover:bg-ink-100 hover:text-rose-500 dark:hover:bg-ink-800'
                }`}
              >
                <HeartIcon filled={wishlisted} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              {product.description || 'Premium rental equipment ready for your next project.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 dark:bg-ink-900">
              <p className="text-xs text-ink-400">{'Per day'}</p>
              <p className="font-display text-xl font-semibold text-brand-700">
                {formatINR(product.pricePerDay)}
                <span className="text-sm font-normal text-ink-400">/day</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 dark:bg-ink-900">
              <p className="text-xs text-ink-400">{'Per hour'}</p>
              <p className="font-display text-xl font-semibold text-brand-700">
                {formatINR(hourlyRate)}
                <span className="text-sm font-normal text-ink-400">/hr</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 dark:bg-ink-900 sm:col-span-1 col-span-2">
              <p className="text-xs text-ink-400">{'Security deposit'}</p>
              <p className="font-display text-xl font-semibold">{formatINR(deposit)}</p>
            </div>
          </div>

          <p className="text-sm">
            {'Availability'}:{' '}
            <span className={available ? 'font-semibold text-brand-700' : 'font-semibold text-rose-600'}>
              {available ? 'Available' : product.status}
            </span>
          </p>

          <div className="rounded-2xl border border-ink-200/80 bg-white p-4 dark:border-ink-700 dark:bg-ink-900">
            <h3 className="font-display font-semibold">{'Rental terms'}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-500">
              <li>{'Choose daily (24hr) or hourly billing for this booking.'}</li>
              <li>{'Late returns incur charges of 1× daily rate per late day.'}</li>
              <li>{'Security deposit is refunded after successful return inspection.'}</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{'Billing period'}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'daily', label: 'Daily (24hr)' },
                { id: 'hourly', label: 'Hourly (1hr)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => switchBillingUnit(opt.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    billingUnit === opt.id
                      ? 'bg-brand-600 text-white'
                      : 'border border-ink-200 dark:border-ink-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {billingUnit === 'hourly' ? 'Start time' : 'Start date'}
              <input
                type={billingUnit === 'hourly' ? 'datetime-local' : 'date'}
                value={startDate}
                min={billingUnit === 'hourly' ? toDateTimeLocalValue() : undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
              />
            </label>
            <label className="text-sm font-medium">
              {billingUnit === 'hourly' ? 'Return time' : 'Return date'}
              <input
                type={billingUnit === 'hourly' ? 'datetime-local' : 'date'}
                value={returnDate}
                min={startDate || (billingUnit === 'hourly' ? toDateTimeLocalValue() : undefined)}
                onChange={(e) => setReturnDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-700 dark:bg-ink-950"
              />
            </label>
          </div>

          {durationUnits > 0 && (
            <RentalSummary
              productName={product.name}
              startDate={startDate}
              returnDate={returnDate}
              days={billingUnit === 'daily' ? durationUnits : undefined}
              hours={billingUnit === 'hourly' ? durationUnits : undefined}
              billingUnit={billingUnit}
              rentalCost={rentalCost}
              securityDeposit={deposit}
              totalAmount={rentalCost + deposit}
            />
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {cartMsg && <p className="text-sm text-brand-700">{cartMsg}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!available}
              onClick={goCheckout}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {'Rent Now'}
            </button>
            <button
              type="button"
              disabled={!available || addCart.isPending}
              onClick={() => {
                setCartMsg('');
                addCart.mutate();
              }}
              className="rounded-xl border border-brand-600 px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-950/30"
            >
              {addCart.isPending ? 'Adding…' : 'Add to Cart'}
            </button>
            <Link
              to="/user/browse"
              className="rounded-xl border border-ink-200 px-6 py-2.5 text-sm dark:border-ink-700"
            >
              {'Back to browse'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsAds() {
  const { data: ads = [] } = useQuery({
    queryKey: qk.ads('details'),
    queryFn: () => userApi.getAds('details'),
  });
  return <AdBanner ads={ads} />;
}

import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ProductMedia from './ProductMedia';
import { formatINR, productDeposit, productHourlyRate, userApi } from '../services/api';
import { invalidateLifecycle, qk } from '../lib/query';

function HeartIcon({ filled }) {
  return (
    <svg
      width="18"
      height="18"
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

export default function ProductCard({ product, showActions = true }) {
  const queryClient = useQueryClient();

  const { data: wishlist = [] } = useQuery({
    queryKey: qk.userWishlist,
    queryFn: userApi.getWishlist,
    enabled: showActions,
  });

  const wishlisted = wishlist.some((item) => Number(item.productId) === Number(product.id));

  const addCart = useMutation({
    mutationFn: () => userApi.addToCart(product.id),
    onSuccess: () => invalidateLifecycle(queryClient),
  });

  const addWish = useMutation({
    mutationFn: () => userApi.addToWishlist(product.id),
    onSuccess: () => invalidateLifecycle(queryClient),
  });

  const removeWish = useMutation({
    mutationFn: () => userApi.removeFromWishlist(product.id),
    onSuccess: () => invalidateLifecycle(queryClient),
  });

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) removeWish.mutate();
    else addWish.mutate();
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addCart.mutate();
  };

  return (
    <Link
      to={`/user/products/${product.id}`}
      className="holo-card group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white/40 dark:bg-ink-950/40">
        <ProductMedia
          src={product.image || product.imageUrl}
          alt={product.name}
          frameClassName="h-full w-full p-3"
          imgClassName="transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-brand-700 backdrop-blur dark:bg-ink-950/80 dark:text-brand-300">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-display text-base font-semibold text-ink-900 line-clamp-1 dark:text-white">
            {product.name}
          </h3>
          {showActions && (
            <button
              type="button"
              onClick={toggleWishlist}
              title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`shrink-0 rounded-md p-1 transition ${
                wishlisted
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-ink-400 hover:bg-ink-100 hover:text-rose-500 dark:hover:bg-ink-800'
              }`}
            >
              <HeartIcon filled={wishlisted} />
            </button>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-ink-500">
          {product.description || 'Premium rental gear'}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xs text-ink-400">{'From'}</p>
            <p className="stat-glow font-display text-lg font-semibold text-brand-700 dark:text-brand-300">
              {formatINR(product.pricePerDay)}
              <span className="text-xs font-normal text-ink-400">/day</span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {formatINR(productHourlyRate(product))}/hr
            </p>
            <p className="mt-1 text-[11px] text-ink-400">
              {'Deposit'} {formatINR(productDeposit(product))}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="btn-living rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white">
              {'Rent Now'}
            </span>
            {showActions && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addCart.isPending}
                className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
              >
                {addCart.isPending ? 'Adding…' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

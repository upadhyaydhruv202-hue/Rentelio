const prisma = require('../config/prisma');
const { toNumber } = require('../utils/serializers');
const { computeDiscountAmount, moneyRound } = require('../utils/pricing');

function serializeCoupon(c) {
  if (!c) return null;
  return {
    ...c,
    value: toNumber(c.value),
    minAmount: toNumber(c.minAmount),
  };
}

/**
 * Resolve a coupon for checkout/booking.
 * Platform coupons (vendorId null) apply to any product.
 * Vendor coupons only apply to that vendor's catalog.
 */
async function resolveCoupon({ code, amount, vendorId = null }) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) {
    const err = new Error('Coupon code is required');
    err.status = 400;
    throw err;
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) {
    const err = new Error('Invalid or inactive coupon');
    err.status = 404;
    throw err;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    const err = new Error('Coupon has expired');
    err.status = 400;
    throw err;
  }

  if (coupon.maxUsage > 0 && coupon.usedCount >= coupon.maxUsage) {
    const err = new Error('Coupon usage limit reached');
    err.status = 400;
    throw err;
  }

  if (coupon.vendorId != null && vendorId != null && Number(coupon.vendorId) !== Number(vendorId)) {
    const err = new Error('This coupon is not valid for this product');
    err.status = 400;
    throw err;
  }

  const subtotal = moneyRound(amount);
  const minAmount = toNumber(coupon.minAmount);
  if (minAmount > 0 && subtotal < minAmount) {
    const err = new Error(`Minimum rental amount for this coupon is ₹${minAmount}`);
    err.status = 400;
    throw err;
  }

  const discountAmount = computeDiscountAmount(subtotal, coupon.type, coupon.value);
  const finalAmount = moneyRound(Math.max(0, subtotal - discountAmount));

  return {
    coupon: serializeCoupon(coupon),
    subtotal,
    discountAmount,
    finalAmount,
  };
}

/** Best active storefront offer for a vendor (highest savings). */
async function resolveBestOffer({ amount, vendorId }) {
  if (!vendorId) return null;
  const now = new Date();
  const offers = await prisma.discountOffer.findMany({
    where: {
      vendorId: Number(vendorId),
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  });

  if (!offers.length) return null;

  const subtotal = moneyRound(amount);
  let best = null;
  for (const offer of offers) {
    const discountAmount = computeDiscountAmount(subtotal, offer.type, offer.value);
    if (!best || discountAmount > best.discountAmount) {
      best = {
        offer: { ...offer, value: toNumber(offer.value) },
        subtotal,
        discountAmount,
        finalAmount: moneyRound(Math.max(0, subtotal - discountAmount)),
        label: offer.name || offer.discountType || 'Store offer',
      };
    }
  }

  if (!best || best.discountAmount <= 0) return null;
  return best;
}

async function redeemCoupon(couponId) {
  if (!couponId) return;
  await prisma.coupon.update({
    where: { id: Number(couponId) },
    data: { usedCount: { increment: 1 } },
  });
}

module.exports = {
  resolveCoupon,
  resolveBestOffer,
  redeemCoupon,
  serializeCoupon,
};

/** Security Deposit = Rental Price Per Day × 1.5 */
const DEPOSIT_MULTIPLIER = 1.5;

function moneyRound(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

function calcSecurityDeposit(pricePerDay) {
  const price = Number(pricePerDay);
  if (!Number.isFinite(price) || price < 0) return 0;
  return moneyRound(price * DEPOSIT_MULTIPLIER);
}

/** Default hourly rate ≈ daily / 8 (typical gear rental day) */
function calcPricePerHour(pricePerDay) {
  const price = Number(pricePerDay);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.max(1, moneyRound(price / 8));
}

function resolvePricePerHour(product) {
  const stored = Number(product?.pricePerHour);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return calcPricePerHour(product?.pricePerDay);
}

/**
 * percent → % of subtotal; flat → fixed ₹ off.
 * Never exceeds the subtotal.
 */
function computeDiscountAmount(subtotal, type, value) {
  const base = moneyRound(subtotal);
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0 || base <= 0) return 0;

  let discount = 0;
  if (String(type).toLowerCase() === 'percent') {
    discount = moneyRound((base * Math.min(v, 100)) / 100);
  } else {
    discount = moneyRound(v);
  }
  return Math.min(discount, base);
}

module.exports = {
  DEPOSIT_MULTIPLIER,
  moneyRound,
  calcSecurityDeposit,
  calcPricePerHour,
  resolvePricePerHour,
  computeDiscountAmount,
};

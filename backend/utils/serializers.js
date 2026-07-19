/** Convert Prisma Decimal / Date values into plain JSON-friendly shapes */
const { calcPricePerHour } = require('./pricing');

const toNumber = (value) => {
  if (value == null) return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
};

const formatDate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const serializeProduct = (product) => {
  if (!product) return null;
  const qty = product.quantity ?? 0;
  const availableQuantity =
    product.status === 'Available' && !product.archived ? qty : Math.max(0, qty);
  const pricePerDay = toNumber(product.pricePerDay);
  let pricePerHour = toNumber(product.pricePerHour);
  if (!pricePerHour || pricePerHour <= 0) {
    pricePerHour = calcPricePerHour(pricePerDay);
  }
  return {
    ...product,
    image: product.image,
    imageUrl: product.image,
    pricePerDay,
    pricePerHour,
    securityDeposit: toNumber(product.securityDeposit),
    availableQuantity,
  };
};

const serializeDeposit = (deposit) => {
  if (!deposit) return null;
  return {
    ...deposit,
    amount: toNumber(deposit.amount),
    refundedAmount: toNumber(deposit.refundedAmount),
    lateFeeDeducted: toNumber(deposit.lateFeeDeducted),
  };
};

const serializeRental = (rental) => {
  if (!rental) return null;

  const product = rental.product;
  const deposit = rental.deposit;
  const customer = rental.customer;

  return {
    id: rental.id,
    customerName: rental.customerName,
    customerId: rental.customerId,
    productId: rental.productId,
    startDate: formatDate(rental.startDate),
    returnDate: formatDate(rental.returnDate),
    billingUnit: rental.billingUnit || 'daily',
    durationUnits: rental.durationUnits ?? 1,
    amount: toNumber(rental.amount),
    lateFee: toNumber(rental.lateFee),
    damageCharge: toNumber(rental.damageCharge),
    discountAmount: toNumber(rental.discountAmount),
    couponCode: rental.couponCode || '',
    status: rental.status,
    fulfillment: rental.fulfillment,
    shippingAddress: rental.shippingAddress,
    pickupStatus: rental.pickupStatus,
    returnStatus: rental.returnStatus,
    trackerStage: rental.trackerStage,
    pickupOtp: rental.pickupOtp,
    returnOtp: rental.returnOtp,
    scheduledPickup: rental.scheduledPickup,
    scheduledReturn: rental.scheduledReturn,
    pickupAt: rental.pickupAt,
    returnedAt: rental.returnedAt,
    rating: rental.rating,
    review: rental.review,
    damageReport: rental.damageReport,
    createdAt: rental.createdAt,
    productName: product?.name ?? null,
    pricePerDay: product ? toNumber(product.pricePerDay) : null,
    pricePerHour: product ? toNumber(product.pricePerHour) : null,
    category: product?.category ?? null,
    brand: product?.brand ?? null,
    imageUrl: product?.image ?? null,
    image: product?.image ?? null,
    description: product?.description ?? null,
    depositAmount: deposit ? toNumber(deposit.amount) : null,
    depositStatus: deposit?.status ?? null,
    depositId: deposit?.id ?? null,
    refundedAmount: deposit ? toNumber(deposit.refundedAmount) : null,
    lateFeeDeducted: deposit ? toNumber(deposit.lateFeeDeducted) : null,
    customerEmail: customer?.email ?? null,
  };
};

const rentalInclude = {
  product: true,
  deposit: true,
  customer: { select: { id: true, email: true, name: true, phone: true } },
};

const daysBetween = (startDate, returnDate) => {
  const start = new Date(startDate);
  const end = new Date(returnDate);
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

/** Whole hours between two datetimes (minimum 1). */
const hoursBetween = (startDateTime, returnDateTime) => {
  const start = new Date(startDateTime);
  const end = new Date(returnDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
};

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

module.exports = {
  toNumber,
  formatDate,
  serializeProduct,
  serializeDeposit,
  serializeRental,
  rentalInclude,
  daysBetween,
  hoursBetween,
  startOfDay,
};

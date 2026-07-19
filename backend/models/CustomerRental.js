const Customer = require('./Customer');
const Product = require('./Product');
const Rental = require('./Rental');
const Deposit = require('./Deposit');
const { daysBetween, hoursBetween, formatDate } = require('../utils/serializers');
const { calcSecurityDeposit, resolvePricePerHour, moneyRound } = require('../utils/pricing');
const { resolveCoupon, redeemCoupon } = require('../services/couponService');
const { notifyCustomer, notifyVendor } = require('../services/realtime');

/**
 * Customer bookings write into the SHARED rentals + deposits tables
 * so admin and shop always see the same lifecycle state.
 */
const CustomerRental = {
  findByCustomer: (customerId) => Rental.findByCustomer(customerId),
  findById: (id, customerId) => Rental.findByIdForCustomer(id, customerId),
  getStats: (customerId) => Rental.getCustomerStats(customerId),
  syncStatuses: (customerId) => Rental.syncLifecycleStatuses(customerId),

  async bookRental({
    customerId,
    productId,
    startDate,
    returnDate,
    billingUnit = 'daily',
    fulfillment = 'pickup',
    shippingAddress = '',
    couponCode = '',
  }) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw Object.assign(new Error('Product not found'), { status: 404 });
    }
    if (product.status !== 'Available' || Number(product.quantity) < 1) {
      throw Object.assign(new Error('Product is not available for rent'), { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(returnDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      throw Object.assign(new Error('Invalid rental dates'), { status: 400 });
    }

    const unit = billingUnit === 'hourly' ? 'hourly' : 'daily';
    let durationUnits;
    let subtotal;
    let calendarStart;
    let calendarReturn;
    let scheduledPickup = null;
    let scheduledReturn = null;

    if (unit === 'hourly') {
      if (end <= start) {
        throw Object.assign(new Error('Return time must be after start time'), { status: 400 });
      }
      durationUnits = hoursBetween(start, end);
      if (!durationUnits) {
        throw Object.assign(new Error('Invalid hourly rental window'), { status: 400 });
      }
      const hourlyRate = resolvePricePerHour(product);
      subtotal = moneyRound(hourlyRate * durationUnits);
      calendarStart = formatDate(start);
      calendarReturn = formatDate(end);
      scheduledPickup = start;
      scheduledReturn = end;
    } else {
      durationUnits = daysBetween(startDate, returnDate);
      subtotal = moneyRound(Number(product.pricePerDay) * durationUnits);
      calendarStart = startDate;
      calendarReturn = returnDate;
    }

    let discountAmount = 0;
    let appliedCouponCode = '';
    let redeemedCouponId = null;
    let discountLabel = '';

    const code = String(couponCode || '').trim();
    if (code) {
      const priced = await resolveCoupon({
        code,
        amount: subtotal,
        vendorId: product.vendorId,
      });
      discountAmount = priced.discountAmount;
      appliedCouponCode = priced.coupon.code;
      redeemedCouponId = priced.coupon.id;
      discountLabel = priced.coupon.label || priced.coupon.code;
    }

    const amount = moneyRound(Math.max(0, subtotal - discountAmount));
    const depositAmount = calcSecurityDeposit(product.pricePerDay);

    const rental = await Rental.create({
      customerName: customer.name,
      customerId: customer.id,
      productId,
      startDate: calendarStart,
      returnDate: calendarReturn,
      billingUnit: unit,
      durationUnits,
      amount,
      discountAmount,
      couponCode: appliedCouponCode,
      status: 'Requested',
      fulfillment: fulfillment === 'delivery' ? 'delivery' : 'pickup',
      shippingAddress:
        fulfillment === 'delivery'
          ? shippingAddress || customer.address || ''
          : '',
      scheduledPickup,
      scheduledReturn,
    });

    if (redeemedCouponId) {
      await redeemCoupon(redeemedCouponId);
    }

    await Deposit.create({
      rentalId: rental.id,
      amount: depositAmount,
      status: 'Held',
    });

    const newQty = Math.max(0, Number(product.quantity) - 1);
    await Product.update(productId, {
      quantity: newQty,
      status: newQty <= 0 ? 'Rented' : 'Available',
    });

    await Rental.syncLifecycleStatuses();

    const full = await Rental.findById(rental.id);

    try {
      await notifyCustomer({
        customerId: customer.id,
        title: 'Rental requested',
        body: `Your booking for ${product.name} is submitted.`,
        type: 'rental',
        link: `/user/rentals/${rental.id}`,
      });
      if (product.vendorId) {
        await notifyVendor({
          vendorId: product.vendorId,
          title: 'New rental order',
          body: `${customer.name} requested ${product.name} (order #${rental.id}).`,
          type: 'order',
          link: `/vendor/pickup-return?focus=${rental.id}`,
        });
      }
    } catch (notifyErr) {
      console.error('Rental notify error:', notifyErr.message);
    }

    return {
      rental: full,
      product,
      billingUnit: unit,
      durationUnits,
      days: unit === 'daily' ? durationUnits : undefined,
      hours: unit === 'hourly' ? durationUnits : undefined,
      subtotal,
      discountAmount,
      discountLabel,
      couponCode: appliedCouponCode,
      amount,
      depositAmount,
    };
  },

  async cancelAndRestore(id, customerId) {
    const rental = await Rental.findByIdForCustomer(id, customerId);
    if (!rental) {
      throw Object.assign(new Error('Rental not found'), { status: 404 });
    }
    if (!['Requested', 'Approved'].includes(rental.status)) {
      throw Object.assign(new Error('Only pending requests can be cancelled'), { status: 400 });
    }

    await Rental.update(id, { status: 'Cancelled' });
    await Deposit.updateStatusByRentalId(id, 'Refunded', {
      refundedAmount: rental.depositAmount || 0,
      lateFeeDeducted: 0,
    });

    const product = await Product.findById(rental.productId);
    if (product) {
      await Product.update(product.id, {
        quantity: Number(product.quantity) + 1,
        status: 'Available',
      });
    }

    return Rental.findByIdForCustomer(id, customerId);
  },
};

module.exports = CustomerRental;

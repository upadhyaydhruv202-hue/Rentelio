const prisma = require('../config/prisma');
const { serializeRental, rentalInclude } = require('../utils/serializers');
const { syncLifecycleStatuses } = require('../services/rentalLifecycle');

const Rental = {
  syncLifecycleStatuses,

  async findAll() {
    const rentals = await prisma.rental.findMany({
      include: rentalInclude,
      orderBy: { id: 'desc' },
    });
    return rentals.map(serializeRental);
  },

  async findById(id) {
    const rental = await prisma.rental.findUnique({
      where: { id: Number(id) },
      include: rentalInclude,
    });
    return serializeRental(rental);
  },

  async findByCustomer(customerId) {
    const rentals = await prisma.rental.findMany({
      where: { customerId: Number(customerId) },
      include: rentalInclude,
      orderBy: { id: 'desc' },
    });
    return rentals.map(serializeRental);
  },

  async findByIdForCustomer(id, customerId) {
    const rental = await prisma.rental.findFirst({
      where: { id: Number(id), customerId: Number(customerId) },
      include: rentalInclude,
    });
    return serializeRental(rental);
  },

  async create(data) {
    const rental = await prisma.rental.create({
      data: {
        customerName: data.customerName,
        customerId: data.customerId ?? null,
        productId: Number(data.productId),
        startDate: new Date(data.startDate),
        returnDate: new Date(data.returnDate),
        billingUnit: data.billingUnit === 'hourly' ? 'hourly' : 'daily',
        durationUnits: Number(data.durationUnits) > 0 ? Number(data.durationUnits) : 1,
        amount: Number(data.amount),
        discountAmount: Number(data.discountAmount) || 0,
        couponCode: data.couponCode ? String(data.couponCode).slice(0, 40) : '',
        status: data.status || 'Active',
        fulfillment: data.fulfillment || 'pickup',
        shippingAddress: data.shippingAddress || '',
        lateFee: 0,
        ...(data.scheduledPickup ? { scheduledPickup: new Date(data.scheduledPickup) } : {}),
        ...(data.scheduledReturn ? { scheduledReturn: new Date(data.scheduledReturn) } : {}),
      },
    });
    return this.findById(rental.id);
  },

  async update(id, data) {
    await prisma.rental.update({
      where: { id: Number(id) },
      data: {
        ...(data.status != null && { status: data.status }),
        ...(data.lateFee != null && { lateFee: Number(data.lateFee) }),
        ...(data.amount != null && { amount: Number(data.amount) }),
      },
    });
    return this.findById(id);
  },

  async getPendingReturns() {
    const rentals = await prisma.rental.findMany({
      where: { status: { in: ['Active', 'Return Pending', 'Requested', 'Approved'] } },
      include: rentalInclude,
      orderBy: { returnDate: 'asc' },
    });
    return rentals.map(serializeRental);
  },

  async getCustomerStats(customerId) {
    const cid = Number(customerId);
    const [activeRentals, upcomingReturns, completedRentals, pendingRequests] =
      await Promise.all([
        prisma.rental.count({ where: { customerId: cid, status: 'Active' } }),
        prisma.rental.count({
          where: {
            customerId: cid,
            status: { in: ['Active', 'Return Pending'] },
          },
        }),
        prisma.rental.count({ where: { customerId: cid, status: 'Completed' } }),
        prisma.rental.count({ where: { customerId: cid, status: 'Requested' } }),
      ]);

    return { activeRentals, upcomingReturns, completedRentals, pendingRequests };
  },
};

module.exports = Rental;

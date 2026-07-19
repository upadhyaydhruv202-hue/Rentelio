const prisma = require('../config/prisma');
const Product = require('../models/Product');
const {
  toNumber,
  serializeProduct,
  serializeRental,
  serializeDeposit,
  rentalInclude,
} = require('../utils/serializers');
const { calcSecurityDeposit } = require('../utils/pricing');
const { logActivity } = require('../services/activity');
const { productScope, rentalScope, assertOwnProduct, assertOwnRental } = require('../services/vendorScope');
const { sanitizeVendor } = require('../middleware/vendorAuth');
const { calculateLateFee } = require('../services/rentalLifecycle');
const { notifyVendor, notifyCustomer } = require('../services/realtime');

const PROFIT_MARGIN = 0.35;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TRACKER_STAGES = [
  'Pickup Scheduled',
  'Pickup Assigned',
  'Out For Pickup',
  'Picked Up',
  'Rental Active',
  'Return Scheduled',
  'Returned',
  'Inspection',
  'Completed',
];

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const revenueForVendorRange = async (vendorId, from, to) => {
  const agg = await prisma.rental.aggregate({
    where: {
      ...rentalScope(vendorId),
      createdAt: { gte: from, lt: to },
    },
    _sum: { amount: true },
  });
  return toNumber(agg._sum.amount) || 0;
};

const buildSeries = async (vendorId, mode, count, stepDays) => {
  const series = [];
  const today = startOfDay();
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(today);
    start.setDate(start.getDate() - i * stepDays);
    const end = new Date(start);
    end.setDate(end.getDate() + stepDays);
    const value = await revenueForVendorRange(vendorId, start, end);
    let label = start.toISOString().slice(0, 10);
    if (mode === 'monthly') {
      label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    }
    if (mode === 'yearly') label = String(start.getFullYear());
    series.push({ label, value });
  }
  return series;
};

/* ---------- Dashboard ---------- */
const getDashboard = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const today = startOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    const yearStart = new Date(today);
    yearStart.setFullYear(yearStart.getFullYear() - 1);

    const rs = rentalScope(vendorId);
    const ps = productScope(vendorId);

    const [
      totalProducts,
      availableProducts,
      activeRentals,
      dueToday,
      upcomingPickups,
      upcomingReturns,
      overdueRentals,
      underMaintenance,
      revenueAgg,
      depositsHeld,
      depositsPending,
      lateFeeAgg,
      reservedAgg,
      rentedCount,
      activities,
      rentalsForHeat,
      categoryGroups,
      topProducts,
      profitDay,
      profitWeek,
      profitMonth,
      profitYear,
      seriesDaily,
      seriesWeekly,
      seriesMonthly,
      seriesYearly,
      maintenanceAlerts,
    ] = await Promise.all([
      prisma.product.count({ where: { ...ps, archived: false } }),
      prisma.product.count({
        where: { ...ps, archived: false, status: 'Available', maintenanceStatus: { not: 'UnderMaintenance' } },
      }),
      prisma.rental.count({ where: { ...rs, status: { in: ['Active', 'Requested', 'Approved'] } } }),
      prisma.rental.count({
        where: { ...rs, returnDate: { gte: today, lt: tomorrow }, status: { notIn: ['Completed', 'Cancelled'] } },
      }),
      prisma.rental.count({
        where: {
          ...rs,
          scheduledPickup: { gte: today, lt: weekEnd },
          pickupStatus: { in: ['Scheduled', 'Pending', 'Assigned'] },
        },
      }),
      prisma.rental.count({
        where: {
          ...rs,
          returnStatus: { in: ['Pending', 'Scheduled'] },
          status: { not: 'Completed' },
        },
      }),
      prisma.rental.count({ where: { ...rs, status: { in: ['Return Pending', 'Overdue'] } } }),
      prisma.product.count({
        where: {
          ...ps,
          maintenanceStatus: { in: ['InspectionDue', 'CleaningDue', 'RepairPending', 'UnderMaintenance'] },
        },
      }),
      prisma.rental.aggregate({ where: rs, _sum: { amount: true } }),
      prisma.deposit.aggregate({
        where: { status: 'Held', rental: rs },
        _sum: { amount: true },
      }),
      prisma.deposit.aggregate({
        where: { status: 'Pending Refund', rental: rs },
        _sum: { amount: true },
      }),
      prisma.rental.aggregate({ where: rs, _sum: { lateFee: true } }),
      prisma.product.aggregate({ where: ps, _sum: { reservedQty: true } }),
      prisma.product.count({ where: { ...ps, status: 'Rented' } }),
      prisma.activity.findMany({ where: { vendorId }, orderBy: { id: 'desc' }, take: 25 }),
      prisma.rental.findMany({
        where: rs,
        select: { createdAt: true, amount: true, product: { select: { name: true, category: true } } },
        take: 500,
        orderBy: { id: 'desc' },
      }),
      prisma.product.groupBy({
        by: ['category'],
        where: ps,
        _count: { _all: true },
      }),
      prisma.$queryRaw`
        SELECT p.name, COUNT(r.id)::int AS count, COALESCE(SUM(r.amount),0)::float AS revenue
        FROM rentals r
        JOIN products p ON p.id = r."productId"
        WHERE p."vendor_id" = ${vendorId}
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 8
      `,
      revenueForVendorRange(vendorId, today, tomorrow),
      revenueForVendorRange(vendorId, weekStart, tomorrow),
      revenueForVendorRange(vendorId, monthStart, tomorrow),
      revenueForVendorRange(vendorId, yearStart, tomorrow),
      buildSeries(vendorId, 'daily', 7, 1),
      buildSeries(vendorId, 'weekly', 8, 7),
      (async () => {
        const series = [];
        for (let i = 5; i >= 0; i -= 1) {
          const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
          series.push({
            label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
            value: await revenueForVendorRange(vendorId, start, end),
          });
        }
        return series;
      })(),
      (async () => {
        const series = [];
        for (let i = 3; i >= 0; i -= 1) {
          const year = today.getFullYear() - i;
          series.push({
            label: String(year),
            value: await revenueForVendorRange(vendorId, new Date(year, 0, 1), new Date(year + 1, 0, 1)),
          });
        }
        return series;
      })(),
      prisma.product.findMany({
        where: {
          ...ps,
          OR: [
            { maintenanceStatus: { not: 'None' } },
            { status: 'Unavailable' },
            { quantity: { lte: 0 } },
          ],
        },
        take: 20,
        orderBy: { id: 'desc' },
      }),
    ]);

    const totalRevenue = toNumber(revenueAgg._sum.amount) || 0;
    const dayCounts = DAY_NAMES.reduce((a, d) => ({ ...a, [d]: 0 }), {});
    const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    rentalsForHeat.forEach((r) => {
      const d = new Date(r.createdAt);
      dayCounts[DAY_NAMES[d.getDay()]] += 1;
      hourCounts[d.getHours()].count += 1;
    });

    res.json({
      stats: {
        totalProducts,
        availableProducts,
        activeRentals,
        dueToday,
        upcomingPickups,
        upcomingReturns,
        overdueRentals,
        underMaintenance,
        totalRevenue,
        totalProfit: Math.round(totalRevenue * PROFIT_MARGIN * 100) / 100,
        depositsHeld: toNumber(depositsHeld._sum.amount) || 0,
        depositsPendingRefund: toNumber(depositsPending._sum.amount) || 0,
        lateFeeCollected: toNumber(lateFeeAgg._sum.lateFee) || 0,
      },
      profit: {
        daily: Math.round(profitDay * PROFIT_MARGIN * 100) / 100,
        weekly: Math.round(profitWeek * PROFIT_MARGIN * 100) / 100,
        monthly: Math.round(profitMonth * PROFIT_MARGIN * 100) / 100,
        yearly: Math.round(profitYear * PROFIT_MARGIN * 100) / 100,
      },
      revenueSeries: {
        daily: seriesDaily,
        weekly: seriesWeekly,
        monthly: seriesMonthly,
        yearly: seriesYearly,
      },
      inventoryMix: {
        available: availableProducts,
        reserved: toNumber(reservedAgg._sum.reservedQty) || 0,
        rented: rentedCount,
        maintenance: underMaintenance,
      },
      heatmap: {
        products: (topProducts || []).map((p) => ({
          name: p.name,
          count: Number(p.count),
          revenue: Number(p.revenue) || 0,
        })),
        days: dayCounts,
        hours: hourCounts,
        categories: categoryGroups.map((c) => ({ category: c.category, count: c._count._all })),
      },
      activities,
      maintenanceAlerts: maintenanceAlerts.map(serializeProduct),
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.status(500).json({ message: 'Failed to load vendor dashboard' });
  }
};

/* ---------- Inventory ---------- */
const listProducts = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { brand, category, color, size, storage, edition, material, condition, status, search } =
      req.query;
    const where = { ...productScope(vendorId) };
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (color) where.color = { equals: color, mode: 'insensitive' };
    if (size) where.size = { equals: size, mode: 'insensitive' };
    if (storage) where.storage = { equals: storage, mode: 'insensitive' };
    if (edition) where.edition = { equals: edition, mode: 'insensitive' };
    if (material) where.material = { equals: material, mode: 'insensitive' };
    if (condition) where.condition = { equals: condition, mode: 'insensitive' };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { brand: { contains: String(search), mode: 'insensitive' } },
        { category: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.product.findMany({ where, orderBy: { id: 'desc' } });
    res.json(rows.map(serializeProduct));
  } catch (error) {
    console.error('Vendor list products error:', error);
    res.status(500).json({ message: 'Failed to list products' });
  }
};

const parseProductBody = (body, file, vendorId) => ({
  name: body.name,
  category: body.category,
  quantity: body.quantity != null ? Number(body.quantity) : 1,
  pricePerDay: Number(body.pricePerDay),
  pricePerHour: body.pricePerHour != null && body.pricePerHour !== '' ? Number(body.pricePerHour) : undefined,
  status: body.status || 'Available',
  description: body.description || '',
  brand: body.brand || '',
  color: body.color || '',
  size: body.size || '',
  storage: body.storage || '',
  edition: body.edition || '',
  condition: body.condition || 'Good',
  warranty: body.warranty || '',
  material: body.material || '',
  maintenanceStatus: body.maintenanceStatus || 'None',
  maintenanceNote: body.maintenanceNote || '',
  reservedQty: body.reservedQty != null ? Number(body.reservedQty) : 0,
  vendorId,
  image: file ? `/uploads/products/${file.filename}` : body.image || undefined,
});

const createProduct = async (req, res) => {
  try {
    const data = parseProductBody(req.body, req.file, req.vendor.id);
    if (!data.image) {
      return res.status(400).json({ message: 'Please upload a product image before creating the product.' });
    }
    const product = await Product.create(data);
    await logActivity('product', `Product added: ${product.name}`, { id: product.id }, req.vendor.id);
    await notifyVendor({
      vendorId: req.vendor.id,
      title: 'Product Added',
      body: `${product.name} was added to your inventory.`,
      type: 'inventory',
      link: '/vendor/inventory',
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Vendor create product error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const owned = await assertOwnProduct(req.vendor.id, req.params.id);
    if (!owned) return res.status(404).json({ message: 'Product not found' });
    const data = parseProductBody(req.body, req.file, req.vendor.id);
    delete data.vendorId;
    if (!req.file) delete data.image;
    const product = await Product.update(req.params.id, data);
    await logActivity('product', `Product updated: ${product.name}`, { id: product.id }, req.vendor.id);
    res.json(product);
  } catch (error) {
    console.error('Vendor update product error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const owned = await assertOwnProduct(req.vendor.id, req.params.id);
    if (!owned) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.delete(req.params.id);
    await logActivity('product', `Product deleted: ${owned.name}`, { id: owned.id }, req.vendor.id);
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    console.error('Vendor delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

const archiveProduct = async (req, res) => {
  try {
    const owned = await assertOwnProduct(req.vendor.id, req.params.id);
    if (!owned) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.update(req.params.id, { archived: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to archive product' });
  }
};

const restoreProduct = async (req, res) => {
  try {
    const owned = await assertOwnProduct(req.vendor.id, req.params.id);
    if (!owned) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.update(req.params.id, { archived: false });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore product' });
  }
};

const getProduct = async (req, res) => {
  try {
    const owned = await assertOwnProduct(req.vendor.id, req.params.id);
    if (!owned) return res.status(404).json({ message: 'Product not found' });
    res.json(serializeProduct(owned));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load product' });
  }
};

/* ---------- Rentals / Orders ---------- */
const listRentals = async (req, res) => {
  try {
    const rentals = await prisma.rental.findMany({
      where: rentalScope(req.vendor.id),
      include: rentalInclude,
      orderBy: { id: 'desc' },
    });
    res.json(rentals.map(serializeRental));
  } catch (error) {
    console.error('Vendor list rentals error:', error);
    res.status(500).json({ message: 'Failed to list rentals' });
  }
};

const getRental = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    res.json(serializeRental(rental));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load rental' });
  }
};

const updateRentalStatus = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    const { status } = req.body || {};
    const updated = await prisma.rental.update({
      where: { id: rental.id },
      data: { status },
      include: rentalInclude,
    });
    await logActivity('rental', `Rental #${rental.id} → ${status}`, { rentalId: rental.id }, req.vendor.id);
    res.json(serializeRental(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update rental' });
  }
};

/* ---------- Pickup / Return ---------- */
const buildScheduleWhere = (vendorId, filter, from, to) => {
  const where = { ...rentalScope(vendorId) };
  const now = new Date();
  const today = startOfDay(now);

  if (filter === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    where.OR = [
      { scheduledPickup: { gte: today, lt: tomorrow } },
      { scheduledReturn: { gte: today, lt: tomorrow } },
    ];
  } else if (filter === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    where.OR = [
      { scheduledPickup: { gte: tomorrow, lt: dayAfter } },
      { scheduledReturn: { gte: tomorrow, lt: dayAfter } },
    ];
  } else if (filter === 'week') {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    where.OR = [
      { scheduledPickup: { gte: today, lt: weekEnd } },
      { scheduledReturn: { gte: today, lt: weekEnd } },
    ];
  } else if (filter === 'month') {
    const monthEnd = new Date(today);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    where.OR = [
      { scheduledPickup: { gte: today, lt: monthEnd } },
      { scheduledReturn: { gte: today, lt: monthEnd } },
    ];
  } else if (filter === 'custom' && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    where.OR = [
      { scheduledPickup: { gte: start, lt: end } },
      { scheduledReturn: { gte: start, lt: end } },
    ];
  }
  return where;
};

const listSchedule = async (req, res) => {
  try {
    const filter = req.query.filter || 'week';
    const where = buildScheduleWhere(req.vendor.id, filter, req.query.from, req.query.to);
    const rentals = await prisma.rental.findMany({
      where,
      include: rentalInclude,
      orderBy: [{ scheduledPickup: 'asc' }, { scheduledReturn: 'asc' }],
    });
    res.json(rentals.map(serializeRental));
  } catch (error) {
    console.error('Vendor schedule error:', error);
    res.status(500).json({ message: 'Failed to load schedule' });
  }
};

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const generateOtps = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    const updated = await prisma.rental.update({
      where: { id: rental.id },
      data: { pickupOtp: randomOtp(), returnOtp: randomOtp() },
      include: rentalInclude,
    });
    await logActivity('pickup', `OTPs generated for rental #${rental.id}`, { rentalId: rental.id }, req.vendor.id);
    res.json(serializeRental(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate OTPs' });
  }
};

const verifyPickupOtp = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (String(req.body?.otp || '') !== String(rental.pickupOtp)) {
      return res.status(400).json({ message: 'Invalid pickup OTP' });
    }
    const updated = await prisma.rental.update({
      where: { id: rental.id },
      data: {
        trackerStage: 'Picked Up',
        pickupStatus: 'Completed',
        pickupAt: new Date(),
        status: rental.status === 'Requested' || rental.status === 'Approved' ? 'Active' : rental.status,
      },
      include: rentalInclude,
    });
    await logActivity('pickup', `Product picked up — rental #${rental.id}`, { rentalId: rental.id }, req.vendor.id);
    await notifyVendor({
      vendorId: req.vendor.id,
      title: 'Pickup Confirmed',
      body: `Rental #${rental.id} pickup verified via OTP.`,
      type: 'pickup',
      link: `/vendor/pickup-return?focus=${rental.id}`,
    });
    if (rental.customerId) {
      await notifyCustomer({
        customerId: rental.customerId,
        title: 'Pickup confirmed',
        body: `Your rental #${rental.id} was picked up successfully.`,
        type: 'pickup',
        link: `/user/rentals/${rental.id}`,
      });
    }
    res.json(serializeRental(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify pickup OTP' });
  }
};

const verifyReturnOtp = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (String(req.body?.otp || '') !== String(rental.returnOtp)) {
      return res.status(400).json({ message: 'Invalid return OTP' });
    }
    const damageCharge = Number(req.body?.damageCharge || 0);
    const cleaningCharge = Number(req.body?.cleaningCharge || 0);
    const missingCharge = Number(req.body?.missingCharge || 0);
    const repairCharge = Number(req.body?.repairCharge || 0);
    const inspectionNote = req.body?.inspectionNote || '';

    const updated = await prisma.rental.update({
      where: { id: rental.id },
      data: {
        trackerStage: 'Returned',
        returnStatus: 'Completed',
        returnedAt: new Date(),
        damageCharge: damageCharge + cleaningCharge + missingCharge + repairCharge,
        damageReport: [
          inspectionNote,
          damageCharge ? `Damage: ₹${damageCharge}` : '',
          cleaningCharge ? `Cleaning: ₹${cleaningCharge}` : '',
          missingCharge ? `Missing: ₹${missingCharge}` : '',
          repairCharge ? `Repair: ₹${repairCharge}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        status: 'Return Pending',
      },
      include: rentalInclude,
    });
    await prisma.product.update({
      where: { id: rental.productId },
      data: {
        quantity: { increment: 1 },
        status: 'Available',
      },
    });
    await logActivity('return', `Product returned — rental #${rental.id}`, { rentalId: rental.id }, req.vendor.id);
    await notifyVendor({
      vendorId: req.vendor.id,
      title: 'Return received',
      body: `Rental #${rental.id} return verified.`,
      type: 'pickup',
      link: `/vendor/pickup-return?focus=${rental.id}`,
    });
    if (rental.customerId) {
      await notifyCustomer({
        customerId: rental.customerId,
        title: 'Return confirmed',
        body: `Your rental #${rental.id} was returned successfully.`,
        type: 'rental',
        link: `/user/rentals/${rental.id}`,
      });
    }
    res.json(serializeRental(updated));
  } catch (error) {
    console.error('Vendor verify return error:', error);
    res.status(500).json({ message: 'Failed to verify return OTP' });
  }
};

const advanceTracker = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    const stage = req.body?.stage;
    if (!TRACKER_STAGES.includes(stage)) {
      return res.status(400).json({ message: 'Invalid tracker stage', stages: TRACKER_STAGES });
    }
    const updated = await prisma.rental.update({
      where: { id: rental.id },
      data: {
        trackerStage: stage,
        ...(stage === 'Completed' ? { status: 'Completed', returnStatus: 'Completed' } : {}),
        ...(stage === 'Rental Active' ? { status: 'Active' } : {}),
      },
      include: rentalInclude,
    });
    res.json(serializeRental(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to advance tracker' });
  }
};

const scanDemo = async (req, res) => {
  try {
    const raw = String(req.body?.code || '').trim().toUpperCase();
    const rentalId = Number(raw.replace(/\D/g, '')) || Number(req.body?.rentalId);
    const rental = await assertOwnRental(req.vendor.id, rentalId);
    if (!rental) return res.status(404).json({ message: 'No rental matched code' });
    res.json({
      message: `Matched rental #${rental.id}`,
      rental: serializeRental(rental),
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ message: 'Lookup failed' });
  }
};

/* ---------- Money ---------- */
const getMoneySummary = async (req, res) => {
  try {
    const rs = rentalScope(req.vendor.id);
    const statuses = ['Held', 'Refunded', 'Pending Refund', 'Forfeited', 'Paid', 'Pending'];
    const result = {};
    for (const status of statuses) {
      const agg = await prisma.deposit.aggregate({
        where: { status, rental: rs },
        _sum: { amount: true, refundedAmount: true, lateFeeDeducted: true },
        _count: { _all: true },
      });
      result[status] = {
        count: agg._count._all,
        sum: toNumber(agg._sum.amount) || 0,
        refundedSum: toNumber(agg._sum.refundedAmount) || 0,
        penaltySum: toNumber(agg._sum.lateFeeDeducted) || 0,
      };
    }
    res.json({
      held: result.Held,
      refunded: result.Refunded,
      pendingRefund: result['Pending Refund'],
      forfeited: result.Forfeited,
      paid: result.Paid,
      pending: result.Pending,
      calcPreview: {
        formula: 'Security Deposit = Price Per Day × 1.5',
        example: calcSecurityDeposit(1000),
      },
    });
  } catch (error) {
    console.error('Vendor money summary error:', error);
    res.status(500).json({ message: 'Failed to load money summary' });
  }
};

const listDeposits = async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({
      where: { rental: rentalScope(req.vendor.id) },
      include: {
        events: { orderBy: { id: 'desc' } },
        rental: {
          include: {
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
    res.json(
      deposits.map((d) => ({
        ...serializeDeposit(d),
        events: d.events.map((e) => ({ ...e, amount: toNumber(e.amount) })),
        rental: d.rental,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to list deposits' });
  }
};

const requestRefund = async (req, res) => {
  try {
    const deposit = await prisma.deposit.findFirst({
      where: { id: Number(req.params.depositId), rental: rentalScope(req.vendor.id) },
      include: { rental: true },
    });
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: { status: 'Pending Refund' },
    });
    await prisma.depositEvent.create({
      data: {
        depositId: deposit.id,
        type: 'Refund Pending',
        amount: toNumber(deposit.amount),
        note: 'Refund requested by vendor',
      },
    });
    await logActivity('deposit', `Deposit refund pending #${deposit.id}`, { id: deposit.id }, req.vendor.id);
    res.json(serializeDeposit(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to request refund' });
  }
};

const approveRefund = async (req, res) => {
  try {
    const deposit = await prisma.deposit.findFirst({
      where: { id: Number(req.params.depositId), rental: rentalScope(req.vendor.id) },
      include: { rental: { include: { product: true } } },
    });
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

    const lateFee = Number(deposit.rental?.lateFee || 0);
    const damage = Number(deposit.rental?.damageCharge || 0);
    const penalties = lateFee + damage;
    const amount = toNumber(deposit.amount) || 0;
    const refunded = Math.max(0, amount - penalties);

    const updated = await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        status: 'Refunded',
        refundedAmount: refunded,
        lateFeeDeducted: penalties,
      },
    });
    await prisma.depositEvent.create({
      data: {
        depositId: deposit.id,
        type: penalties > 0 ? 'Penalty Deducted' : 'Refunded',
        amount: refunded,
        note: penalties > 0 ? `Penalties ₹${penalties}; refunded ₹${refunded}` : 'Full deposit refunded',
      },
    });

    await prisma.vendorInvoice.create({
      data: {
        vendorId: req.vendor.id,
        rentalId: deposit.rentalId,
        invoiceNo: `INV-REF-${deposit.id}-${Date.now().toString().slice(-6)}`,
        type: 'deposit_refund',
        amount: refunded,
        details: JSON.stringify({ depositId: deposit.id, penalties, refunded }),
      },
    });

    await logActivity('deposit', `Deposit refunded #${deposit.id}`, { id: deposit.id }, req.vendor.id);
    await notifyVendor({
      vendorId: req.vendor.id,
      title: 'Deposit Refunded',
      body: `Deposit #${deposit.id} refunded ${refunded} (penalties ${penalties}).`,
      type: 'deposit',
      link: '/vendor/money',
    });
    res.json(serializeDeposit(updated));
  } catch (error) {
    console.error('Vendor approve refund error:', error);
    res.status(500).json({ message: 'Failed to approve refund' });
  }
};

const calcPenalties = async (req, res) => {
  try {
    const rental = await assertOwnRental(req.vendor.id, req.params.rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    const pricePerDay = toNumber(rental.product?.pricePerDay) || 0;
    const late = await calculateLateFee(rental, pricePerDay);
    const damage = Number(req.query.damage || rental.damageCharge || 0);
    const cleaning = Number(req.query.cleaning || 0);
    const missing = Number(req.query.missing || 0);
    const repair = Number(req.query.repair || 0);
    const lateFee = Number(late.lateFee || 0);
    const total = lateFee + damage + cleaning + missing + repair;
    const depositAmt = toNumber(rental.deposit?.amount) || calcSecurityDeposit(pricePerDay);
    res.json({
      lateFee,
      lateDays: late.lateDays || 0,
      damage,
      cleaning,
      missing,
      repair,
      totalPenalties: total,
      depositAmount: depositAmt,
      refundable: Math.max(0, depositAmt - total),
      rules: {
        mode: req.vendor.lateFeeMode || 'daily',
        gracePeriodHours: req.vendor.gracePeriodHours || 0,
        maxLateFeePercent: req.vendor.maxLateFeePercent || 100,
        depositFormula: 'pricePerDay × 1.5',
      },
    });
  } catch (error) {
    console.error('Vendor calc penalties error:', error);
    res.status(500).json({ message: 'Failed to calculate penalties' });
  }
};

const listInvoices = async (req, res) => {
  try {
    const rows = await prisma.vendorInvoice.findMany({
      where: { vendorId: req.vendor.id },
      orderBy: { id: 'desc' },
      take: 50,
    });
    res.json(rows.map((r) => ({ ...r, amount: toNumber(r.amount) })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to list invoices' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { rentalId, type, amount, details } = req.body || {};
    if (rentalId) {
      const owned = await assertOwnRental(req.vendor.id, rentalId);
      if (!owned) return res.status(404).json({ message: 'Rental not found' });
    }
    const row = await prisma.vendorInvoice.create({
      data: {
        vendorId: req.vendor.id,
        rentalId: rentalId != null ? Number(rentalId) : null,
        invoiceNo: `INV-${Date.now().toString().slice(-8)}`,
        type: type || 'rental',
        amount: Number(amount) || 0,
        details: typeof details === 'string' ? details : JSON.stringify(details || {}),
      },
    });
    res.status(201).json({ ...row, amount: toNumber(row.amount) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create invoice' });
  }
};

/* ---------- Customers (scoped via rentals) ---------- */
const listCustomers = async (req, res) => {
  try {
    const rentals = await prisma.rental.findMany({
      where: { ...rentalScope(req.vendor.id), customerId: { not: null } },
      select: {
        customerId: true,
        customer: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
    });
    const map = new Map();
    rentals.forEach((r) => {
      if (!r.customer) return;
      const id = r.customer.id;
      if (!map.has(id)) {
        map.set(id, {
          ...r.customer,
          walletBalance: toNumber(r.customer.walletBalance),
          rentalCount: 0,
          spend: 0,
          lastRentalAt: r.createdAt,
        });
      }
      const row = map.get(id);
      row.rentalCount += 1;
      row.spend += toNumber(r.amount) || 0;
    });
    res.json([...map.values()]);
  } catch (error) {
    console.error('Vendor customers error:', error);
    res.status(500).json({ message: 'Failed to list customers' });
  }
};

/* ---------- Coupons & Discounts ---------- */
const listCoupons = async (req, res) => {
  try {
    const rows = await prisma.coupon.findMany({
      where: { vendorId: req.vendor.id },
      orderBy: { id: 'desc' },
    });
    res.json(
      rows.map((c) => ({
        ...c,
        value: toNumber(c.value),
        minAmount: toNumber(c.minAmount),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to list coupons' });
  }
};

const createCoupon = async (req, res) => {
  try {
    const { code, type, value, label, description, minAmount, maxUsage, expiresAt, active } =
      req.body || {};
    if (!code) return res.status(400).json({ message: 'code is required' });
    const row = await prisma.coupon.create({
      data: {
        code: String(code).toUpperCase().trim(),
        type: type || 'percent',
        value: Number(value) || 0,
        label: label || code,
        description: description || '',
        minAmount: Number(minAmount) || 0,
        maxUsage: Number(maxUsage) || 0,
        active: active != null ? Boolean(active) : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        vendorId: req.vendor.id,
      },
    });
    res.status(201).json({
      ...row,
      value: toNumber(row.value),
      minAmount: toNumber(row.minAmount),
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const existing = await prisma.coupon.findFirst({
      where: { id: Number(req.params.id), vendorId: req.vendor.id },
    });
    if (!existing) return res.status(404).json({ message: 'Coupon not found' });
    const body = req.body || {};
    const row = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        ...(body.label != null && { label: body.label }),
        ...(body.description != null && { description: body.description }),
        ...(body.type != null && { type: body.type }),
        ...(body.value != null && { value: Number(body.value) }),
        ...(body.minAmount != null && { minAmount: Number(body.minAmount) }),
        ...(body.maxUsage != null && { maxUsage: Number(body.maxUsage) }),
        ...(body.active != null && { active: Boolean(body.active) }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
      },
    });
    res.json({ ...row, value: toNumber(row.value), minAmount: toNumber(row.minAmount) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const existing = await prisma.coupon.findFirst({
      where: { id: Number(req.params.id), vendorId: req.vendor.id },
    });
    if (!existing) return res.status(404).json({ message: 'Coupon not found' });
    await prisma.coupon.delete({ where: { id: existing.id } });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

const listDiscounts = async (req, res) => {
  try {
    const rows = await prisma.discountOffer.findMany({
      where: { vendorId: req.vendor.id },
      orderBy: { id: 'desc' },
    });
    res.json(rows.map((d) => ({ ...d, value: toNumber(d.value) })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to list discounts' });
  }
};

const createDiscount = async (req, res) => {
  try {
    const { name, discountType, type, value, description, active, startsAt, endsAt } = req.body || {};
    if (!name || !discountType) {
      return res.status(400).json({ message: 'name and discountType are required' });
    }
    const row = await prisma.discountOffer.create({
      data: {
        vendorId: req.vendor.id,
        name,
        discountType,
        type: type || 'percent',
        value: Number(value) || 0,
        description: description || '',
        active: active != null ? Boolean(active) : true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });
    res.status(201).json({ ...row, value: toNumber(row.value) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create discount' });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const existing = await prisma.discountOffer.findFirst({
      where: { id: Number(req.params.id), vendorId: req.vendor.id },
    });
    if (!existing) return res.status(404).json({ message: 'Discount not found' });
    await prisma.discountOffer.delete({ where: { id: existing.id } });
    res.json({ message: 'Discount deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete discount' });
  }
};

/* ---------- Reports ---------- */
const getReports = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const rs = rentalScope(vendorId);
    const [
      revenue,
      active,
      completed,
      late,
      lateFees,
      topProducts,
      customers,
      maintenance,
    ] = await Promise.all([
      prisma.rental.aggregate({ where: rs, _sum: { amount: true } }),
      prisma.rental.count({ where: { ...rs, status: { in: ['Active', 'Requested', 'Approved'] } } }),
      prisma.rental.count({ where: { ...rs, status: 'Completed' } }),
      prisma.rental.count({ where: { ...rs, status: { in: ['Overdue', 'Return Pending'] } } }),
      prisma.rental.aggregate({ where: rs, _sum: { lateFee: true } }),
      prisma.$queryRaw`
        SELECT p.name, COUNT(r.id)::int AS rentals, COALESCE(SUM(r.amount),0)::float AS revenue
        FROM rentals r JOIN products p ON p.id = r."productId"
        WHERE p."vendor_id" = ${vendorId}
        GROUP BY p.name ORDER BY rentals DESC LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT COALESCE(c.name, r."customerName") AS name, COUNT(r.id)::int AS rentals,
               COALESCE(SUM(r.amount),0)::float AS spend
        FROM rentals r
        JOIN products p ON p.id = r."productId"
        LEFT JOIN customers c ON c.id = r."customerId"
        WHERE p."vendor_id" = ${vendorId}
        GROUP BY 1 ORDER BY spend DESC LIMIT 10
      `,
      prisma.product.count({
        where: {
          ...productScope(vendorId),
          maintenanceStatus: { not: 'None' },
        },
      }),
    ]);
    const totalRevenue = toNumber(revenue._sum.amount) || 0;
    res.json({
      revenue: totalRevenue,
      profit: Math.round(totalRevenue * PROFIT_MARGIN * 100) / 100,
      activeRentals: active,
      completedRentals: completed,
      lateReturns: late,
      penaltyCollection: toNumber(lateFees._sum.lateFee) || 0,
      maintenanceCount: maintenance,
      topProducts,
      topCustomers: customers,
    });
  } catch (error) {
    console.error('Vendor reports error:', error);
    res.status(500).json({ message: 'Failed to load reports' });
  }
};

/* ---------- Notifications & Profile ---------- */
const listNotifications = async (req, res) => {
  try {
    const rows = await prisma.vendorNotification.findMany({
      where: { vendorId: req.vendor.id },
      orderBy: { id: 'desc' },
      take: 50,
    });
    const TYPE_LINKS = {
      inventory: '/vendor/inventory',
      pickup: '/vendor/pickup-return',
      order: '/vendor/orders',
      deposit: '/vendor/money',
      info: '/vendor/notifications',
    };
    res.json(
      rows.map((n) => ({
        ...n,
        link: n.link || TYPE_LINKS[n.type] || '/vendor/notifications',
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to list notifications' });
  }
};

const unreadVendorCount = async (req, res) => {
  try {
    const count = await prisma.vendorNotification.count({
      where: { vendorId: req.vendor.id, read: false },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to count notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const row = await prisma.vendorNotification.findFirst({
      where: { id: Number(req.params.id), vendorId: req.vendor.id },
    });
    if (!row) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.vendorNotification.update({
      where: { id: row.id },
      data: { read: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
};

const getProfile = async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.vendor.id } });
    res.json({
      ...sanitizeVendor(vendor),
      pendingPayout: toNumber(vendor.pendingPayout),
      paidOut: toNumber(vendor.paidOut),
      lateFeeAmount: toNumber(vendor.lateFeeAmount),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      company,
      address,
      logo,
      lateFeeMode,
      lateFeeAmount,
      gracePeriodHours,
      maxLateFeePercent,
      password,
    } = req.body || {};
    const data = {
      ...(name != null && { name }),
      ...(phone != null && { phone }),
      ...(company != null && { company }),
      ...(address != null && { address }),
      ...(logo != null && { logo }),
      ...(lateFeeMode != null && { lateFeeMode }),
      ...(lateFeeAmount != null && { lateFeeAmount: Number(lateFeeAmount) }),
      ...(gracePeriodHours != null && { gracePeriodHours: Number(gracePeriodHours) }),
      ...(maxLateFeePercent != null && { maxLateFeePercent: Number(maxLateFeePercent) }),
    };
    if (password && String(password).length >= 6) {
      const bcrypt = require('bcryptjs');
      data.password = await bcrypt.hash(String(password), 10);
    }
    const vendor = await prisma.vendor.update({ where: { id: req.vendor.id }, data });
    res.json({
      ...sanitizeVendor(vendor),
      pendingPayout: toNumber(vendor.pendingPayout),
      paidOut: toNumber(vendor.paidOut),
      lateFeeAmount: toNumber(vendor.lateFeeAmount),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

module.exports = {
  getDashboard,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  restoreProduct,
  listRentals,
  getRental,
  updateRentalStatus,
  listSchedule,
  generateOtps,
  verifyPickupOtp,
  verifyReturnOtp,
  advanceTracker,
  scanDemo,
  getMoneySummary,
  listDeposits,
  requestRefund,
  approveRefund,
  calcPenalties,
  listInvoices,
  createInvoice,
  listCustomers,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listDiscounts,
  createDiscount,
  deleteDiscount,
  getReports,
  listNotifications,
  unreadVendorCount,
  markNotificationRead,
  getProfile,
  updateProfile,
  TRACKER_STAGES,
};

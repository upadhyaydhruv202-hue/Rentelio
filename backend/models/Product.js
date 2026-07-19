const prisma = require('../config/prisma');
const { serializeProduct } = require('../utils/serializers');
const { calcSecurityDeposit, calcPricePerHour } = require('../utils/pricing');

const resolveHourlyPrice = (data, pricePerDay, existingHourly) => {
  if (data.pricePerHour != null && data.pricePerHour !== '') {
    return Number(data.pricePerHour);
  }
  if (existingHourly != null && Number(existingHourly) > 0) {
    return Number(existingHourly);
  }
  return calcPricePerHour(pricePerDay);
};

const extraFields = (data, existing = {}) => ({
  storage: data.storage != null ? data.storage : existing.storage || '',
  edition: data.edition != null ? data.edition : existing.edition || '',
  condition: data.condition != null ? data.condition : existing.condition || 'Good',
  warranty: data.warranty != null ? data.warranty : existing.warranty || '',
  material: data.material != null ? data.material : existing.material || '',
  archived: data.archived != null ? Boolean(data.archived) : existing.archived || false,
  maintenanceStatus:
    data.maintenanceStatus != null
      ? data.maintenanceStatus
      : existing.maintenanceStatus || 'None',
  maintenanceNote:
    data.maintenanceNote != null ? data.maintenanceNote : existing.maintenanceNote || '',
  reservedQty:
    data.reservedQty != null ? Number(data.reservedQty) : existing.reservedQty || 0,
  nextInspectionAt:
    data.nextInspectionAt !== undefined
      ? data.nextInspectionAt
        ? new Date(data.nextInspectionAt)
        : null
      : existing.nextInspectionAt || null,
  vendorId:
    data.vendorId !== undefined
      ? data.vendorId == null
        ? null
        : Number(data.vendorId)
      : existing.vendorId != null
        ? existing.vendorId
        : undefined,
});

const Product = {
  async findAll(includeArchived = true) {
    const products = await prisma.product.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { id: 'desc' },
    });
    return products.map(serializeProduct);
  },

  async findAvailable(filters = {}) {
    const where = {
      archived: false,
      maintenanceStatus: { not: 'UnderMaintenance' },
    };

    if (filters.available !== 'false') {
      where.status = 'Available';
      where.quantity = { gt: 0 };
    }

    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }
    if (filters.brand) {
      where.brand = { equals: filters.brand, mode: 'insensitive' };
    }
    if (filters.search) {
      const q = String(filters.search);
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filters.minPrice != null && filters.minPrice !== '') {
      where.pricePerDay = { ...(where.pricePerDay || {}), gte: Number(filters.minPrice) };
    }
    if (filters.maxPrice != null && filters.maxPrice !== '') {
      where.pricePerDay = { ...(where.pricePerDay || {}), lte: Number(filters.maxPrice) };
    }

    let orderBy = { id: 'desc' };
    if (filters.sort === 'price_asc') orderBy = { pricePerDay: 'asc' };
    if (filters.sort === 'price_desc') orderBy = { pricePerDay: 'desc' };
    if (filters.sort === 'name') orderBy = { name: 'asc' };

    const products = await prisma.product.findMany({ where, orderBy });
    return products.map(serializeProduct);
  },

  async findById(id) {
    return serializeProduct(await prisma.product.findUnique({ where: { id: Number(id) } }));
  },

  async create(data) {
    const pricePerDay = Number(data.pricePerDay);
    const pricePerHour = resolveHourlyPrice(data, pricePerDay);
    if (!data.image) {
      throw Object.assign(new Error('Please upload a product image before creating the product.'), {
        status: 400,
      });
    }

    return serializeProduct(
      await prisma.product.create({
        data: {
          name: data.name,
          category: data.category,
          quantity: Number(data.quantity),
          pricePerDay,
          pricePerHour,
          status: data.status || 'Available',
          description: data.description || '',
          image: data.image,
          securityDeposit: calcSecurityDeposit(pricePerDay),
          brand: data.brand || '',
          color: data.color || '',
          size: data.size || '',
          ...extraFields(data),
        },
      })
    );
  },

  async update(id, data) {
    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) return null;

    const pricePerDay =
      data.pricePerDay != null ? Number(data.pricePerDay) : Number(existing.pricePerDay);
    const pricePerHour = resolveHourlyPrice(data, pricePerDay, existing.pricePerHour);
    const image = data.image != null ? data.image : existing.image;
    if (!image) {
      throw Object.assign(new Error('Please upload a product image before creating the product.'), {
        status: 400,
      });
    }

    return serializeProduct(
      await prisma.product.update({
        where: { id: Number(id) },
        data: {
          name: data.name ?? existing.name,
          category: data.category ?? existing.category,
          quantity: data.quantity != null ? Number(data.quantity) : existing.quantity,
          pricePerDay,
          pricePerHour,
          status: data.status ?? existing.status,
          description: data.description != null ? data.description : existing.description,
          image,
          securityDeposit: calcSecurityDeposit(pricePerDay),
          brand: data.brand != null ? data.brand : existing.brand,
          color: data.color != null ? data.color : existing.color,
          size: data.size != null ? data.size : existing.size,
          ...extraFields(data, existing),
        },
      })
    );
  },

  async delete(id) {
    try {
      return serializeProduct(await prisma.product.delete({ where: { id: Number(id) } }));
    } catch {
      return null;
    }
  },

  async getCategories() {
    const rows = await prisma.product.findMany({
      where: { status: 'Available', quantity: { gt: 0 }, archived: false },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  },

  async getBrands() {
    const rows = await prisma.product.findMany({
      where: { archived: false, brand: { not: '' } },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  },
};

module.exports = Product;

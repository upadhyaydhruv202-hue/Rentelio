const prisma = require('../config/prisma');
const Product = require('../models/Product');
const { resolveCoupon, serializeCoupon } = require('../services/couponService');
const { toNumber } = require('../utils/serializers');

const serialize = (c) => serializeCoupon(c);

const validateCoupon = async (req, res) => {
  try {
    const code = String(req.body?.code || req.query?.code || '').trim();
    const amount = Number(req.body?.amount ?? req.query?.amount ?? 0);
    const productId = req.body?.productId || req.query?.productId;

    if (!code) {
      return res.status(400).json({ message: 'code is required', valid: false });
    }

    let vendorId = null;
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found', valid: false });
      }
      vendorId = product.vendorId ?? null;
    }

    const priced = await resolveCoupon({ code, amount, vendorId });
    res.json({
      valid: true,
      coupon: priced.coupon,
      subtotal: priced.subtotal,
      discountAmount: priced.discountAmount,
      finalAmount: priced.finalAmount,
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Validate coupon error:', error);
    res.status(status).json({
      message: error.message || 'Failed to validate coupon',
      valid: false,
    });
  }
};

const listCoupons = async (req, res) => {
  try {
    const rows = await prisma.coupon.findMany({ orderBy: { id: 'desc' } });
    res.json(
      rows.map((c) => ({
        ...serialize(c),
        minAmount: toNumber(c.minAmount),
      }))
    );
  } catch (error) {
    console.error('List coupons error:', error);
    res.status(500).json({ message: 'Failed to list coupons' });
  }
};

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      label,
      description,
      minAmount,
      maxUsage,
      active,
      expiresAt,
      vendorId,
    } = req.body || {};
    if (!code || value == null) {
      return res.status(400).json({ message: 'code and value are required' });
    }

    const row = await prisma.coupon.create({
      data: {
        code: String(code).trim().toUpperCase(),
        type: type || 'percent',
        value: Number(value),
        label: label || String(code).trim().toUpperCase(),
        description: description || '',
        minAmount: Number(minAmount) || 0,
        maxUsage: Number(maxUsage) || 0,
        active: active !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        vendorId: vendorId != null ? Number(vendorId) : null,
      },
    });

    res.status(201).json(serialize(row));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Coupon code already exists' });
    }
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

module.exports = { validateCoupon, listCoupons, createCoupon };

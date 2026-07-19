const Product = require('../models/Product');

const parseBody = (body = {}) => ({
  name: body.name,
  category: body.category,
  quantity: body.quantity != null ? Number(body.quantity) : undefined,
  pricePerDay: body.pricePerDay != null ? Number(body.pricePerDay) : undefined,
  pricePerHour: body.pricePerHour != null ? Number(body.pricePerHour) : undefined,
  status: body.status,
  description: body.description,
  brand: body.brand,
  color: body.color,
  size: body.size,
  maintenanceStatus: body.maintenanceStatus,
  archived: body.archived != null ? Boolean(body.archived) : undefined,
  storage: body.storage,
  edition: body.edition,
  condition: body.condition,
  warranty: body.warranty,
  reservedQty: body.reservedQty != null ? Number(body.reservedQty) : undefined,
  maintenanceNote: body.maintenanceNote,
  nextInspectionAt: body.nextInspectionAt,
});

const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const createProduct = async (req, res) => {
  try {
    const data = parseBody(req.body);
    const { name, category, quantity, pricePerDay } = data;

    if (!name || !category || quantity == null || pricePerDay == null) {
      return res.status(400).json({ message: 'Missing required product fields' });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload a product image before creating the product.',
      });
    }

    const image = `/uploads/products/${req.file.filename}`;

    const product = await Product.create({
      name,
      category,
      quantity,
      pricePerDay,
      pricePerHour: data.pricePerHour,
      status: data.status || 'Available',
      description: data.description || '',
      image,
      brand: data.brand || '',
      color: data.color || '',
      size: data.size || '',
      maintenanceStatus: data.maintenanceStatus,
      archived: data.archived,
      storage: data.storage,
      edition: data.edition,
      condition: data.condition,
      warranty: data.warranty,
      reservedQty: data.reservedQty,
      maintenanceNote: data.maintenanceNote,
      nextInspectionAt: data.nextInspectionAt,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const data = parseBody(req.body);
    const payload = { ...data };

    if (req.file) {
      payload.image = `/uploads/products/${req.file.filename}`;
    }

    // Keep existing image unless a new file is uploaded
    if (!payload.image && !existing.image) {
      return res.status(400).json({
        message: 'Please upload a product image before creating the product.',
      });
    }

    const product = await Product.update(id, payload);
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: error.message || 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.delete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

const archiveProduct = async (req, res) => {
  try {
    const product = await Product.update(req.params.id, { archived: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Archive product error:', error);
    res.status(500).json({ message: 'Failed to archive product' });
  }
};

const restoreProduct = async (req, res) => {
  try {
    const product = await Product.update(req.params.id, { archived: false });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Restore product error:', error);
    res.status(500).json({ message: 'Failed to restore product' });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  restoreProduct,
};

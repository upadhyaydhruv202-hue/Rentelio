const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const CustomerRental = require('../models/CustomerRental');
const { signToken } = require('../utils/jwt');
const { startOfDay } = require('../utils/serializers');

const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await Customer.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      name,
      email,
      password: hashed,
      phone: phone || '',
      address: address || '',
    });

    const token = signToken({ id: customer.id, type: 'customer', role: 'user', portal: 'user' });

    res.status(201).json({
      message: 'Registration successful',
      customer: { ...customer, role: 'user', roleLabel: 'User' },
      token,
    });
  } catch (error) {
    console.error('Customer register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const customer = await Customer.findByEmail(email);
    if (!customer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken({ id: customer.id, type: 'customer', role: 'user', portal: 'user' });

    res.json({
      message: 'Login successful',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        profileImage: customer.profileImage,
        role: 'user',
        roleLabel: 'User',
      },
      token,
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json(req.customer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, profileImage, language, idDocumentUrl, password } = req.body;
    const data = { name, phone, address, profileImage, language, idDocumentUrl };
    if (password && String(password).length >= 6) {
      data.password = await bcrypt.hash(String(password), 10);
    }
    const updated = await Customer.update(req.customer.id, data);
    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, brand, sort, available } = req.query;
    const products = await Product.findAvailable({
      category,
      search,
      minPrice,
      maxPrice,
      brand,
      sort,
      available,
    });
    const categories = await Product.getCategories();
    const brands = await Product.getBrands();
    res.json({ products, categories, brands });
  } catch (error) {
    console.error('User products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('User product detail error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

const getDashboard = async (req, res) => {
  try {
    await CustomerRental.syncStatuses(req.customer.id);
    const stats = await CustomerRental.getStats(req.customer.id);
    const rentals = await CustomerRental.findByCustomer(req.customer.id);
    const products = await Product.findAvailable({});
    const categories = await Product.getCategories();

    res.json({
      stats,
      activeRentals: rentals
        .filter((r) => r.status === 'Active' || r.status === 'Return Pending')
        .slice(0, 5),
      recommended: products.slice(0, 8),
      categories,
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

const createRental = async (req, res) => {
  try {
    const {
      productId,
      startDate,
      returnDate,
      billingUnit,
      fulfillment,
      shippingAddress,
      couponCode,
    } = req.body;
    if (!productId || !startDate || !returnDate) {
      return res.status(400).json({ message: 'Product and rental dates are required' });
    }

    const booked = await CustomerRental.bookRental({
      customerId: req.customer.id,
      productId: Number(productId),
      startDate,
      returnDate,
      billingUnit,
      fulfillment,
      shippingAddress,
      couponCode,
    });

    const full = await CustomerRental.findById(booked.rental.id, req.customer.id);
    res.status(201).json({
      message: 'Rental booked successfully',
      rental: full,
      summary: {
        productName: booked.product.name,
        billingUnit: booked.billingUnit,
        durationUnits: booked.durationUnits,
        days: booked.days,
        hours: booked.hours,
        startDate,
        returnDate,
        subtotal: booked.subtotal,
        discountAmount: booked.discountAmount,
        discountLabel: booked.discountLabel,
        couponCode: booked.couponCode,
        rentalCost: booked.amount,
        securityDeposit: booked.depositAmount,
        totalAmount: booked.amount + booked.depositAmount,
        fulfillment: booked.rental.fulfillment,
      },
    });
  } catch (error) {
    console.error('Create user rental error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to create rental' });
  }
};

const getRentals = async (req, res) => {
  try {
    await CustomerRental.syncStatuses(req.customer.id);
    const rentals = await CustomerRental.findByCustomer(req.customer.id);
    res.json(rentals);
  } catch (error) {
    console.error('Get user rentals error:', error);
    res.status(500).json({ message: 'Failed to fetch rentals' });
  }
};

const getRental = async (req, res) => {
  try {
    await CustomerRental.syncStatuses(req.customer.id);
    const rental = await CustomerRental.findById(req.params.id, req.customer.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    const today = startOfDay();
    const expected = startOfDay(rental.returnDate);
    const remainingDays = Math.ceil((expected - today) / (1000 * 60 * 60 * 24));
    let lateCharge = Number(rental.lateFee) || 0;
    if (remainingDays < 0 && rental.status !== 'Completed') {
      lateCharge = Math.abs(remainingDays) * Number(rental.pricePerDay || 0);
    }

    res.json({
      ...rental,
      remainingDays,
      lateCharge,
      totalPaid: Number(rental.amount) + Number(rental.depositAmount),
    });
  } catch (error) {
    console.error('Get user rental error:', error);
    res.status(500).json({ message: 'Failed to fetch rental' });
  }
};

const cancelRental = async (req, res) => {
  try {
    const updated = await CustomerRental.cancelAndRestore(req.params.id, req.customer.id);
    res.json(updated);
  } catch (error) {
    console.error('Cancel rental error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to cancel rental' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getProducts,
  getProduct,
  getDashboard,
  createRental,
  getRentals,
  getRental,
  cancelRental,
};

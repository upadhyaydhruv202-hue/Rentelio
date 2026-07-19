const prisma = require('../config/prisma');
const { toNumber } = require('../utils/serializers');
const { moneyRound } = require('../utils/pricing');
const { logActivity } = require('../services/activity');
const { notifyCustomer } = require('../services/realtime');

const PAYMENT_METHODS = {
  card: 'Card',
  upi: 'UPI',
  netbanking: 'Net Banking',
  wallet: 'Other wallet',
};

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

const getWallet = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const [customer, txns] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.walletTxn.findMany({
        where: { customerId },
        orderBy: { id: 'desc' },
        take: 50,
      }),
    ]);

    res.json({
      balance: toNumber(customer.walletBalance),
      quickAmounts: QUICK_AMOUNTS,
      paymentMethods: Object.entries(PAYMENT_METHODS).map(([id, label]) => ({ id, label })),
      transactions: txns.map((t) => ({
        ...t,
        amount: toNumber(t.amount),
        balanceAfter: toNumber(t.balanceAfter),
      })),
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: 'Failed to load wallet' });
  }
};

function validatePaymentDetails(method, details = {}) {
  if (method === 'card') {
    const number = String(details.cardNumber || '').replace(/\s+/g, '');
    const name = String(details.cardName || '').trim();
    const expiry = String(details.expiry || '').trim();
    const cvv = String(details.cvv || '').trim();
    if (!/^\d{13,19}$/.test(number)) {
      return 'Enter a valid card number (13–19 digits)';
    }
    if (name.length < 2) return 'Enter the name on the card';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Expiry must be MM/YY';
    const [mm, yy] = expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) return 'Invalid expiry month';
    if (!/^\d{3,4}$/.test(cvv)) return 'Enter a valid CVV';
    // Lightweight Luhn check for realism
    let sum = 0;
    let alt = false;
    for (let i = number.length - 1; i >= 0; i -= 1) {
      let n = Number(number[i]);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    if (sum % 10 !== 0) {
      return 'Card number failed validation — use a valid test card (e.g. 4111 1111 1111 1111)';
    }
    return null;
  }

  if (method === 'upi') {
    const upiId = String(details.upiId || '').trim().toLowerCase();
    if (!/^[\w.-]{2,}@[\w]{2,}$/.test(upiId)) {
      return 'Enter a valid UPI ID (e.g. name@upi)';
    }
    return null;
  }

  if (method === 'netbanking') {
    const bank = String(details.bank || '').trim();
    if (bank.length < 2) return 'Select a bank for net banking';
    return null;
  }

  if (method === 'wallet') {
    return null;
  }

  return 'Unsupported payment method';
}

function maskPaymentNote(method, details = {}) {
  if (method === 'card') {
    const number = String(details.cardNumber || '').replace(/\s+/g, '');
    const last4 = number.slice(-4);
    return `Card deposit · **** ${last4}`;
  }
  if (method === 'upi') {
    return `UPI deposit · ${String(details.upiId || '').trim().toLowerCase()}`;
  }
  if (method === 'netbanking') {
    return `Net banking · ${String(details.bank || 'Bank').trim()}`;
  }
  return 'Wallet top-up';
}

/**
 * Customer self-deposit — simulates card / UPI / netbanking payment
 * and credits walletBalance when payment details validate.
 */
const depositWallet = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { amount, method, details } = req.body || {};
    const credit = moneyRound(amount);

    if (!credit || credit < 1) {
      return res.status(400).json({ message: 'Enter an amount of at least ₹1' });
    }
    if (credit > 100000) {
      return res.status(400).json({ message: 'Maximum deposit per transaction is ₹1,00,000' });
    }

    const payMethod = String(method || '').toLowerCase();
    if (!PAYMENT_METHODS[payMethod]) {
      return res.status(400).json({
        message: `Choose a payment method: ${Object.keys(PAYMENT_METHODS).join(', ')}`,
      });
    }

    const validationError = validatePaymentDetails(payMethod, details);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    if (customer.status === 'Suspended') {
      return res.status(403).json({ message: 'Wallet deposits are blocked for suspended accounts' });
    }

    const newBalance = moneyRound(toNumber(customer.walletBalance) + credit);
    const note = maskPaymentNote(payMethod, details);

    const [updated, txn] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTxn.create({
        data: {
          customerId,
          type: 'deposit',
          amount: credit,
          balanceAfter: newBalance,
          note: `${note} · ${PAYMENT_METHODS[payMethod]}`,
        },
      }),
    ]);

    await notifyCustomer({
      customerId,
      title: 'Wallet credited',
      body: `₹${credit.toLocaleString('en-IN')} added via ${PAYMENT_METHODS[payMethod]}. New balance ₹${newBalance.toLocaleString('en-IN')}.`,
      type: 'wallet',
      link: '/user/wallet',
    });

    await logActivity('wallet', `Customer #${customerId} deposited ${credit} via ${payMethod}`, {
      customerId,
      amount: credit,
      method: payMethod,
    });

    res.status(201).json({
      message: 'Payment successful — wallet updated',
      balance: toNumber(updated.walletBalance),
      paymentMethod: payMethod,
      paymentMethodLabel: PAYMENT_METHODS[payMethod],
      transaction: {
        ...txn,
        amount: toNumber(txn.amount),
        balanceAfter: toNumber(txn.balanceAfter),
      },
    });
  } catch (error) {
    console.error('Wallet deposit error:', error);
    res.status(500).json({ message: 'Payment failed — please try again' });
  }
};

const adminCredit = async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const { amount, note } = req.body || {};

    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Positive amount is required' });
    }

    const credit = moneyRound(amount);
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const newBalance = moneyRound(toNumber(customer.walletBalance) + credit);
    const [updated, txn] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTxn.create({
        data: {
          customerId,
          type: 'admin_credit',
          amount: credit,
          balanceAfter: newBalance,
          note: note || 'Admin wallet credit',
        },
      }),
    ]);

    await logActivity('wallet', `Admin credited ${credit} to customer #${customerId}`, {
      customerId,
      amount: credit,
    });

    res.json({
      balance: toNumber(updated.walletBalance),
      transaction: {
        ...txn,
        amount: toNumber(txn.amount),
        balanceAfter: toNumber(txn.balanceAfter),
      },
    });
  } catch (error) {
    console.error('Admin credit error:', error);
    res.status(500).json({ message: 'Failed to credit wallet' });
  }
};

module.exports = { getWallet, depositWallet, adminCredit, PAYMENT_METHODS, QUICK_AMOUNTS };

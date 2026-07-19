const express = require('express');
const { requireStaff, requireAdmin } = require('../middleware/auth');
const { requireCustomer } = require('../middleware/customerAuth');

const { getDashboardV2 } = require('../controllers/v2DashboardController');
const {
  listQuotations,
  createQuotation,
  counterQuotation,
  approveQuotation,
  rejectQuotation,
} = require('../controllers/quotationController');
const {
  getWalletSummary,
  getDepositHistory,
  requestRefund,
  approveRefund,
  calcPenalties,
} = require('../controllers/moneyController');
const {
  listSchedule,
  generateOtps,
  verifyPickupOtp,
  verifyReturnOtp,
  advanceTracker,
  setSchedule,
} = require('../controllers/pickupReturnController');
const {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  verifyVendor,
  approveVendor,
  blacklistVendor,
  updatePerformance,
  getPayoutsSummary,
} = require('../controllers/vendorController');
const { listCustomers, setStatus, verifyIdentity } = require('../controllers/adminUserController');
const {
  listForCustomer,
  markRead,
  adminBroadcast,
  adminList,
  unreadCount,
} = require('../controllers/notificationController');
const { getWallet, adminCredit, depositWallet } = require('../controllers/walletController');
const { getCart, addToCart, removeFromCart, clearCart } = require('../controllers/cartController');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { validateCoupon, listCoupons, createCoupon } = require('../controllers/couponController');
const {
  createReview,
  adminListReviews,
  moderateReview,
  reportReview,
} = require('../controllers/reviewController');
const {
  listActiveByPlacement,
  adminListAds,
  createAd,
  updateAd,
  deleteAd,
} = require('../controllers/adsController');
const { listAlerts, getFraudOverview, scanFraud, resolveAlert, actOnAlert } = require('../controllers/fraudController');
const {
  getOverview,
  getHealth,
  createBackup,
  listBackups,
  getBackupInfo,
  restoreBackup,
  getSettings,
  updateSettings,
} = require('../controllers/platformController');
const {
  getControlCenter,
  runVendorKyc,
  setVendorKycDecision,
  listVendorsAdmin,
  listUsersAdmin,
} = require('../controllers/superAdminController');
const {
  getSettlementDashboard,
  listSettlements,
  updateSettlementStatus,
} = require('../controllers/settlementController');

function registerV2Routes(app) {
  // Dashboard v2
  app.get('/api/dashboard/v2', requireStaff, getDashboardV2);

  // Super Admin control center
  app.get('/api/super-admin/overview', requireStaff, requireAdmin, getControlCenter);
  app.get('/api/super-admin/vendors', requireStaff, requireAdmin, listVendorsAdmin);
  app.get('/api/super-admin/users', requireStaff, requireAdmin, listUsersAdmin);
  app.post('/api/super-admin/vendors/:id/kyc-scan', requireStaff, requireAdmin, runVendorKyc);
  app.post('/api/super-admin/vendors/:id/kyc-decision', requireStaff, requireAdmin, setVendorKycDecision);

  // Settlements / payouts
  app.get('/api/settlements/dashboard', requireStaff, requireAdmin, getSettlementDashboard);
  app.get('/api/settlements', requireStaff, requireAdmin, listSettlements);
  app.post('/api/settlements/:id/action', requireStaff, requireAdmin, updateSettlementStatus);

  // Quotations
  app.get('/api/quotations', requireStaff, listQuotations);
  app.post('/api/quotations', requireStaff, createQuotation);
  app.post('/api/quotations/:id/counter', requireStaff, counterQuotation);
  app.post('/api/quotations/:id/approve', requireStaff, approveQuotation);
  app.post('/api/quotations/:id/reject', requireStaff, rejectQuotation);

  // Money / deposits
  app.get('/api/money/wallet-summary', requireStaff, getWalletSummary);
  app.get('/api/money/deposits', requireStaff, getDepositHistory);
  app.post('/api/money/deposits/:depositId/request-refund', requireStaff, requestRefund);
  app.post('/api/money/deposits/:depositId/approve-refund', requireStaff, approveRefund);
  app.get('/api/money/rentals/:rentalId/penalties', requireStaff, calcPenalties);

  // Pickup & return
  app.get('/api/pickup-return/schedule', requireStaff, listSchedule);
  app.post('/api/pickup-return/:rentalId/otps', requireStaff, generateOtps);
  app.post('/api/pickup-return/:rentalId/verify-pickup', requireStaff, verifyPickupOtp);
  app.post('/api/pickup-return/:rentalId/verify-return', requireStaff, verifyReturnOtp);
  app.post('/api/pickup-return/:rentalId/advance', requireStaff, advanceTracker);
  app.put('/api/pickup-return/:rentalId/schedule', requireStaff, setSchedule);

  // Vendors
  app.get('/api/vendors', requireStaff, listVendors);
  app.post('/api/vendors', requireAdmin, createVendor);
  app.put('/api/vendors/:id', requireAdmin, updateVendor);
  app.delete('/api/vendors/:id', requireAdmin, deleteVendor);
  app.post('/api/vendors/:id/verify', requireAdmin, verifyVendor);
  app.post('/api/vendors/:id/approve', requireAdmin, approveVendor);
  app.post('/api/vendors/:id/blacklist', requireAdmin, blacklistVendor);
  app.put('/api/vendors/:id/performance', requireAdmin, updatePerformance);
  app.get('/api/vendors/payouts/summary', requireStaff, getPayoutsSummary);

  // Admin users (customers)
  app.get('/api/admin/users', requireStaff, requireAdmin, listCustomers);
  app.put('/api/admin/users/:id/status', requireStaff, requireAdmin, setStatus);
  app.post('/api/admin/users/:id/verify-identity', requireStaff, requireAdmin, verifyIdentity);

  // Notifications
  app.get('/api/notifications', requireCustomer, listForCustomer);
  app.get('/api/notifications/unread-count', requireCustomer, unreadCount);
  app.put('/api/notifications/:id/read', requireCustomer, markRead);
  app.post('/api/notifications/broadcast', requireStaff, requireAdmin, adminBroadcast);
  app.get('/api/notifications/admin', requireStaff, requireAdmin, adminList);

  // Wallet
  app.get('/api/wallet', requireCustomer, getWallet);
  app.post('/api/wallet/deposit', requireCustomer, depositWallet);
  app.post('/api/wallet/:customerId/credit', requireStaff, requireAdmin, adminCredit);

  // Cart
  app.get('/api/cart', requireCustomer, getCart);
  app.post('/api/cart', requireCustomer, addToCart);
  app.delete('/api/cart/:productId', requireCustomer, removeFromCart);
  app.delete('/api/cart', requireCustomer, clearCart);

  // Wishlist
  app.get('/api/wishlist', requireCustomer, getWishlist);
  app.post('/api/wishlist', requireCustomer, addToWishlist);
  app.delete('/api/wishlist/:productId', requireCustomer, removeFromWishlist);

  // Coupons
  app.post('/api/coupons/validate', validateCoupon);
  app.get('/api/coupons', requireStaff, requireAdmin, listCoupons);
  app.post('/api/coupons', requireStaff, requireAdmin, createCoupon);

  // Reviews
  app.post('/api/reviews', requireCustomer, createReview);
  app.get('/api/reviews/admin', requireStaff, requireAdmin, adminListReviews);
  app.put('/api/reviews/:id/moderate', requireStaff, requireAdmin, moderateReview);
  app.post('/api/reviews/:id/report', requireCustomer, reportReview);

  // Ads
  app.get('/api/ads/placement/:placement', listActiveByPlacement);
  app.get('/api/ads/admin', requireStaff, requireAdmin, adminListAds);
  app.post('/api/ads', requireStaff, requireAdmin, createAd);
  app.put('/api/ads/:id', requireStaff, requireAdmin, updateAd);
  app.delete('/api/ads/:id', requireStaff, requireAdmin, deleteAd);

  // Fraud
  app.get('/api/fraud/overview', requireStaff, requireAdmin, getFraudOverview);
  app.get('/api/fraud', requireStaff, requireAdmin, listAlerts);
  app.post('/api/fraud/scan', requireStaff, requireAdmin, scanFraud);
  app.post('/api/fraud/:id/resolve', requireStaff, requireAdmin, resolveAlert);
  app.post('/api/fraud/:id/action', requireStaff, requireAdmin, actOnAlert);

  // Platform
  app.get('/api/platform/overview', requireStaff, requireAdmin, getOverview);
  app.get('/api/platform/health', requireStaff, getHealth);
  app.post('/api/platform/backups', requireStaff, requireAdmin, createBackup);
  app.get('/api/platform/backups', requireStaff, requireAdmin, listBackups);
  app.get('/api/platform/backups/:filename', requireStaff, requireAdmin, getBackupInfo);
  app.post('/api/platform/backups/:filename/restore', requireStaff, requireAdmin, restoreBackup);
  app.get('/api/platform/settings', requireStaff, requireAdmin, getSettings);
  app.put('/api/platform/settings', requireStaff, requireAdmin, updateSettings);
}

module.exports = { registerV2Routes };

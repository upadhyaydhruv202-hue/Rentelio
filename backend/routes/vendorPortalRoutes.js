const express = require('express');
const { requireVendor } = require('../middleware/vendorAuth');
const { uploadProductImage } = require('../middleware/upload');
const { login, register } = require('../controllers/vendorAuthController');
const ctrl = require('../controllers/vendorPortalController');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);

router.use(requireVendor);

router.get('/dashboard', ctrl.getDashboard);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);

router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', (req, res, next) => {
  uploadProductImage(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    return ctrl.createProduct(req, res, next);
  });
});
router.put('/products/:id', (req, res, next) => {
  uploadProductImage(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    return ctrl.updateProduct(req, res, next);
  });
});
router.delete('/products/:id', ctrl.deleteProduct);
router.put('/products/:id/archive', ctrl.archiveProduct);
router.put('/products/:id/restore', ctrl.restoreProduct);

router.get('/rentals', ctrl.listRentals);
router.get('/rentals/:id', ctrl.getRental);
router.put('/rentals/:id/status', ctrl.updateRentalStatus);

router.get('/pickup-return/schedule', ctrl.listSchedule);
router.post('/pickup-return/:rentalId/otps', ctrl.generateOtps);
router.post('/pickup-return/:rentalId/verify-pickup', ctrl.verifyPickupOtp);
router.post('/pickup-return/:rentalId/verify-return', ctrl.verifyReturnOtp);
router.post('/pickup-return/:rentalId/advance', ctrl.advanceTracker);
router.post('/pickup-return/scan', ctrl.scanDemo);

router.get('/money/summary', ctrl.getMoneySummary);
router.get('/money/deposits', ctrl.listDeposits);
router.post('/money/deposits/:depositId/request-refund', ctrl.requestRefund);
router.post('/money/deposits/:depositId/approve-refund', ctrl.approveRefund);
router.get('/money/rentals/:rentalId/penalties', ctrl.calcPenalties);
router.get('/money/invoices', ctrl.listInvoices);
router.post('/money/invoices', ctrl.createInvoice);

router.get('/customers', ctrl.listCustomers);

router.get('/coupons', ctrl.listCoupons);
router.post('/coupons', ctrl.createCoupon);
router.put('/coupons/:id', ctrl.updateCoupon);
router.delete('/coupons/:id', ctrl.deleteCoupon);

router.get('/discounts', ctrl.listDiscounts);
router.post('/discounts', ctrl.createDiscount);
router.delete('/discounts/:id', ctrl.deleteDiscount);

router.get('/reports', ctrl.getReports);

router.get('/notifications', ctrl.listNotifications);
router.get('/notifications/unread-count', ctrl.unreadVendorCount);
router.put('/notifications/:id/read', ctrl.markNotificationRead);

module.exports = router;

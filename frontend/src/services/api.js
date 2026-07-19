const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/** Resolve uploaded local paths and absolute URLs for <img src> */
export function productImageSrc(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

async function request(path, options = {}, { auth = false, staff = false } = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (auth) {
    const token = localStorage.getItem('rentelio_customer_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (staff) {
    const token = localStorage.getItem('rentelio_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function toProductFormData(payload = {}, file) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, String(value));
  });
  if (file) fd.append('image', file);
  return fd;
}

/** Admin / staff APIs */
export const api = {
  login: (email, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getDashboard: () => request('/dashboard', {}, { staff: true }),
  getDashboardV2: () => request('/dashboard/v2', {}, { staff: true }),
  getReports: () => request('/dashboard/reports', {}, { staff: true }),
  getProducts: () => request('/products', {}, { staff: true }),
  createProduct: (payload, file) =>
    request(
      '/products',
      { method: 'POST', body: toProductFormData(payload, file) },
      { staff: true }
    ),
  updateProduct: (id, payload, file) =>
    request(
      `/products/${id}`,
      { method: 'PUT', body: toProductFormData(payload, file) },
      { staff: true }
    ),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }, { staff: true }),
  archiveProduct: (id) =>
    request(`/products/${id}/archive`, { method: 'PUT' }, { staff: true }),
  restoreProduct: (id) =>
    request(`/products/${id}/restore`, { method: 'PUT' }, { staff: true }),

  getRentals: () => request('/rentals', {}, { staff: true }),
  createRental: (payload) =>
    request('/rentals', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  updateRental: (id, payload) =>
    request(`/rentals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { staff: true }),

  getPendingReturns: () => request('/rentals/returns/pending', {}, { staff: true }),
  getDeposits: () => request('/rentals/deposits/all', {}, { staff: true }),
  updateDeposit: (id, status) =>
    request(
      `/rentals/deposits/${id}`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      { staff: true }
    ),

  // Quotations
  getQuotations: () => request('/quotations', {}, { staff: true }),
  createQuotation: (payload) =>
    request('/quotations', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  counterQuotation: (id, counterAmount, notes) =>
    request(
      `/quotations/${id}/counter`,
      { method: 'POST', body: JSON.stringify({ counterAmount, notes }) },
      { staff: true }
    ),
  approveQuotation: (id) =>
    request(`/quotations/${id}/approve`, { method: 'POST' }, { staff: true }),
  rejectQuotation: (id) =>
    request(`/quotations/${id}/reject`, { method: 'POST' }, { staff: true }),

  // Money workflow
  getWalletSummary: () => request('/money/wallet-summary', {}, { staff: true }),
  getDepositHistory: (depositId) =>
    request(
      `/money/deposits${depositId ? `?depositId=${depositId}` : ''}`,
      {},
      { staff: true }
    ),
  requestRefund: (depositId) =>
    request(`/money/deposits/${depositId}/request-refund`, { method: 'POST' }, { staff: true }),
  approveRefund: (depositId) =>
    request(`/money/deposits/${depositId}/approve-refund`, { method: 'POST' }, { staff: true }),
  calcPenalties: (rentalId) =>
    request(`/money/rentals/${rentalId}/penalties`, {}, { staff: true }),

  // Pickup & return
  getPickupSchedule: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/pickup-return/schedule${qs ? `?${qs}` : ''}`, {}, { staff: true });
  },
  generateOtps: (rentalId) =>
    request(`/pickup-return/${rentalId}/otps`, { method: 'POST' }, { staff: true }),
  verifyPickupOtp: (rentalId, otp) =>
    request(
      `/pickup-return/${rentalId}/verify-pickup`,
      { method: 'POST', body: JSON.stringify({ otp }) },
      { staff: true }
    ),
  verifyReturnOtp: (rentalId, otp) =>
    request(
      `/pickup-return/${rentalId}/verify-return`,
      { method: 'POST', body: JSON.stringify({ otp }) },
      { staff: true }
    ),
  advanceTracker: (rentalId, stage) =>
    request(
      `/pickup-return/${rentalId}/advance`,
      { method: 'POST', body: JSON.stringify({ stage }) },
      { staff: true }
    ),
  setPickupSchedule: (rentalId, payload) =>
    request(
      `/pickup-return/${rentalId}/schedule`,
      { method: 'PUT', body: JSON.stringify(payload) },
      { staff: true }
    ),

  // Vendors
  getVendors: () => request('/vendors', {}, { staff: true }),
  createVendor: (payload) =>
    request('/vendors', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  updateVendor: (id, payload) =>
    request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { staff: true }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }, { staff: true }),
  verifyVendor: (id) => request(`/vendors/${id}/verify`, { method: 'POST' }, { staff: true }),
  approveVendor: (id) => request(`/vendors/${id}/approve`, { method: 'POST' }, { staff: true }),
  blacklistVendor: (id) =>
    request(`/vendors/${id}/blacklist`, { method: 'POST' }, { staff: true }),
  updateVendorPerformance: (id, performance) =>
    request(
      `/vendors/${id}/performance`,
      { method: 'PUT', body: JSON.stringify({ performance }) },
      { staff: true }
    ),
  getVendorPayouts: () => request('/vendors/payouts/summary', {}, { staff: true }),

  // Super Admin control center
  getControlCenter: () => request('/super-admin/overview', {}, { staff: true }),
  getSuperAdminVendors: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/super-admin/vendors${q ? `?${q}` : ''}`, {}, { staff: true });
  },
  getSuperAdminUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/super-admin/users${q ? `?${q}` : ''}`, {}, { staff: true });
  },
  runVendorKyc: (id) =>
    request(`/super-admin/vendors/${id}/kyc-scan`, { method: 'POST' }, { staff: true }),
  vendorKycDecision: (id, decision, notes) =>
    request(
      `/super-admin/vendors/${id}/kyc-decision`,
      { method: 'POST', body: JSON.stringify({ decision, notes }) },
      { staff: true }
    ),

  // Settlements
  getSettlementDashboard: () => request('/settlements/dashboard', {}, { staff: true }),
  getSettlements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/settlements${q ? `?${q}` : ''}`, {}, { staff: true });
  },
  settlementAction: (id, action, note) =>
    request(
      `/settlements/${id}/action`,
      { method: 'POST', body: JSON.stringify({ action, note }) },
      { staff: true }
    ),

  // Admin users
  getCustomers: () => request('/admin/users', {}, { staff: true }),
  setCustomerStatus: (id, status) =>
    request(
      `/admin/users/${id}/status`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      { staff: true }
    ),
  verifyCustomerIdentity: (id) =>
    request(`/admin/users/${id}/verify-identity`, { method: 'POST' }, { staff: true }),

  // Notifications (admin)
  getAdminNotifications: () => request('/notifications/admin', {}, { staff: true }),
  broadcastNotification: (payload) =>
    request('/notifications/broadcast', { method: 'POST', body: JSON.stringify(payload) }, {
      staff: true,
    }),

  // Reviews (admin)
  getAdminReviews: (status) =>
    request(`/reviews/admin${status ? `?status=${status}` : ''}`, {}, { staff: true }),
  moderateReview: (id, status) =>
    request(
      `/reviews/${id}/moderate`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      { staff: true }
    ),

  // Ads
  getAdminAds: () => request('/ads/admin', {}, { staff: true }),
  createAd: (payload) =>
    request('/ads', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  updateAd: (id, payload) =>
    request(`/ads/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { staff: true }),
  deleteAd: (id) => request(`/ads/${id}`, { method: 'DELETE' }, { staff: true }),

  // Fraud
  getFraudOverview: () => request('/fraud/overview', {}, { staff: true }),
  getFraudAlerts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fraud${q ? `?${q}` : ''}`, {}, { staff: true });
  },
  scanFraud: () => request('/fraud/scan', { method: 'POST' }, { staff: true }),
  resolveFraud: (id, actionTaken) =>
    request(
      `/fraud/${id}/resolve`,
      { method: 'POST', body: JSON.stringify({ actionTaken }) },
      { staff: true }
    ),
  fraudAction: (id, action) =>
    request(`/fraud/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }, {
      staff: true,
    }),

  // Platform
  getPlatformOverview: () => request('/platform/overview', {}, { staff: true }),
  getPlatformHealth: () => request('/platform/health', {}, { staff: true }),
  createBackup: (payload = {}) =>
    request('/platform/backups', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  listBackups: () => request('/platform/backups', {}, { staff: true }),
  restoreBackup: (filename) =>
    request(`/platform/backups/${filename}/restore`, { method: 'POST' }, { staff: true }),
  getPlatformSettings: () => request('/platform/settings', {}, { staff: true }),
  updatePlatformSettings: (payload) =>
    request('/platform/settings', { method: 'PUT', body: JSON.stringify(payload) }, { staff: true }),

  // Coupons
  getCoupons: () => request('/coupons', {}, { staff: true }),
  createCoupon: (payload) =>
    request('/coupons', { method: 'POST', body: JSON.stringify(payload) }, { staff: true }),
  adminCreditWallet: (customerId, amount, note) =>
    request(
      `/wallet/${customerId}/credit`,
      { method: 'POST', body: JSON.stringify({ amount, note }) },
      { staff: true }
    ),
};

/** Customer storefront APIs */
export const userApi = {
  register: (payload) =>
    request('/user/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) =>
    request('/user/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getDashboard: () => request('/user/dashboard', {}, { auth: true }),
  getProfile: () => request('/user/profile', {}, { auth: true }),
  updateProfile: (payload) =>
    request('/user/profile', { method: 'PUT', body: JSON.stringify(payload) }, { auth: true }),

  getProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/user/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/user/products/${id}`),

  createRental: (payload) =>
    request('/user/rentals', { method: 'POST', body: JSON.stringify(payload) }, { auth: true }),
  getRentals: () => request('/user/rentals', {}, { auth: true }),
  getRental: (id) => request(`/user/rentals/${id}`, {}, { auth: true }),
  cancelRental: (id) =>
    request(`/user/rentals/${id}/cancel`, { method: 'PUT' }, { auth: true }),

  getCart: () => request('/cart', {}, { auth: true }),
  addToCart: (productId, quantity = 1) =>
    request('/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) }, { auth: true }),
  removeFromCart: (productId) =>
    request(`/cart/${productId}`, { method: 'DELETE' }, { auth: true }),
  clearCart: () => request('/cart', { method: 'DELETE' }, { auth: true }),

  getWishlist: () => request('/wishlist', {}, { auth: true }),
  addToWishlist: (productId) =>
    request('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) }, { auth: true }),
  removeFromWishlist: (productId) =>
    request(`/wishlist/${productId}`, { method: 'DELETE' }, { auth: true }),

  getWallet: () => request('/wallet', {}, { auth: true }),
  depositWallet: (payload) =>
    request('/wallet/deposit', { method: 'POST', body: JSON.stringify(payload) }, { auth: true }),
  getNotifications: () => request('/notifications', {}, { auth: true }),
  getUnreadNotificationCount: () =>
    request('/notifications/unread-count', {}, { auth: true }),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, { method: 'PUT' }, { auth: true }),

  validateCoupon: (code, amount, productId) =>
    request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount, productId }),
    }),

  createReview: (payload) =>
    request('/reviews', { method: 'POST', body: JSON.stringify(payload) }, { auth: true }),
  reportReview: (id) => request(`/reviews/${id}/report`, { method: 'POST' }, { auth: true }),

  getAds: (placement) => request(`/ads/placement/${placement}`),
};

export const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

/** Security Deposit = Rental Price Per Day × 1.5 */
export const DEPOSIT_MULTIPLIER = 1.5;

export function calcSecurityDeposit(pricePerDay) {
  const price = Number(pricePerDay);
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.round(price * DEPOSIT_MULTIPLIER * 100) / 100;
}

/** Prefer stored product.securityDeposit; fall back to 1.5× rule */
export function productDeposit(product) {
  if (!product) return 0;
  if (product.securityDeposit != null && product.securityDeposit !== '') {
    return Number(product.securityDeposit);
  }
  return calcSecurityDeposit(product.pricePerDay);
}

/** Prefer stored hourly rate; fall back to daily / 8 */
export function productHourlyRate(product) {
  if (!product) return 0;
  const stored = Number(product.pricePerHour);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const daily = Number(product.pricePerDay);
  if (!Number.isFinite(daily) || daily <= 0) return 0;
  return Math.max(1, Math.round((daily / 8) * 100) / 100);
}

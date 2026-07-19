const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  const token = localStorage.getItem('rentelio_vendor_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/vendor${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function toFormData(payload = {}, file) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, String(value));
  });
  if (file) fd.append('image', file);
  return fd;
}

export const vendorApi = {
  login: (email, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) =>
    request('/register', { method: 'POST', body: JSON.stringify(payload) }),

  getDashboard: () => request('/dashboard'),
  getProfile: () => request('/profile'),
  updateProfile: (payload) =>
    request('/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  getProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload, file) =>
    request('/products', { method: 'POST', body: toFormData(payload, file) }),
  updateProduct: (id, payload, file) =>
    request(`/products/${id}`, { method: 'PUT', body: toFormData(payload, file) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  archiveProduct: (id) => request(`/products/${id}/archive`, { method: 'PUT' }),
  restoreProduct: (id) => request(`/products/${id}/restore`, { method: 'PUT' }),

  getRentals: () => request('/rentals'),
  getRental: (id) => request(`/rentals/${id}`),
  updateRentalStatus: (id, status) =>
    request(`/rentals/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getSchedule: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/pickup-return/schedule${qs ? `?${qs}` : ''}`);
  },
  generateOtps: (rentalId) =>
    request(`/pickup-return/${rentalId}/otps`, { method: 'POST' }),
  verifyPickupOtp: (rentalId, otp) =>
    request(`/pickup-return/${rentalId}/verify-pickup`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
  verifyReturnOtp: (rentalId, payload) =>
    request(`/pickup-return/${rentalId}/verify-return`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  advanceTracker: (rentalId, stage) =>
    request(`/pickup-return/${rentalId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  getMoneySummary: () => request('/money/summary'),
  getDeposits: () => request('/money/deposits'),
  requestRefund: (id) => request(`/money/deposits/${id}/request-refund`, { method: 'POST' }),
  approveRefund: (id) => request(`/money/deposits/${id}/approve-refund`, { method: 'POST' }),
  calcPenalties: (rentalId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/money/rentals/${rentalId}/penalties${qs ? `?${qs}` : ''}`);
  },
  getInvoices: () => request('/money/invoices'),
  createInvoice: (payload) =>
    request('/money/invoices', { method: 'POST', body: JSON.stringify(payload) }),

  getCustomers: () => request('/customers'),
  getCoupons: () => request('/coupons'),
  createCoupon: (payload) =>
    request('/coupons', { method: 'POST', body: JSON.stringify(payload) }),
  updateCoupon: (id, payload) =>
    request(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),

  getDiscounts: () => request('/discounts'),
  createDiscount: (payload) =>
    request('/discounts', { method: 'POST', body: JSON.stringify(payload) }),
  deleteDiscount: (id) => request(`/discounts/${id}`, { method: 'DELETE' }),

  getReports: () => request('/reports'),
  getNotifications: () => request('/notifications'),
  getUnreadNotificationCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
};

/** Canonical app roles — User (customer), Vendor, Super Admin */
export const ROLES = {
  USER: 'user',
  VENDOR: 'vendor',
  SUPER_ADMIN: 'admin',
};

export const DASHBOARDS = {
  [ROLES.USER]: '/user/dashboard',
  [ROLES.VENDOR]: '/vendor/dashboard',
  [ROLES.SUPER_ADMIN]: '/admin/dashboard',
};

export const STORAGE_KEYS = {
  adminUser: 'rentelio_user',
  adminToken: 'rentelio_token',
  customer: 'rentelio_customer',
  customerToken: 'rentelio_customer_token',
  vendor: 'rentelio_vendor',
  vendorToken: 'rentelio_vendor_token',
  theme: 'rentelio_theme',
};

export function dashboardForRole(role) {
  return DASHBOARDS[role] || '/user/login';
}

export function readJsonStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

/**
 * Portals may stay logged in at the same time so User / Vendor / Super Admin
 * can run in separate browser tabs during demos.
 * Only clear the portal being logged out — never wipe sibling sessions.
 */
export function clearPortalSession(portal) {
  if (portal === 'admin') {
    localStorage.removeItem(STORAGE_KEYS.adminUser);
    localStorage.removeItem(STORAGE_KEYS.adminToken);
  } else if (portal === 'user') {
    localStorage.removeItem(STORAGE_KEYS.customer);
    localStorage.removeItem(STORAGE_KEYS.customerToken);
  } else if (portal === 'vendor') {
    localStorage.removeItem(STORAGE_KEYS.vendor);
    localStorage.removeItem(STORAGE_KEYS.vendorToken);
  }
}

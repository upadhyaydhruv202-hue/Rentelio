import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import UserLayout from './components/UserLayout';
import VendorLayout from './components/VendorLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Vendors from './pages/Vendors';
import UsersAdmin from './pages/UsersAdmin';
import Platform from './pages/Platform';
import NotificationsAdmin from './pages/NotificationsAdmin';
import Settings from './pages/Settings';
import Payouts from './pages/Payouts';
import UserLogin from './pages/User/UserLogin';
import UserRegister from './pages/User/UserRegister';
import UserDashboard from './pages/User/UserDashboard';
import ProductBrowse from './pages/User/ProductBrowse';
import ProductDetails from './pages/User/ProductDetails';
import Checkout from './pages/User/Checkout';
import MyRentals from './pages/User/MyRentals';
import RentalDetails from './pages/User/RentalDetails';
import UserProfile from './pages/User/UserProfile';
import UserPayments from './pages/User/UserPayments';
import Cart from './pages/User/Cart';
import Wishlist from './pages/User/Wishlist';
import Wallet from './pages/User/Wallet';
import Notifications from './pages/User/Notifications';
import Compare from './pages/User/Compare';
import VendorLogin from './pages/Vendor/VendorLogin';
import VendorDashboard from './pages/Vendor/VendorDashboard';
import VendorInventory from './pages/Vendor/VendorInventory';
import VendorPickupReturn from './pages/Vendor/VendorPickupReturn';
import VendorMoney from './pages/Vendor/VendorMoney';
import VendorOrders from './pages/Vendor/VendorOrders';
import VendorCustomers from './pages/Vendor/VendorCustomers';
import VendorDiscounts from './pages/Vendor/VendorDiscounts';
import VendorCoupons from './pages/Vendor/VendorCoupons';
import VendorReports from './pages/Vendor/VendorReports';
import VendorNotifications from './pages/Vendor/VendorNotifications';
import VendorProfile from './pages/Vendor/VendorProfile';
import Landing from './pages/Landing';
import {
  clearPortalSession,
  DASHBOARDS,
  readJsonStorage,
  ROLES,
  STORAGE_KEYS,
} from './lib/authRoles';

function homePath({ admin, vendor, customer }) {
  if (admin?.role === ROLES.SUPER_ADMIN) return DASHBOARDS[ROLES.SUPER_ADMIN];
  if (vendor) return DASHBOARDS[ROLES.VENDOR];
  if (customer) return DASHBOARDS[ROLES.USER];
  return '/';
}

function App() {
  const [admin, setAdmin] = useState(() => readJsonStorage(STORAGE_KEYS.adminUser));
  const [customer, setCustomer] = useState(() => readJsonStorage(STORAGE_KEYS.customer));
  const [vendor, setVendor] = useState(() => readJsonStorage(STORAGE_KEYS.vendor));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) === 'dark');
  // Always play splash on load, refresh, and every login
  const [showSplash, setShowSplash] = useState(true);
  const [splashKey, setSplashKey] = useState(0);

  const replaySplash = useCallback(() => {
    setSplashKey((k) => k + 1);
    setShowSplash(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_KEYS.theme, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Keep auth + theme in sync when User / Vendor / Admin run in other browser tabs
  useEffect(() => {
    const syncFromStorage = (event) => {
      if (!event.key) {
        setAdmin(readJsonStorage(STORAGE_KEYS.adminUser));
        setCustomer(readJsonStorage(STORAGE_KEYS.customer));
        setVendor(readJsonStorage(STORAGE_KEYS.vendor));
        setDarkMode(localStorage.getItem(STORAGE_KEYS.theme) === 'dark');
        return;
      }

      if (event.key === STORAGE_KEYS.adminUser || event.key === STORAGE_KEYS.adminToken) {
        setAdmin(readJsonStorage(STORAGE_KEYS.adminUser));
      }
      if (event.key === STORAGE_KEYS.customer || event.key === STORAGE_KEYS.customerToken) {
        setCustomer(readJsonStorage(STORAGE_KEYS.customer));
      }
      if (event.key === STORAGE_KEYS.vendor || event.key === STORAGE_KEYS.vendorToken) {
        setVendor(readJsonStorage(STORAGE_KEYS.vendor));
      }
      if (event.key === STORAGE_KEYS.theme) {
        setDarkMode(event.newValue === 'dark');
      }
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleAdminLogin = (userData, token) => {
    setAdmin(userData);
    localStorage.setItem(STORAGE_KEYS.adminUser, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.adminToken, token);
    replaySplash();
  };

  const handleAdminLogout = () => {
    setAdmin(null);
    clearPortalSession('admin');
    replaySplash();
  };

  const handleCustomerLogin = (customerData, token) => {
    const withRole = { ...customerData, role: ROLES.USER, roleLabel: 'User' };
    setCustomer(withRole);
    localStorage.setItem(STORAGE_KEYS.customer, JSON.stringify(withRole));
    localStorage.setItem(STORAGE_KEYS.customerToken, token);
    replaySplash();
  };

  const handleCustomerLogout = () => {
    setCustomer(null);
    clearPortalSession('user');
    replaySplash();
  };

  const handleCustomerUpdate = (updated) => {
    const withRole = { ...updated, role: ROLES.USER, roleLabel: 'User' };
    setCustomer(withRole);
    localStorage.setItem(STORAGE_KEYS.customer, JSON.stringify(withRole));
  };

  const handleVendorLogin = (vendorData, token) => {
    const withRole = { ...vendorData, role: ROLES.VENDOR, roleLabel: 'Vendor' };
    setVendor(withRole);
    localStorage.setItem(STORAGE_KEYS.vendor, JSON.stringify(withRole));
    localStorage.setItem(STORAGE_KEYS.vendorToken, token);
    replaySplash();
  };

  const handleVendorLogout = () => {
    setVendor(null);
    clearPortalSession('vendor');
    replaySplash();
  };

  const handleVendorUpdate = (updated) => {
    const withRole = { ...updated, role: ROLES.VENDOR, roleLabel: 'Vendor' };
    setVendor(withRole);
    localStorage.setItem(STORAGE_KEYS.vendor, JSON.stringify(withRole));
  };

  const toggleTheme = () => setDarkMode((v) => !v);

  return (
    <BrowserRouter>
      {showSplash && <SplashScreen key={splashKey} onComplete={handleSplashComplete} />}

      <Routes>
        <Route path="/" element={<Landing admin={admin} vendor={vendor} customer={customer} />} />
        {/* Super Admin */}
        <Route
          path="/admin/login"
          element={
            admin?.role === ROLES.SUPER_ADMIN ? (
              <Navigate to={DASHBOARDS[ROLES.SUPER_ADMIN]} replace />
            ) : (
              <Login onLogin={handleAdminLogin} />
            )
          }
        />
        <Route
          element={
            <Layout
              user={admin}
              darkMode={darkMode}
              onToggleTheme={toggleTheme}
              onLogout={handleAdminLogout}
            />
          }
        >
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/inventory" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/products" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/rentals" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/returns" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/pickup-return" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/money" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/deposits" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/vendors" element={<Vendors />} />
          <Route path="/admin/users" element={<UsersAdmin />} />
          <Route path="/admin/payouts" element={<Payouts />} />
          <Route path="/admin/fraud" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/platform" element={<Platform />} />
          <Route path="/admin/notifications" element={<NotificationsAdmin />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
        <Route path="/admin" element={<Navigate to={DASHBOARDS[ROLES.SUPER_ADMIN]} replace />} />

        {/* User (Customer) */}
        <Route
          path="/user/login"
          element={
            customer ? (
              <Navigate to={DASHBOARDS[ROLES.USER]} replace />
            ) : (
              <UserLogin onLogin={handleCustomerLogin} />
            )
          }
        />
        <Route
          path="/user/register"
          element={
            customer ? (
              <Navigate to={DASHBOARDS[ROLES.USER]} replace />
            ) : (
              <UserRegister onLogin={handleCustomerLogin} />
            )
          }
        />
        <Route
          element={
            <UserLayout
              customer={customer}
              darkMode={darkMode}
              onToggleTheme={toggleTheme}
              onLogout={handleCustomerLogout}
            />
          }
        >
          <Route path="/user/dashboard" element={<UserDashboard customer={customer} />} />
          <Route path="/user/browse" element={<ProductBrowse />} />
          <Route path="/user/products/:id" element={<ProductDetails />} />
          <Route path="/user/checkout" element={<Checkout />} />
          <Route path="/user/cart" element={<Cart />} />
          <Route path="/user/wishlist" element={<Wishlist />} />
          <Route path="/user/wallet" element={<Wallet />} />
          <Route path="/user/notifications" element={<Notifications />} />
          <Route path="/user/compare" element={<Compare />} />
          <Route path="/user/rentals" element={<MyRentals />} />
          <Route path="/user/rentals/:id" element={<RentalDetails />} />
          <Route path="/user/payments" element={<UserPayments />} />
          <Route
            path="/user/profile"
            element={<UserProfile customer={customer} onUpdate={handleCustomerUpdate} />}
          />
        </Route>
        <Route path="/user" element={<Navigate to={DASHBOARDS[ROLES.USER]} replace />} />

        {/* Vendor */}
        <Route
          path="/vendor/login"
          element={
            vendor ? (
              <Navigate to={DASHBOARDS[ROLES.VENDOR]} replace />
            ) : (
              <VendorLogin onLogin={handleVendorLogin} />
            )
          }
        />
        <Route
          element={
            <VendorLayout
              vendor={vendor}
              darkMode={darkMode}
              onToggleTheme={toggleTheme}
              onLogout={handleVendorLogout}
            />
          }
        >
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/inventory" element={<VendorInventory />} />
          <Route path="/vendor/pickup-return" element={<VendorPickupReturn />} />
          <Route path="/vendor/money" element={<VendorMoney />} />
          <Route path="/vendor/orders" element={<VendorOrders />} />
          <Route path="/vendor/customers" element={<VendorCustomers />} />
          <Route path="/vendor/discounts" element={<VendorDiscounts />} />
          <Route path="/vendor/coupons" element={<VendorCoupons />} />
          <Route path="/vendor/reports" element={<VendorReports />} />
          <Route path="/vendor/notifications" element={<VendorNotifications />} />
          <Route
            path="/vendor/profile"
            element={<VendorProfile onUpdate={handleVendorUpdate} />}
          />
        </Route>
        <Route path="/vendor" element={<Navigate to={DASHBOARDS[ROLES.VENDOR]} replace />} />

        {/* Legacy redirects */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/products" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/rentals" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/returns" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/pickup-return" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/money" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/deposits" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/vendors" element={<Navigate to="/admin/vendors" replace />} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/payouts" element={<Navigate to="/admin/payouts" replace />} />
        <Route path="/fraud" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        <Route path="/platform" element={<Navigate to="/admin/platform" replace />} />
        <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/shop/login" element={<Navigate to="/user/login" replace />} />
        <Route path="/shop/register" element={<Navigate to="/user/register" replace />} />
        <Route path="/shop/*" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="/shop" element={<Navigate to="/user/dashboard" replace />} />

        <Route
          path="*"
          element={<Navigate to={homePath({ admin, vendor, customer })} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RentelioLogo from './RentelioLogo';
import SearchBar from './SearchBar';
import { userApi } from '../services/api';
import { POLL_MS } from '../lib/query';

export default function UserNavbar({ customer, onLogout, darkMode, onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep top search in sync with browse URL so you never re-type the same query
  useEffect(() => {
    if (location.pathname.startsWith('/user/browse')) {
      setQ(searchParams.get('search') || '');
    }
  }, [location.pathname, searchParams]);

  const { data: unread } = useQuery({
    queryKey: ['user', 'notifications', 'unread'],
    queryFn: userApi.getUnreadNotificationCount,
    refetchInterval: POLL_MS,
  });
  const unreadCount = unread?.count || 0;

  const runGlobalSearch = (value) => {
    const term = String(value ?? q).trim();
    setQ(term);
    const next = new URLSearchParams();
    if (term) next.set('search', term);
    if (location.pathname.startsWith('/user/browse')) {
      ['category', 'brand', 'sort', 'minPrice', 'maxPrice'].forEach((key) => {
        const v = searchParams.get(key);
        if (v) next.set(key, v);
      });
    }
    navigate(`/user/browse?${next.toString()}`);
    setMenuOpen(false);
  };

  const links = [
    { to: '/user/dashboard', label: 'Home', end: true },
    { to: '/user/browse', label: 'Browse' },
    { to: '/user/cart', label: 'Cart' },
    { to: '/user/wishlist', label: 'Wishlist' },
    { to: '/user/wallet', label: 'Wallet' },
    { to: '/user/rentals', label: 'Rentals' },
    { to: '/user/payments', label: 'Payments' },
    { to: '/user/compare', label: 'Compare' },
    { to: '/user/notifications', label: 'Alerts', badge: unreadCount },
    { to: '/user/profile', label: 'Profile' },
  ];

  return (
    <header className="sticky top-0 z-40 mx-3 mt-3 rounded-2xl nav-glass text-ink-900 shadow-lg dark:text-white lg:mx-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
        <Link to="/user/dashboard" className="shrink-0">
          <RentelioLogo size="sm" spin colorClass="text-brand-700 dark:text-brand-300" />
        </Link>

        <div className="order-3 w-full md:order-none md:mx-4 md:flex-1 md:max-w-xl">
          <SearchBar
            value={q}
            onChange={setQ}
            onSubmit={runGlobalSearch}
            placeholder="Search cameras, drones, laptops…"
          />
        </div>

        <nav className="ml-auto hidden max-w-3xl flex-wrap items-center justify-end gap-0.5 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `nav-link-living relative rounded-lg px-2 py-1.5 text-xs transition xl:text-sm ${
                  isActive
                    ? 'is-active'
                    : 'text-ink-600 hover:bg-brand-500/10 dark:text-ink-300'
                }`
              }
            >
              {link.label}
              {link.badge > 0 && (
                <span className="ml-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-living rounded-lg border border-brand-500/20 px-3 py-1.5 text-sm"
            aria-label="Toggle theme"
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <span className="hidden text-sm text-ink-500 dark:text-ink-400 sm:inline">
            {`Hi, ${customer?.name?.split(' ')[0] || 'Guest'}`}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="btn-living rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Logout
          </button>
          <button
            type="button"
            className="btn-living relative rounded-lg border border-brand-500/20 px-3 py-1.5 text-sm lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-dock border-t border-brand-500/10 px-4 py-2 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-brand-500/10 dark:text-ink-300"
            >
              <span>{link.label}</span>
              {link.badge > 0 && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {link.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}

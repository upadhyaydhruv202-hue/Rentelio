import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import PortalRoute from './PortalRoute';
import AmbientField from './AmbientField';
import PageReveal from './PageReveal';
import PortalSplash from './PortalSplash';
import { useRealtime } from '../hooks/useRealtime';

export default function UserLayout({ customer, onLogout, darkMode, onToggleTheme }) {
  useRealtime({ portal: 'user' });

  return (
    <PortalRoute portal="user" customer={customer}>
      <div className="living-shell min-h-screen text-ink-900 dark:text-ink-100">
        <PortalSplash portal="user" label="User Portal" />
        <AmbientField />
        <div className="living-content">
          <UserNavbar
            customer={customer}
            onLogout={onLogout}
            darkMode={darkMode}
            onToggleTheme={onToggleTheme}
          />
          <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
            <PageReveal>
              <Outlet />
            </PageReveal>
          </main>
          <footer className="border-t border-brand-500/10 py-6 text-center text-xs text-ink-400">
            Rentelio · Living rental universe · Don&apos;t get Mental, Just do Rental
          </footer>
        </div>
      </div>
    </PortalRoute>
  );
}

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import VendorSidebar from './VendorSidebar';
import PortalRoute from './PortalRoute';
import AmbientField from './AmbientField';
import PageReveal from './PageReveal';
import PortalSplash from './PortalSplash';
import { useRealtime } from '../hooks/useRealtime';

export default function VendorLayout({ vendor, darkMode, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  useRealtime({ portal: 'vendor' });

  return (
    <PortalRoute portal="vendor" vendor={vendor}>
      <div className="living-shell flex min-h-screen text-ink-900 dark:text-ink-100">
        <PortalSplash portal="vendor" label="Vendor workspace" />
        <AmbientField />
        <div className="living-content flex min-h-screen w-full">
          <VendorSidebar open={open} onClose={() => setOpen(false)} vendor={vendor} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 mx-3 mt-3 flex h-16 items-center justify-between rounded-2xl px-4 nav-glass lg:mx-4 lg:px-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="btn-living rounded-xl border border-brand-500/20 px-3 py-1.5 text-sm lg:hidden"
                >
                  Menu
                </button>
                <div className="hidden sm:block">
                  <p className="text-xs text-ink-500">Vendor workspace</p>
                  <p className="font-display text-sm font-semibold">{vendor?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="btn-living rounded-xl border border-brand-500/20 px-3 py-2 text-sm"
                >
                  {darkMode ? 'Light' : 'Dark'}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="btn-living rounded-xl bg-ink-900 px-3 py-2 text-sm text-white dark:bg-brand-600"
                >
                  Logout
                </button>
              </div>
            </header>
            <main className="flex-1 p-4 lg:p-6">
              <PageReveal>
                <Outlet />
              </PageReveal>
            </main>
          </div>
        </div>
      </div>
    </PortalRoute>
  );
}

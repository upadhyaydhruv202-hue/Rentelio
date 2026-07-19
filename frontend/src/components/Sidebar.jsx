import { NavLink } from 'react-router-dom';
import RentelioLogo from './RentelioLogo';

export default function Sidebar({ open, onClose }) {
  const sections = [
    {
      label: 'Control',
      links: [
        { to: '/admin/dashboard', label: 'Overview', end: true },
        { to: '/admin/platform', label: 'System Health' },
      ],
    },
    {
      label: 'Marketplace',
      links: [
        { to: '/admin/vendors', label: 'Vendors & KYC' },
        { to: '/admin/users', label: 'Users' },
      ],
    },
    {
      label: 'Finance',
      links: [
        { to: '/admin/payouts', label: 'Payouts' },
        { to: '/admin/reports', label: 'Reports' },
      ],
    },
    {
      label: 'Platform',
      links: [
        { to: '/admin/notifications', label: 'Notifications' },
        { to: '/admin/settings', label: 'Settings' },
      ],
    },
  ];

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label={'Close menu'}
        />
      )}

      <aside
        className={`fixed inset-y-3 left-3 z-50 flex w-[15.5rem] flex-col rounded-3xl nav-glass transition-transform lg:static lg:my-3 lg:ml-3 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
        <div className="border-b border-brand-500/10 px-5 py-6">
          <RentelioLogo
            size="sm"
            showTagline
            spin
            colorClass="text-brand-700 dark:text-brand-300"
            taglineClass="!mt-1.5 !text-ink-500 dark:!text-ink-400 !tracking-normal"
          />
          <span className="mt-3 inline-flex rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800 dark:text-brand-300">
            {'Super Admin OS'}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link-living rounded-xl px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? 'is-active'
                          : 'text-ink-600 hover:bg-brand-500/10 dark:text-ink-300 dark:hover:bg-brand-500/10'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-brand-500/10 p-4 text-xs text-ink-400">
          {'Living control center'}
        </div>
      </aside>
    </>
  );
}

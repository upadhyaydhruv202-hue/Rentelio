import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RentelioLogo from '../components/RentelioLogo';
import { ROLES } from '../lib/authRoles';

function RevealSection({ children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={`parallax-section ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </section>
  );
}

export default function Landing({ admin, vendor, customer }) {
  const [phase, setPhase] = useState(0);

  const floaters = [
    { label: 'Cameras', emoji: '◎', delay: '0s' },
    { label: 'Homes', emoji: '◇', delay: '0.35s' },
    { label: 'Vehicles', emoji: '◈', delay: '0.7s' },
    { label: 'Gear', emoji: '△', delay: '1.05s' },
    { label: 'Packages', emoji: '□', delay: '1.4s' },
  ];

  const portals = [
    {
      title: 'Users',
      body: 'Browse, book, wallet, and track rentals in a fluid storefront.',
      to: customer ? '/user/dashboard' : '/user/login',
      ready: Boolean(customer),
    },
    {
      title: 'Vendors',
      body: 'Inventory, pickup OTP, settlements, and performance in Seller Central.',
      to: vendor ? '/vendor/dashboard' : '/vendor/login',
      ready: Boolean(vendor),
    },
    {
      title: 'Super Admin',
      body: 'KYC, payouts, health, and command-center analytics.',
      to: admin?.role === ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/admin/login',
      ready: admin?.role === ROLES.SUPER_ADMIN,
    },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="landing-root">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 splash-bg" />
        <div className="living-atmosphere__aurora opacity-60" />
        <div className="living-atmosphere__grid opacity-40" />
        <div className="splash-orb splash-orb-a" />
        <div className="splash-orb splash-orb-b" />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <RentelioLogo size="md" spin colorClass="text-white" showTagline={false} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to={customer ? '/user/dashboard' : '/user/login'}
            className="btn-living rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90"
          >
            {customer ? 'User dashboard' : 'User'}
          </Link>
          <Link
            to={vendor ? '/vendor/dashboard' : '/vendor/login'}
            className="btn-living rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90"
          >
            {vendor ? 'Vendor dashboard' : 'Vendor'}
          </Link>
          <Link
            to={admin?.role === ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/admin/login'}
            className="btn-living rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-ink-950"
          >
            {admin?.role === ROLES.SUPER_ADMIN ? 'Admin OS' : 'Super Admin'}
          </Link>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-5.5rem)] items-center justify-center px-5 pb-16 pt-6 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div
            className={`relative ${
              phase >= 1 ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-700`}
          >
            {phase >= 1 && <div className="landing-hero-ring" aria-hidden="true" />}
            <RentelioLogo
              size="hero"
              spin
              centered
              colorClass="text-white"
              showTagline={false}
            />
          </div>

          {phase >= 1 && (
            <h1 className="mt-6 font-display text-2xl font-semibold leading-snug tracking-tight text-white sm:text-4xl md:text-5xl login-enter">
              Don&apos;t get Mental, Just do Rental
            </h1>
          )}

          {phase >= 2 && (
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 login-enter sm:text-lg">
              {'An intelligent rental operating system — inventory, settlements, verification, and trust in one living interface.'}
            </p>
          )}

          {phase >= 2 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 login-enter">
              <Link
                to="/user/login"
                className="btn-living rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-ink-950"
              >
                {'Enter marketplace'}
              </Link>
              <Link
                to="/user/register"
                className="btn-living rounded-2xl border border-white/25 px-6 py-3 text-sm font-medium text-white"
              >
                {'Create account'}
              </Link>
            </div>
          )}

          {phase >= 3 && (
            <div className="mt-14 flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-3">
              {floaters.map((f) => (
                <div
                  key={f.label}
                  className="float-orb-tile flex w-[6.5rem] flex-col items-center justify-center px-3 py-4 sm:w-[7.25rem]"
                  style={{ animationDelay: f.delay }}
                >
                  <div className="font-display text-2xl text-cyber-400">{f.emoji}</div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-white/65">
                    {f.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-24 px-5 py-24 text-center md:px-8">
        <RevealSection>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-300">
            {'Ecosystem'}
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold text-white md:text-4xl">
            {'Three portals. One living rental universe.'}
          </h2>
          <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
            {portals.map((card) => (
              <Link
                key={card.to + card.title}
                to={card.to}
                className="block rounded-2xl border border-white/15 bg-white/5 p-6 text-white backdrop-blur-md transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold text-white">{card.title}</h3>
                  {card.ready && (
                    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">
                      Signed in
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white/70">{card.body}</p>
                <p className="mt-4 text-xs font-medium text-brand-300">
                  {card.ready ? 'Open in this tab →' : 'Sign in →'}
                </p>
              </Link>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-sm text-white/45">
            Tip: sign into User, Vendor, and Super Admin separately — each portal keeps its own
            session so you can run them in different browser tabs at once.
          </p>
        </RevealSection>

        <RevealSection>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyber-400">
            {'Intelligence'}
          </p>
          <h2 className="mx-auto mt-3 max-w-xl font-display text-3xl font-semibold text-white">
            {'Designed to feel assisted — without changing how Rentelio works.'}
          </h2>
          <ul className="mx-auto mt-8 grid max-w-4xl gap-3 text-left text-sm text-white/70 md:grid-cols-2">
            {['AI-style verification theater around existing KYC decisions', 'Living charts and holographic KPI panels', 'Vendor KYC and payout command tools', 'System health with heartbeat and capacity visualizations'].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 backdrop-blur-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </RevealSection>
      </div>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs text-white/40">
        Rentelio · Don&apos;t get Mental, Just do Rental
      </footer>
    </div>
  );
}

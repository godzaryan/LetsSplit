import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 206, 201, 0.1) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />

      {/* Navigation */}
      <nav className="landing-nav" style={{
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src="/money-bag.svg" alt="LetsSplit Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px' }}>
            LetsSplit
          </span>
        </div>
        <div className="landing-nav-buttons" style={{ display: 'flex', gap: '12px' }}>
          <Link href="/auth/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Log In
          </Link>
          <Link href="/auth/signup" className="btn-primary" style={{ textDecoration: 'none' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 20px 60px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Badge */}
        <div className="animate-fade-in" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '100px',
          background: 'rgba(108, 92, 231, 0.1)',
          border: '1px solid rgba(108, 92, 231, 0.2)',
          fontSize: '13px',
          color: 'var(--accent-primary-light)',
          marginBottom: '32px',
          fontWeight: 500,
        }}>
          <span style={{ fontSize: '10px' }}>✨</span>
          Smart expense splitting for groups
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-in" style={{
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-2px',
          maxWidth: '800px',
          marginBottom: '24px',
        }}>
          Split expenses,{' '}
          <span className="gradient-text">not friendships</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in" style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          Create groups, track shared expenses, simplify debts, and settle up
          with friends — all in one beautifully designed platform.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/signup" className="btn-primary" style={{
            textDecoration: 'none',
            padding: '16px 32px',
            fontSize: '16px',
            borderRadius: '14px',
          }}>
            Start Splitting Free →
          </Link>
          <Link href="#features" className="btn-secondary" style={{
            textDecoration: 'none',
            padding: '16px 32px',
            fontSize: '16px',
            borderRadius: '14px',
          }}>
            See How It Works
          </Link>
        </div>

        {/* Feature Cards */}
        <div id="features" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          width: '100%',
          marginTop: '100px',
          padding: '0 20px',
        }}>
          {[
            {
              icon: '⚡',
              title: 'Smart Splitting',
              desc: 'Equal, percentage, exact amounts, shares, or itemized receipt — split any way you need.',
            },
            {
              icon: '🔄',
              title: 'Debt Simplification',
              desc: 'Our algorithm minimizes the number of transactions needed to settle all group debts.',
            },
            {
              icon: '👥',
              title: 'Group Management',
              desc: 'Discord-style groups with roles, invite codes, and support for guest members.',
            },
            {
              icon: '📊',
              title: 'Real-Time Dashboard',
              desc: 'See who owes whom at a glance, with live updates as expenses are added.',
            },
            {
              icon: '🧾',
              title: 'Receipt Scanning',
              desc: 'Attach receipt images to expenses for transparent, trustworthy records.',
            },
            {
              icon: '📤',
              title: 'Export & Settle',
              desc: 'Export ledgers to CSV, generate QR payment codes, and track settlements.',
            },
          ].map((feature, i) => (
            <div key={i} className="card animate-fade-in" style={{
              textAlign: 'left',
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'both',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(108, 92, 231, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginBottom: '16px',
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                {feature.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
        fontSize: '13px',
        position: 'relative',
        zIndex: 10,
      }}>
        © {new Date().getFullYear()} LetsSplit. Built for friends who share.
      </footer>
    </div>
  );
}

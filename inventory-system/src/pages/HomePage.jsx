import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="inv-home-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '85vh',
      textAlign: 'center',
      padding: '2rem',
      background: 'var(--bg-main, #f8fafc)' // Fallback to a light gray if variable not set
    }}>
      <div className="inv-welcome-card" style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '32px',
        padding: '5rem 3rem',
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.1)',
        animation: 'fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <div className="logo-wrapper" style={{
          position: 'relative',
          padding: '10px',
          background: 'transparent',
          borderRadius: '24px',
          // boxShadow: '0 15px 35px rgba(0, 0, 0, 0.08)',
          animation: 'logoFloat 4s ease-in-out infinite'
        }}>
          <img
            src="/logo-full.png"
            alt="HONC Logo"
            style={{
              width: '140px',
              height: 'auto',
              borderRadius: '0px',
              display: 'block'
            }}
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '0.75rem',
            color: '#1e293b', // Dark slate for better readability
            letterSpacing: '-0.03em',
            lineHeight: '1.1'
          }}>
            Welcome back, <span style={{ color: '#3b6ef8' }}>{user?.username || 'User'}</span>!
          </h1>
          <p style={{
            fontSize: '1.4rem',
            color: '#64748b',
            fontWeight: '500',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            Honc ERP System
          </p>
        </div>

        <div style={{
          width: '60px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #3b6ef8, transparent)',
          borderRadius: '2px',
          marginTop: '1rem'
        }} />

        <p style={{
          fontSize: '1rem',
          color: '#94a3b8',
          marginTop: '0.5rem'
        }}>
          You are logged in as <strong>{user?.role || 'Guest'}</strong>
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .inv-home-container {
          background-image: 
            radial-gradient(at 0% 0%, rgba(59, 110, 248, 0.03) 0, transparent 50%),
            radial-gradient(at 50% 0%, rgba(16, 185, 129, 0.03) 0, transparent 50%),
            radial-gradient(at 100% 0%, rgba(59, 110, 248, 0.03) 0, transparent 50%);
        }
      `}} />
    </div>
  );
}

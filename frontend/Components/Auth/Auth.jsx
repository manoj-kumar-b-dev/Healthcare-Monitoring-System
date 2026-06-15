import React from 'react'
import Login from './Login'
import Register from './Register'

function Auth() {
  const [register, setRegister] = React.useState(false)
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle ambient blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Top-left soft glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '-100px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(30,90,200,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-right soft glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-100px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,120,180,0.10) 0%, transparent 70%)',
          }}
        />
        {/* Center very subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,86,176,0.06) 0%, transparent 65%)',
          }}
        />
        {/* Fine grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {/* Top branding */}
        <div style={{ marginBottom: '22px', textAlign: 'center' }}>
          <p
            style={{
              color: 'rgba(160, 185, 230, 0.75)',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              margin: 0,
            }}
          >
            Smart Healthcare Monitoring System
          </p>
        </div>

        {!register
          ? <Login setRegister={() => setRegister(true)} />
          : <Register setLogin={() => setRegister(false)} />
        }

        {/* Bottom footnote */}
        <p
          style={{
            marginTop: '20px',
            color: 'rgba(140, 165, 210, 0.45)',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}
        >
          © 2025 Smart HMS · All rights reserved
        </p>
      </div>
    </main>
  )
}

export default Auth
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function Login({ setRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      toast.success('Successfully logged into clinical portal.');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to authenticate session';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div
        style={{
          background: '#F5F7FA',
          borderRadius: '20px',
          border: '1px solid #DDE3EC',
          boxShadow: '0 8px 32px rgba(15, 40, 80, 0.12), 0 2px 8px rgba(15, 40, 80, 0.06)',
          padding: '40px 36px',
          animation: 'fadeInUp 0.4s ease-out',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          {/* Icon container */}
          <div
            style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #1A56B0 0%, #1E7BC4 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(26, 86, 176, 0.22)',
            }}
          >
            <Activity size={26} color="#ffffff" />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#0F2040',
              letterSpacing: '-0.3px',
              margin: '0 0 4px 0',
              fontFamily: 'inherit',
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: '13.5px', color: '#6B7A99', margin: 0, fontWeight: '400' }}>
            Sign in to your Healthcare Portal
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#EF4444',
                flexShrink: 0,
              }}
            />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#344060',
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={15}
                color="#8A96B0"
                style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.org"
                required
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '14px',
                  paddingTop: '11px',
                  paddingBottom: '11px',
                  border: '1px solid #CDD5E0',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: '#1A2742',
                  background: '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1A56B0';
                  e.target.style.boxShadow = '0 0 0 3px rgba(26, 86, 176, 0.10)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CDD5E0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#344060',
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                color="#8A96B0"
                style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '40px',
                  paddingTop: '11px',
                  paddingBottom: '11px',
                  border: '1px solid #CDD5E0',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: '#1A2742',
                  background: '#FFFFFF',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1A56B0';
                  e.target.style.boxShadow = '0 0 0 3px rgba(26, 86, 176, 0.10)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CDD5E0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8A96B0',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            style={{
              marginTop: '6px',
              width: '100%',
              padding: '12px 0',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#FFFFFF',
              background: loading
                ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.28)',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.82 : 1,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)';
                e.target.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.36)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
                e.target.style.boxShadow = '0 2px 10px rgba(37, 99, 235, 0.28)';
              }
            }}
          >
            {loading && (
              <div
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#FFFFFF',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            )}
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Security badge */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            color: '#8A96B0',
            fontSize: '11.5px',
          }}
        >
          <ShieldCheck size={12} color="#8A96B0" />
          <span>HIPAA-compliant · 256-bit encrypted</span>
        </div>

        {/* Divider */}
        <div
          style={{
            margin: '20px 0 16px',
            height: '1px',
            background: '#E4E9F0',
          }}
        />

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7A99', margin: 0 }}>
          Don't have an account?{' '}
          <button
            onClick={setRegister}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              color: '#1A56B0',
              fontSize: '13px',
              padding: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#1648A0')}
            onMouseLeave={(e) => (e.target.style.color = '#1A56B0')}
          >
            Create Account
          </button>
        </p>
      </div>

      {/* Keyframe animations injected globally once */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;
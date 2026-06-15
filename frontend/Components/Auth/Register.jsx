import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Calendar, Lock, Activity, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';

function Register({ setLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name.trim()) {
      const msg = 'Full name is required.';
      setError(msg);
      return toast.error(msg);
    }
    if (!formData.email.trim()) {
      const msg = 'Email address is required.';
      setError(msg);
      return toast.error(msg);
    }
    if (!formData.phone.trim()) {
      const msg = 'Phone number is required.';
      setError(msg);
      return toast.error(msg);
    }
    if (!formData.dateOfBirth) {
      const msg = 'Date of birth is required.';
      setError(msg);
      return toast.error(msg);
    }
    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg);
      return toast.error(msg);
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!passwordRegex.test(formData.password)) {
      const msg = 'Password must be 6-20 characters and contain at least one uppercase letter, one lowercase letter, and one number.';
      setError(msg);
      return toast.error(msg);
    }

    try {
      setLoading(true);
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        password: formData.password
      });
      toast.success('Clinical Medical Profile successfully created!');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create account';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#344060',
    marginBottom: '5px',
    letterSpacing: '0.02em',
  };

  const inputStyle = {
    width: '100%',
    paddingLeft: '38px',
    paddingRight: '14px',
    paddingTop: '10px',
    paddingBottom: '10px',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    fontSize: '13.5px',
    color: '#1F2937',
    background: '#F8FAFC',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
    boxSizing: 'border-box',
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = '#2563EB';
    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.10)';
    e.target.style.backgroundColor = '#FFFFFF';
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = '#CBD5E1';
    e.target.style.boxShadow = 'none';
    e.target.style.backgroundColor = '#F8FAFC';
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div
        style={{
          background: '#F5F7FA',
          borderRadius: '20px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 8px 32px rgba(15, 40, 80, 0.12), 0 2px 8px rgba(15, 40, 80, 0.06)',
          padding: '36px 32px',
          animation: 'fadeInUp 0.4s ease-out',
        }}
      >
        {/* Logo & Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          {/* Logo container */}
          <div
            style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.22)',
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
            Create Your Account
          </h1>
          <p style={{ fontSize: '13.5px', color: '#6B7A99', margin: 0, fontWeight: '400', textAlign: 'center' }}>
            Join Smart Healthcare Monitoring
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
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Grid Container */}
          <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            
            {/* Full Name */}
            <div className="reg-grid-item-span" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="reg-name" style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="reg-grid-item-span" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="reg-grid-item-span" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="reg-phone" style={labelStyle}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="reg-grid-item-half">
              <label htmlFor="reg-dob" style={labelStyle}>Date of Birth</label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-dob"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Gender */}
            <div className="reg-grid-item-half">
              <label htmlFor="reg-gender" style={labelStyle}>Gender</label>
              <div style={{ position: 'relative' }}>
                <Users
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
                />
                <select
                  id="reg-gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  style={{
                    ...inputStyle,
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;utf8,%3Csvg%20fill%3D%27%238A96B0%27%20height%3D%2724%27%20viewBox%3D%270%200%2024%2024%27%20width%3D%2724%27%20xmlns%3D%27http%3D%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M7%2010l5%205%205-5z%27%2F%3E%3Cpath%20d%3D%27M0%200h24v24H0z%27%20fill%3D%27none%27%2F%3E%3C%2Fsvg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    cursor: 'pointer'
                  }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="reg-grid-item-half">
              <label htmlFor="reg-password" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
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

            {/* Confirm Password */}
            <div className="reg-grid-item-half">
              <label htmlFor="reg-confirmPassword" style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  color="#8A96B0"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="reg-confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
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
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="register-submit"
            disabled={loading}
            style={{
              marginTop: '10px',
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Security Badge */}
        <div
          style={{
            marginTop: '22px',
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
          Already have an account?{' '}
          <button
            onClick={setLogin}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              color: '#2563EB',
              fontSize: '13px',
              padding: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#1D4ED8')}
            onMouseLeave={(e) => (e.target.style.color = '#2563EB')}
          >
            Sign In
          </button>
        </p>
      </div>

      {/* Keyframe animations & responsive overrides injected globally */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .reg-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .reg-grid-item-span {
            grid-column: span 1 !important;
          }
          .reg-grid-item-half {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Register;
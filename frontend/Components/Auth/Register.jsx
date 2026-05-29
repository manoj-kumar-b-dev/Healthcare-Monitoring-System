import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Lock, Activity, Eye, EyeOff } from 'lucide-react';

function Register({ setLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
    age: '', weight: '', height: '', gender: 'male'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError('');
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!formData.username.trim()) return setError('Username cannot be empty.');
    if (!passwordRegex.test(formData.password))
      return setError('Password needs uppercase, lowercase, and numbers (min 6 chars).');
    try {
      setLoading(true);
      await register({ ...formData, age: Number(formData.age), weight: Number(formData.weight), height: Number(formData.height) });
      toast.success('Medical Profile successfully created!');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create account';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm';

  return (
    <div className="w-full max-w-xl mx-4 my-6">
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100 p-8 animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Your Account</h1>
          <p className="text-slate-500 text-sm mt-1">Enroll securely into the Healthcare System</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input name="username" value={formData.username} onChange={handleChange} className={inputCls} type="text" placeholder="johndoe" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input name="email" value={formData.email} onChange={handleChange} className={inputCls} type="email" placeholder="you@example.com" required />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                name="password" value={formData.password} onChange={handleChange}
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                placeholder="Min 6 chars, upper + lower + number" required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Toggle visibility">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Body Metrics */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Body Metrics</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input name="age" value={formData.age} onChange={handleChange} className={inputCls} type="number" placeholder="Age" required />
              </div>
              <div>
                <input name="weight" value={formData.weight} onChange={handleChange} className={inputCls} type="number" placeholder="Weight (kg)" required />
              </div>
              <div>
                <input name="height" value={formData.height} onChange={handleChange} className={inputCls} type="number" placeholder="Height (cm)" required />
              </div>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={inputCls} required>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            id="register-submit"
            disabled={loading}
            className={`w-full mt-1 py-3 rounded-xl font-bold text-white text-sm transition-all duration-200
              bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700
              shadow-lg shadow-teal-500/30 hover:shadow-xl
              disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2`}
          >
            {loading && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? 'Creating Profile...' : 'Register Clinical Profile'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button onClick={setLogin} type="button" className="font-bold text-teal-600 hover:text-teal-700 hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;
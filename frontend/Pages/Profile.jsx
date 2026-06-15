import React, { useState, useEffect } from 'react';
import { User, Settings, HeartPulse, Activity as ActivityIcon, Thermometer, Shield } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const inputCls = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-slate-400';
const disabledInputCls = 'w-full px-4 py-2.5 border border-slate-100 rounded-xl text-slate-400 bg-slate-50 cursor-not-allowed text-sm';
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

const Profile = () => {
  const { user, loadUser } = useAuth();
  const [profileData, setProfileData] = useState({ age: '', weight: '', height: '', gender: 'other', dob: '' });
  const [settings, setSettings] = useState({ soundAlerts: true, stepGoal: 10000, unitPreference: 'metric' });
  const [stats, setStats] = useState({ heartRate: '--', spo2: '--', temperature: '--' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

   useEffect(() => {
     const fetchAllData = async () => {
       try {
         setLoading(true);
         console.log('[Profile] Fetching user profile and stats...');
         
         const [profileRes, statsRes] = await Promise.all([
           api.user.getProfile().catch((err) => {
             console.error('[Profile] Error fetching profile:', err.message);
             return { data: null };
           }),
           api.vitals.getStats().catch((err) => {
             console.error('[Profile] Error fetching stats:', err.message);
             return { data: { stats: {} } };
           })
         ]);
         
         if (profileRes?.data?.data) {
           const userData = profileRes.data.data;
           console.log('[Profile] Profile data loaded successfully');
           
           setProfileData(prev => ({
             ...prev,
             age: userData.age ?? '',
             weight: userData.weight ?? '',
             height: userData.height ?? '',
             gender: userData.gender || 'other',
             dob: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : ''
           }));
           
           if (userData.settings) {
             setSettings(prev => ({
               ...prev,
               soundAlerts: userData.settings.soundAlerts ?? true,
               stepGoal: userData.settings.dailyStepGoal ?? 10000,
               unitPreference: userData.settings.unit ?? 'metric'
             }));
           }
         }
         if (statsRes?.data?.stats) setStats(statsRes.data.stats);
       } catch (error) {
         console.error('[Profile] Failed to load data:', error);
         toast.error('Failed to load profile data. Please try again.');
       } finally {
         setLoading(false);
       }
     };
     fetchAllData();
   }, []);

  const handleProfileChange = (e) => setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      console.log('[Profile] Saving profile with data:', profileData);
      
      // Frontend validation
      const validationErrors = [];
      if (profileData.age !== '' && (Number(profileData.age) < 0 || Number(profileData.age) > 150)) {
        validationErrors.push('Age must be between 0 and 150');
      }
      if (profileData.weight !== '' && (Number(profileData.weight) < 0 || Number(profileData.weight) > 500)) {
        validationErrors.push('Weight must be between 0 and 500 kg');
      }
      if (profileData.height !== '' && (Number(profileData.height) < 0 || Number(profileData.height) > 300)) {
        validationErrors.push('Height must be between 0 and 300 cm');
      }
      
      if (validationErrors.length > 0) {
        validationErrors.forEach(err => toast.error(err));
        return;
      }
      
      const sanitizedData = { gender: profileData.gender };
      if (profileData.age !== '') sanitizedData.age = Number(profileData.age);
      if (profileData.weight !== '') sanitizedData.weight = Number(profileData.weight);
      if (profileData.height !== '') sanitizedData.height = Number(profileData.height);
      if (profileData.dob !== '') sanitizedData.dateOfBirth = profileData.dob;
      
      console.log('[Profile] Sending request with sanitized data:', sanitizedData);
      const response = await api.user.updateProfile(sanitizedData);
      
      console.log('[Profile] Update response:', response.data);
      toast.success('Profile updated successfully!');
      loadUser();
    } catch (error) {
      console.error('[Profile] Error saving profile:', error);
      const errorMessage = error.response?.data?.errors?.[0] || error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      console.log('[Profile] Saving settings:', settings);
      
      // Validation
      if (settings.stepGoal < 0) {
        toast.error('Daily step goal must be positive');
        return;
      }
      
      const settingsPayload = {
        soundAlerts: settings.soundAlerts,
        stepGoal: settings.stepGoal,
        unitPreference: settings.unitPreference
      };
      
      const response = await api.user.updateSettings(settingsPayload);
      console.log('[Profile] Settings update response:', response.data);
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error('[Profile] Error saving settings:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update settings. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSavingSettings(false);
    }
  };

  const healthScore = 85;
  const getScoreColor = (score) => {
    if (score >= 80) return { stroke: '#10B981', text: 'text-emerald-600', label: 'Excellent' };
    if (score >= 60) return { stroke: '#F59E0B', text: 'text-amber-600', label: 'Good' };
    return { stroke: '#EF4444', text: 'text-red-600', label: 'Needs Attention' };
  };
  const scoreConfig = getScoreColor(healthScore);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 animate-fade-in space-y-7">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Account</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal health information and system settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-7">

          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">Personal Information</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input type="text" value={user?.name || user?.username || ''} disabled className={disabledInputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input type="email" value={user?.email || ''} disabled className={disabledInputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Age</label>
                    <input type="number" name="age" value={profileData.age} onChange={handleProfileChange} className={inputCls} min="0" placeholder="e.g. 35" />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <input type="date" name="dob" value={profileData.dob} onChange={handleProfileChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Weight (kg)</label>
                    <input type="number" step="0.1" name="weight" value={profileData.weight} onChange={handleProfileChange} className={inputCls} placeholder="e.g. 70.5" />
                  </div>
                  <div>
                    <label className={labelCls}>Height (cm)</label>
                    <input type="number" name="height" value={profileData.height} onChange={handleProfileChange} className={inputCls} placeholder="e.g. 175" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Gender</label>
                    <select name="gender" value={profileData.gender} onChange={handleProfileChange} className={inputCls}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm disabled:opacity-70">
                    {savingProfile && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              <h2 className="font-bold text-slate-800 text-sm">System Settings</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Sound Alerts toggle */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Sound Alerts</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Play a sound when critical vitals are detected</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="soundAlerts" checked={settings.soundAlerts} onChange={handleSettingsChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-blue-500/30" />
                  </label>
                </div>

                {/* Step Goal */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100 gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm">Daily Step Goal</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Target steps per day for activity tracking</p>
                  </div>
                  <input type="number" name="stepGoal" value={settings.stepGoal} onChange={handleSettingsChange} className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-right text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="1000" step="500" />
                </div>

                {/* Unit */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100 gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm">Unit Preference</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Metric (km/kg) or Imperial (mi/lbs)</p>
                  </div>
                  <select name="unitPreference" value={settings.unitPreference} onChange={handleSettingsChange} className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="metric">Metric</option>
                    <option value="imperial">Imperial</option>
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={savingSettings} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-70">
                    {savingSettings && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Health Score Ring */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <h3 className="font-bold text-slate-800 text-sm mb-5 text-left">Overall Health Score</h3>
            <div className="relative w-36 h-36 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={scoreConfig.stroke}
                  strokeWidth="10"
                  strokeDasharray={`${(healthScore / 100) * 264} 264`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.2s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-slate-900">{healthScore}</span>
                <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
            </div>
            <div className={`mt-5 inline-flex items-center gap-1.5 text-sm font-bold ${scoreConfig.text} bg-slate-50 px-4 py-2 rounded-full border border-slate-100`}>
              {scoreConfig.label}
            </div>
          </div>

          {/* 7-Day Averages */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">7-Day Averages</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: HeartPulse, label: 'Heart Rate', value: stats.heartRate, unit: 'bpm', bg: 'bg-rose-50', color: 'text-rose-600' },
                { icon: ActivityIcon, label: 'SpO₂ Level', value: stats.spo2, unit: '%', bg: 'bg-cyan-50', color: 'text-cyan-600' },
                { icon: Thermometer, label: 'Temperature', value: stats.temperature, unit: '°C', bg: 'bg-orange-50', color: 'text-orange-600' },
              ].map((item) => (
                <div key={item.label} className={`flex items-center p-3 rounded-xl ${item.bg} border border-slate-100`}>
                  <div className={`w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
                    <p className="text-base font-bold text-slate-900">
                      {item.value} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

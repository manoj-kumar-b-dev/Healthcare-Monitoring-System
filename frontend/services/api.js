import axios from 'axios';

// Base axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: auto-attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('healthcare_token');
    console.log(`[API Request] ${config.method?.toUpperCase?.()} ${config.url}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API Request] Authorization header set with token:', token.substring(0, 15) + '...');
    } else {
      console.warn('[API Request] No token found in localStorage for', config.url);
    }
    return config;
  },
  (error) => {
    console.error('[API Request] Error setting up request:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor: handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} from ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;
    
    console.error(`[API Error] ${status} ${error.config?.method?.toUpperCase()} ${url}`, {
      message: errorData?.message,
      errors: errorData?.errors,
      error: error.message
    });
    
    if (status === 401) {
      console.warn('[API] 401 Unauthorized - Token invalid or expired');
      localStorage.removeItem('healthcare_token');
      // Optionally redirect to login
      if (typeof window !== 'undefined') {
        // window.location.href = '/login'; // Uncomment if needed
      }
    }
    
    if (status === 403) {
      console.warn('[API] 403 Forbidden - Access denied');
    }
    
    if (status === 400) {
      console.warn('[API] 400 Bad Request - Validation or data error');
    }
    
    if (status === 500) {
      console.error('[API] 500 Server Error - Internal server error');
    }
    
    return Promise.reject(error);
  }
);

// Named export for legacy imports
export const API = axiosInstance;

// ─────────────────────────────────────────────
// Grouped API methods
// ─────────────────────────────────────────────
export const api = {
  auth: {
    login: (data) => axiosInstance.post('/auth/login', data),
    register: (data) => axiosInstance.post('/auth/register', data),
    logout: () => axiosInstance.post('/auth/logout'),
    getMe: () => axiosInstance.get('/auth/me'),
  },

  vitals: {
    create: (data) => axiosInstance.post('/vitals', data),
    getHistory: (params) => axiosInstance.get('/vitals', { params }),
    getLatest: () => axiosInstance.get('/vitals/latest'),
    getStats: () => axiosInstance.get('/vitals/stats'),
    delete: (id) => axiosInstance.delete(`/vitals/${id}`),
  },

  contacts: {
    getAll: () => axiosInstance.get('/contacts'),
    create: (data) => axiosInstance.post('/contacts', data),
    update: (id, data) => axiosInstance.put(`/contacts/${id}`, data),
    delete: (id) => axiosInstance.delete(`/contacts/${id}`),
  },

  user: {
    getProfile: () => axiosInstance.get('/user/profile'),
    updateProfile: (data) => axiosInstance.put('/user/profile', data),
    updateSettings: (data) => axiosInstance.put('/user/settings', data),
  },

  activities: {
    getToday: () => axiosInstance.get('/activities/today'),
    addSteps: (data) => axiosInstance.post('/activities/steps', data),
    getWeekly: () => axiosInstance.get('/activities/weekly'),
    getStats: () => axiosInstance.get('/activities/stats'),
  },

   reports: {
     generate: (params) => axiosInstance.post('/reports/generate', {}, { params, responseType: 'blob' }),
     getHistory: () => axiosInstance.get('/reports/history'),
   },

   reminders: {
     getAll: (params) => axiosInstance.get('/reminders', { params }),
     getById: (id) => axiosInstance.get(`/reminders/${id}`),
     getToday: () => axiosInstance.get('/reminders/today'),
     getStats: () => axiosInstance.get('/reminders/stats'),
     create: (data) => axiosInstance.post('/reminders', data),
     update: (id, data) => axiosInstance.put(`/reminders/${id}`, data),
     delete: (id) => axiosInstance.delete(`/reminders/${id}`),
     updateStatus: (id, status) => axiosInstance.patch(`/reminders/${id}/status`, { status }),
   },

   healthScore: {
     getLatest:  () => axiosInstance.get('/health-score'),
     getHistory: (params) => axiosInstance.get('/health-score/history', { params }),
     calculate:  () => axiosInstance.post('/health-score/calculate'),
     getSummary: () => axiosInstance.get('/health-score/summary'),
   },

   alerts: {
     triggerEmergency: (data) => axiosInstance.post('/alerts/emergency', data),
   }
 };

export default axiosInstance;

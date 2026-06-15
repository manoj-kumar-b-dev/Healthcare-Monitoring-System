import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { HealthScoreProvider } from './context/HealthScoreContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './Components/layout/Layout';
import Dashboard from './Pages/Dashboard';
import Profile from './Pages/Profile';
import EmergencyContacts from './Pages/EmergencyContacts';
import Reminders from './Pages/Reminders';
import Reports from './Pages/Reports';
import History from './Pages/History';
import Auth from './Components/Auth/Auth';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Public Route component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/auth" 
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } 
            />
            
            {/* Protected routes with layout — HealthScoreProvider only mounts when authenticated */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HealthScoreProvider>
                    <Layout />
                  </HealthScoreProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="contacts" element={<EmergencyContacts />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="reports" element={<Reports />} />
              <Route path="history" element={<History />} />
            </Route>
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Toast notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
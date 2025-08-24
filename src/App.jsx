import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { EbookProvider } from './contexts/EbookContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import CreateEbook from './pages/CreateEbook';
import ReviewOutline from './pages/ReviewOutline';
import ProjectDetails from './pages/ProjectDetails';
import ProtectedRoute from './components/ProtectedRoute';
import MinimizedProgressIndicator from './components/MinimizedProgressIndicator';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <EbookProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
              
              {/* Global minimized progress indicator that shows when publishing in background */}
              <MinimizedProgressIndicator />
              
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="create" element={<CreateEbook />} />
                  <Route path="review/:projectId" element={<ReviewOutline />} />
                  <Route path="project/:projectId" element={<ProjectDetails />} />
                </Route>
              </Routes>
            </div>
          </Router>
        </EbookProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
import Settings from './pages/Settings';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import IOCIntelligence from './pages/IOCIntelligence';
import GeoIntelligence from './pages/GeoIntelligence';
import RelationshipGraph from './pages/RelationshipGraph';
import GlobalTimeline from './pages/GlobalTimeline';
import GlobalReports from './pages/GlobalReports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Phase 2 Routes */}
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/ioc-intelligence" element={<IOCIntelligence />} />
              <Route path="/relationship-graph" element={<RelationshipGraph />} />
              <Route path="/geo-intelligence" element={<GeoIntelligence />} />
              <Route path="/timeline" element={<GlobalTimeline />} />
              <Route path="/reports" element={<GlobalReports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { User, Lock, Monitor, Sun, Moon, LogOut, Bell, Shield, Mail, BadgeCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { investigator, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLightMode, setIsLightMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  // Initialize theme from html class
  useEffect(() => {
    setIsLightMode(document.documentElement.classList.contains('light-theme'));
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light-theme');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add('light-theme');
      setIsLightMode(true);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // Honest feedback - not fake success
    setPasswordMsg("Password changes aren't available in this demo build. Contact your admin.");
    setTimeout(() => setPasswordMsg(''), 5000);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-medium text-white">Profile Information</h3>
              <p className="text-sm text-gray-400 mt-1">Your personal account details as an investigator.</p>
            </div>
            
            <div className="glass-panel p-6 rounded-xl border border-gray-800 space-y-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold border border-primary/30">
                  {investigator?.name ? investigator.name.charAt(0).toUpperCase() : 'I'}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">{investigator?.name || 'SOC Investigator'}</h4>
                  <div className="flex items-center text-sm text-primary mt-1">
                    <BadgeCheck className="w-4 h-4 mr-1" />
                    Verified Identity
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                  <div className="flex items-center bg-surface border border-gray-700 rounded-lg px-4 py-2.5 text-white">
                    <User className="w-4 h-4 text-gray-500 mr-3" />
                    {investigator?.name || 'SOC Investigator'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                  <div className="flex items-center bg-surface border border-gray-700 rounded-lg px-4 py-2.5 text-white">
                    <Mail className="w-4 h-4 text-gray-500 mr-3" />
                    {investigator?.email || 'analyst@maildrishti.local'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Role / Designation</label>
                  <div className="flex items-center bg-surface border border-gray-700 rounded-lg px-4 py-2.5 text-white">
                    <Shield className="w-4 h-4 text-gray-500 mr-3" />
                    {investigator?.role || 'Threat Analyst'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-medium text-white">Security & Authentication</h3>
              <p className="text-sm text-gray-400 mt-1">Manage your password and active sessions.</p>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-gray-800">
              <h4 className="text-base font-semibold text-white mb-4">Change Password</h4>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                    className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                {passwordMsg && (
                  <div className="flex items-center p-3 rounded bg-warning/10 border border-warning/20 text-warning text-sm">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {passwordMsg}
                  </div>
                )}

                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary/20"
                >
                  Update Password
                </button>
              </form>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-gray-800">
              <h4 className="text-base font-semibold text-white mb-4">Active Session</h4>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface rounded-lg border border-gray-700">
                <div className="mb-4 sm:mb-0">
                  <p className="text-sm font-medium text-white">Current Session</p>
                  <p className="text-xs text-gray-400 mt-1">Logged in from this browser</p>
                </div>
                <button 
                  onClick={logout}
                  className="flex items-center px-4 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors border border-danger/20 font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout securely
                </button>
              </div>
            </div>
          </div>
        );

      case 'application':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-medium text-white">Application Settings</h3>
              <p className="text-sm text-gray-400 mt-1">Customize your UI experience and preferences.</p>
            </div>

            <div className="glass-panel rounded-xl border border-gray-800 divide-y divide-gray-800">
              {/* Theme Toggle */}
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium text-white">Appearance</h4>
                  <p className="text-sm text-gray-400 mt-1">Toggle between Light and Dark mode UI.</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-gray-700"
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      isLightMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {isLightMode ? (
                      <Sun className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Moon className="h-4 w-4 text-gray-800" />
                    )}
                  </span>
                </button>
              </div>

              {/* Notifications Toggle */}
              <div className="p-6 flex items-center justify-between opacity-60">
                <div>
                  <div className="flex items-center">
                    <h4 className="text-base font-medium text-white">System Notifications</h4>
                    <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Receive alerts for new critical threats.</p>
                </div>
                <button 
                  disabled
                  className="relative inline-flex h-8 w-14 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-gray-800 transition-colors duration-200 ease-in-out"
                >
                  <span className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-gray-500 shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'profile' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <User className="w-5 h-5 mr-3 flex-shrink-0" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'security' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Lock className="w-5 h-5 mr-3 flex-shrink-0" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('application')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'application' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Monitor className="w-5 h-5 mr-3 flex-shrink-0" />
            Application
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;

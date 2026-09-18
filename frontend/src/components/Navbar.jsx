import React from 'react';
import { Search, Bell, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { investigator, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-surface border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/20 p-2 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-xl font-bold tracking-wider text-white leading-tight">
            MAILDRISHTI <span className="text-primary text-sm align-top">AI</span>
          </span>
          <span className="text-[11px] text-gray-500 font-medium tracking-wide">
            Connect the Evidence.
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-64 pl-10 pr-3 py-1.5 border border-gray-700 rounded-md leading-5 bg-background text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
            placeholder="Search cases, IOCs, emails..."
            disabled
          />
        </div>

        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-danger ring-2 ring-surface"></span>
        </button>

        <div className="flex items-center space-x-3 border-l border-gray-800 pl-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-white">{investigator?.name || 'Investigator'}</span>
            <span className="text-xs text-gray-500">{investigator?.role || 'SOC Analyst'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-primary transition-colors ml-4"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

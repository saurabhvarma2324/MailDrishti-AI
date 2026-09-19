import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailSearch, Briefcase, Search, Plus, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Critical': return 'text-danger bg-danger/10 border-danger/20';
    case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'Medium': return 'text-warning bg-warning/10 border-warning/20';
    case 'Low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Open': return 'text-primary bg-primary/10 border-primary/20';
    case 'In Progress': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'Closed': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const EmailAnalysis = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch cases');
      const data = await res.json();
      setCases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <MailSearch className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Email Analysis</h1>
        <p className="text-gray-400">
          Email analysis happens inside a case. Select an existing case below, or create a new one to begin analyzing suspicious emails.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-gray-400" />
          Select a Case
        </h2>
        <button 
          onClick={() => navigate('/cases')}
          className="flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Case
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : cases.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl flex flex-col items-center justify-center">
          <div className="bg-surface/50 p-6 rounded-full mb-4">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Active Cases</h3>
          <p className="text-gray-400 mb-6">You haven't created any investigations yet.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Case ID</th>
                  <th scope="col" className="px-6 py-4 font-medium">Title</th>
                  <th scope="col" className="px-6 py-4 font-medium">Priority</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                  <th scope="col" className="px-6 py-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cases.map((c) => (
                  <tr 
                    key={c._id} 
                    onClick={() => navigate(`/cases/${c._id}`, { state: { tab: 'Email & Analysis' } })}
                    className="hover:bg-gray-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-primary group-hover:text-primary-light">{c.caseId}</td>
                    <td className="px-6 py-4 text-gray-200">{c.title}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 flex items-center">
                      <Clock className="w-4 h-4 mr-2 opacity-50" />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailAnalysis;

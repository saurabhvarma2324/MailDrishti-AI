import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, Clock, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

const GlobalReports = () => {
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
      const res = await fetch('http://localhost:5000/api/cases', {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <FileText className="mr-3 text-primary h-6 w-6" />
            Forensic Reports
          </h1>
          <p className="text-sm text-gray-400 mt-1">Access generated reports for all investigations</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
          <h3 className="text-xl font-medium text-white mb-2">No Reports Available</h3>
          <p className="text-gray-400 max-w-md">There are no active cases to generate reports for.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Case ID</th>
                  <th scope="col" className="px-6 py-4 font-medium">Title</th>
                  <th scope="col" className="px-6 py-4 font-medium">Priority (Risk)</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                  <th scope="col" className="px-6 py-4 font-medium">Date Created</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cases.map((c) => (
                  <tr 
                    key={c._id} 
                    className="hover:bg-gray-800/40 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-primary">{c.caseId}</td>
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
                    <td className="px-6 py-4 text-gray-400">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 opacity-50" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/cases/${c._id}`, { state: { tab: 'Report' } })}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View Report
                      </button>
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

export default GlobalReports;

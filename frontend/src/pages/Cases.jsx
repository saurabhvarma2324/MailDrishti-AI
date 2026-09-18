import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Search, AlertCircle, X, ShieldAlert, AlertTriangle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
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

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  // New Case Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

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

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('http://localhost:5000/api/cases', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, priority })
      });
      
      if (!res.ok) throw new Error('Failed to create case');
      const newCase = await res.json();
      
      setIsModalOpen(false);
      navigate(`/cases/${newCase._id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`http://localhost:5000/api/cases/${caseToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete case');
      
      setCases(cases.filter(c => c._id !== caseToDelete._id));
      setCaseToDelete(null);
      setDeleteSuccessMsg(`Case ${caseToDelete.caseId} deleted successfully.`);
      setTimeout(() => setDeleteSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Briefcase className="mr-3 text-primary h-6 w-6" />
            Case Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage and track active investigations</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </button>
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
          <h3 className="text-xl font-medium text-white mb-2">No Active Cases</h3>
          <p className="text-gray-400 max-w-md mb-6">You haven't created any investigations yet. Start by creating a new case to begin analyzing suspicious emails.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-surface hover:bg-gray-800 border border-gray-700 text-white rounded-lg transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Case
          </button>
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
                  <th scope="col" className="px-6 py-4 font-medium">Investigator</th>
                  <th scope="col" className="px-6 py-4 font-medium">Created</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cases.map((c) => (
                  <tr 
                    key={c._id} 
                    onClick={() => navigate(`/cases/${c._id}`)}
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
                    <td className="px-6 py-4 text-gray-400">{c.investigator?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-400 flex items-center">
                      <Clock className="w-4 h-4 mr-2 opacity-50" />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCaseToDelete(c);
                        }}
                        className="text-gray-500 hover:text-danger transition-colors p-2 rounded hover:bg-danger/10"
                        title="Delete Case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Create New Case</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCase} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Case Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q3 Phishing Campaign Analysis"
                  className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief context about this investigation..."
                  rows={3}
                  className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              
              <div className="flex justify-end pt-4 space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
                Confirm Deletion
              </h2>
              <button 
                onClick={() => setCaseToDelete(null)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete <span className="font-bold text-white">{caseToDelete.caseId}</span>? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setCaseToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteCase}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-danger hover:bg-red-600 text-white rounded-lg transition-colors flex items-center shadow-lg shadow-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Case'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {deleteSuccessMsg && (
        <div className="fixed bottom-4 right-4 bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg shadow-lg flex items-center animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {deleteSuccessMsg}
        </div>
      )}
    </div>
  );
};

export default Cases;

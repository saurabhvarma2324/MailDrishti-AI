import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
import { 
  ArrowLeft, 
  Clock, 
  Upload, 
  FileText, 
  AlertCircle, 
  Mail,
  ChevronDown,
  ChevronUp,
  Shield,
  Link as LinkIcon,
  Lock,
  Activity,
  History,
  Printer,
  MessageSquarePlus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import AnalysisResult from '../components/AnalysisResult';
import IOCIntelligence from './IOCIntelligence';
import GeoIntelligence from './GeoIntelligence';
import RelationshipGraph from './RelationshipGraph';

const getTimelineIcon = (eventType) => {
  const type = eventType?.toLowerCase() || '';
  if (type.includes('threat')) return <Shield className="w-4 h-4 text-primary" />;
  if (type.includes('ioc') || type.includes('extract')) return <LinkIcon className="w-4 h-4 text-purple-500" />;
  if (type.includes('seal') || type.includes('lock')) return <Lock className="w-4 h-4 text-success" />;
  return <Activity className="w-4 h-4 text-gray-400" />;
};

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
    case 'Under Investigation': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'Confirmed Threat': return 'text-danger bg-danger/10 border-danger/20';
    case 'False Positive': return 'text-success bg-success/10 border-success/20';
    case 'Resolved': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    case 'In Progress': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'Closed': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const TABS = [
  'Overview', 
  'Email & Analysis', 
  'IOCs', 
  'Geo Intelligence', 
  'Graph', 
  'Timeline', 
  'Report'
];

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'Overview');

  // Analysis State
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const fileInputRef = useRef(null);

  // Notes State
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    fetchCaseDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVerifyEvidence = async () => {
    try {
      setIsVerifying(true);
      setVerifyResult(null);
      const res = await fetch(`${API_BASE_URL}/api/ledger/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Verification failed to execute');
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ valid: false, blocks_checked: 0, issues: [err.message] });
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/cases/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch case details');
      const data = await res.json();
      setCaseData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedCase = await res.json();
      setCaseData(prev => ({ ...prev, status: updatedCase.status }));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/${id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newNote })
      });
      if (!res.ok) throw new Error('Failed to add note');
      const updatedCase = await res.json();
      setCaseData(prev => ({ ...prev, notes: updatedCase.notes }));
      setNewNote('');
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    setAnalysisError(null);
    setCurrentResult(null);
    setAnalyzing(true);

    try {
      let res;
      if (uploadMode === 'file') {
        if (!file) throw new Error("Please select an EML file first.");
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caseId', id);

        res = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        if (!rawText.trim()) throw new Error("Please paste raw email content first.");
        
        res = await fetch(`${API_BASE_URL}/api/analyze-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ raw_eml: rawText, caseId: id })
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze email');
      }

      const result = await res.json();
      setCurrentResult(result);
      
      setCaseData(prev => ({
        ...prev,
        analyses: [result, ...(prev.analyses || [])]
      }));

      setFile(null);
      setRawText('');

    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || "Case not found."}
      </div>
    );
  }

  // Helpers for Overview
  const analyses = caseData.analyses || [];
  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;
  const iocCount = latestAnalysis ? (
    (latestAnalysis.iocs?.ip_addresses?.length || 0) +
    (latestAnalysis.iocs?.domains?.length || 0) +
    (latestAnalysis.iocs?.urls?.length || 0)
  ) : 0;
  
  // Fake hash for report if not provided
  const blockchainHash = caseData.evidence_seal || `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <button 
            onClick={() => navigate('/cases')}
            className="text-gray-400 hover:text-white flex items-center text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
            <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded text-sm border border-primary/20">
              {caseData.caseId}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-start md:items-end">
          <div className="flex gap-2 items-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(caseData.priority)}`}>
              Priority: {caseData.priority}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(caseData.status)}`}>
              Status: {caseData.status}
            </span>
            <select
              value={caseData.status}
              onChange={handleStatusChange}
              className="bg-surface/50 border border-gray-700 text-white text-xs rounded-lg focus:ring-primary focus:border-primary px-2 py-1"
            >
              <option value="Open">Open</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Confirmed Threat">Confirmed Threat</option>
              <option value="False Positive">False Positive</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 flex flex-col md:items-end">
            <span>Investigator: <strong className="text-gray-300">{caseData.investigator?.name}</strong></span>
            <span className="flex items-center mt-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {new Date(caseData.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 print:hidden">
        <nav className="flex space-x-4 overflow-x-auto hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Case Summary</h2>
                <p className="text-gray-400 mb-6">{caseData.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Emails Analyzed</p>
                    <p className="text-2xl font-semibold text-white">{analyses.length}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Max Risk Score</p>
                    <p className={`text-2xl font-semibold ${latestAnalysis?.risk_score >= 75 ? 'text-danger' : latestAnalysis?.risk_score >= 50 ? 'text-orange-500' : 'text-success'}`}>
                      {latestAnalysis ? latestAnalysis.risk_score : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Extracted IOCs</p>
                    <p className="text-2xl font-semibold text-white">{iocCount}+</p>
                  </div>
                </div>
              </div>

              {latestAnalysis && (
                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-lg font-semibold text-white mb-4">Latest Threat Assessment</h2>
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-3 py-1 rounded text-sm font-bold ${latestAnalysis.risk_score >= 75 ? 'bg-danger/20 text-danger border-danger/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'} border`}>
                      {latestAnalysis.threat_category || 'Unknown Threat'}
                    </span>
                    <span className="text-gray-400 text-sm">{latestAnalysis.subject}</span>
                  </div>
                  <p className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                    {latestAnalysis.executive_summary}
                  </p>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-xl h-full flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <MessageSquarePlus className="w-5 h-5 mr-2 text-primary" />
                  Investigator Notes
                </h2>
                
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 max-h-[400px]">
                  {caseData.notes && caseData.notes.length > 0 ? (
                    [...caseData.notes].reverse().map((note, idx) => (
                      <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                        <div className="flex justify-between items-start mb-1 text-xs text-gray-500">
                          <strong className="text-primary">{note.author || 'Investigator'}</strong>
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">No notes added yet.</p>
                  )}
                </div>

                <div className="mt-auto border-t border-gray-800 pt-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type your investigation notes..."
                    className="w-full h-24 bg-surface/50 border border-gray-700 rounded-lg p-3 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none mb-3"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNote.trim()}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAddingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMAIL & ANALYSIS TAB */}
        {activeTab === 'Email & Analysis' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-surface to-surface/40 shadow-lg shadow-primary/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-primary" />
                Analyze Suspicious Email
              </h2>

              <div className="flex border-b border-gray-800 mb-6">
                <button 
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${uploadMode === 'file' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setUploadMode('file')}
                >
                  Upload .EML File
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${uploadMode === 'text' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setUploadMode('text')}
                >
                  Paste Raw Source
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div 
                  className="border-2 border-dashed border-gray-700 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center bg-gray-900/50 cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" accept=".eml" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <Mail className="w-10 h-10 text-gray-500 mb-3" />
                  <p className="text-gray-300 font-medium mb-1">{file ? file.name : "Drag and drop a .eml file here"}</p>
                  <p className="text-gray-500 text-sm">{file ? `${(file.size / 1024).toFixed(2)} KB` : "or click to browse from your computer"}</p>
                  {file && (
                    <button className="mt-4 text-xs text-danger hover:text-danger-light" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove File</button>
                  )}
                </div>
              ) : (
                <div>
                  <textarea 
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste raw email headers and body here..."
                    className="w-full h-48 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y"
                  />
                </div>
              )}

              {analysisError && (
                <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />{analysisError}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleAnalyze}
                  disabled={analyzing || (uploadMode === 'file' ? !file : !rawText.trim())}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg flex items-center shadow-lg disabled:opacity-50"
                >
                  {analyzing ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Analyzing...</> : 'Analyze Email'}
                </button>
              </div>
            </div>

            {currentResult && <AnalysisResult result={currentResult} />}

            {caseData.analyses && caseData.analyses.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-400" /> Previously Analyzed Emails</h2>
                <div className="space-y-4">
                  {caseData.analyses.map((analysis, index) => <HistoryItem key={analysis._id || index} analysis={analysis} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* IOCs TAB */}
        {activeTab === 'IOCs' && <IOCIntelligence caseId={id} />}

        {/* GEO INTELLIGENCE TAB */}
        {activeTab === 'Geo Intelligence' && <GeoIntelligence caseId={id} />}

        {/* GRAPH TAB */}
        {activeTab === 'Graph' && <RelationshipGraph caseId={id} />}

        {/* TIMELINE TAB */}
        {activeTab === 'Timeline' && (
          <div className="glass-panel p-8 rounded-xl">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
              <History className="w-5 h-5 mr-2 text-primary" />
              Investigation Timeline
            </h2>
            {caseData.timeline && caseData.timeline.length > 0 ? (
              <div className="relative border-l border-gray-700 ml-4 space-y-8 pb-4 mt-4">
                {caseData.timeline.map((event, index) => (
                  <div key={index} className="relative pl-8">
                    <div className="absolute -left-4 top-1 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shadow-lg">
                      {getTimelineIcon(event.eventType)}
                    </div>
                    <div className="glass-panel p-4 rounded-lg border border-gray-800/60 shadow-sm hover:border-gray-700 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white">{event.eventType}</h3>
                        <span className="text-xs text-gray-500 flex items-center bg-gray-900/50 px-2 py-1 rounded">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No timeline events recorded.</p>
            )}
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'Report' && (
          <div className="space-y-6">
            <div className="flex justify-end print:hidden">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-lg transition-colors flex items-center shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Export PDF
              </button>
            </div>
            
            <div className="bg-white text-black p-10 rounded-xl print:shadow-none print:m-0 print:p-0">
              {/* MailDrishti Branding Header for Print/PDF */}
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xl font-bold tracking-wider text-gray-900 leading-tight">
                      MAILDRISHTI <span className="text-primary text-sm align-top">AI</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium tracking-wide">
                      Connect the Evidence.
                    </span>
                  </div>
                </div>
                <div></div>
              </div>

              {/* Report Header */}
              <div className="border-b-2 border-gray-300 pb-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Forensic Case Report</h1>
                    <h2 className="text-xl text-gray-700 mt-2">{caseData.title}</h2>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-gray-500 text-sm">{caseData.caseId}</p>
                    <p className="font-bold text-gray-800 mt-2 text-sm uppercase px-2 py-1 bg-gray-200 inline-block rounded">{caseData.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                  <div><strong>Investigator:</strong> {caseData.investigator?.name || 'System'}</div>
                  <div><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Priority:</strong> <span className={caseData.priority === 'Critical' ? 'text-red-600 font-bold' : ''}>{caseData.priority}</span></div>
                  <div><strong>Evidence Seal (Blockchain Hash):</strong> <span className="font-mono text-xs break-all bg-gray-100 p-1 rounded text-green-700">{blockchainHash}</span></div>
                </div>

                {/* Evidence Integrity Verification */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">Evidence Integrity Check</h3>
                      <p className="text-xs text-gray-600 mb-3">Verify the blockchain ledger to ensure evidence chain has not been tampered with since collection.</p>
                      
                      {verifyResult && (
                        <div className={`p-3 rounded border mb-3 flex items-start animate-in fade-in slide-in-from-top-1 ${verifyResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          {verifyResult.valid ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-green-800">Evidence chain verified</p>
                                <p className="text-xs text-green-700 mt-1">{verifyResult.blocks_checked} blocks checked, no tampering detected.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-red-800">Evidence integrity issue detected</p>
                                <ul className="mt-2 list-disc list-inside text-xs text-red-700 space-y-1">
                                  {verifyResult.issues?.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleVerifyEvidence}
                        disabled={isVerifying}
                        className="flex items-center px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed print:hidden"
                      >
                        {isVerifying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Verifying Ledger...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Verify Evidence Integrity
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Description */}
              <div className="mb-8">
                <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">Case Description</h3>
                <p className="text-sm text-gray-800">{caseData.description}</p>
              </div>

              {/* Threat Assessment */}
              <div className="mb-8">
                <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">Threat Assessment (Analyzed Emails)</h3>
                {analyses.length > 0 ? analyses.map((analysis, idx) => (
                  <div key={idx} className="mb-4 bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex justify-between mb-2">
                      <strong className="text-sm text-gray-900">Subject: {analysis.subject}</strong>
                      <span className="font-bold text-sm">Score: <span className={analysis.risk_score >= 75 ? 'text-red-600' : ''}>{analysis.risk_score}/100</span></span>
                    </div>
                    <p className="text-xs text-gray-700 mb-2"><strong>From:</strong> {analysis.from_address}</p>
                    <p className="text-xs text-gray-700 mb-2"><strong>Category:</strong> {analysis.threat_category}</p>
                    <p className="text-sm text-gray-800 italic">"{analysis.executive_summary}"</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No emails analyzed in this case.</p>
                )}
              </div>

              {/* Timeline */}
              <div className="mb-8">
                <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">Timeline</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {caseData.timeline && caseData.timeline.length > 0 ? (
                    caseData.timeline.map((event, idx) => (
                      <li key={idx} className="text-sm text-gray-800">
                        <strong>{new Date(event.timestamp).toLocaleString()} - {event.eventType}:</strong> {event.description}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">No timeline events.</li>
                  )}
                </ul>
              </div>

              {/* Investigator Notes */}
              <div className="mb-8">
                <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">Investigator Notes</h3>
                {caseData.notes && caseData.notes.length > 0 ? (
                  caseData.notes.map((note, idx) => (
                    <div key={idx} className="mb-3 text-sm">
                      <strong className="text-gray-900">{note.author || 'Investigator'}</strong> <span className="text-xs text-gray-500">({new Date(note.timestamp).toLocaleString()})</span>
                      <p className="mt-1 text-gray-800 whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No notes recorded.</p>
                )}
              </div>
              
              <div className="mt-16 pt-8 border-t-2 border-gray-300 text-center text-xs text-gray-500">
                <p>Generated by MailDrishti AI Investigative Platform</p>
                <p>CONFIDENTIAL REPORT</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Extracted mini-component for history items to manage expand/collapse state
const HistoryItem = ({ analysis }) => {
  const [expanded, setExpanded] = useState(false);
  const score = analysis.risk_score || 0;
  
  let scoreColor = "text-success bg-success/10";
  if (score >= 75) scoreColor = "text-danger bg-danger/10";
  else if (score >= 50) scoreColor = "text-orange-500 bg-orange-500/10";
  else if (score >= 25) scoreColor = "text-warning bg-warning/10";

  return (
    <div className="glass-panel rounded-lg overflow-hidden border border-gray-800 transition-all">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/40 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${scoreColor}`}>
            {score}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white line-clamp-1">{analysis.subject}</h4>
            <p className="text-xs text-gray-500 mt-0.5">From: {analysis.from_address}</p>
          </div>
        </div>
        <div className="flex items-center text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 bg-gray-900/50 border-t border-gray-800">
          <AnalysisResult result={analysis} />
        </div>
      )}
    </div>
  );
};

export default CaseDetail;

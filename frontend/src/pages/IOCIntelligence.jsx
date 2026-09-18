import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertCircle,
  Globe,
  Mail,
  Link as LinkIcon,
  FileWarning,
  Activity,
  ServerCrash
} from 'lucide-react';

const getRiskColor = (risk) => {
  switch (risk) {
    case 'Critical': return 'text-danger bg-danger/10 border-danger/20';
    case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'Medium': return 'text-warning bg-warning/10 border-warning/20';
    case 'Low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'IP': return <Activity className="w-4 h-4" />;
    case 'Domain': return <Globe className="w-4 h-4" />;
    case 'URL': return <LinkIcon className="w-4 h-4" />;
    case 'Email': return <Mail className="w-4 h-4" />;
    case 'Attachment': return <FileWarning className="w-4 h-4" />;
    default: return <ShieldAlert className="w-4 h-4" />;
  }
};

const getRiskScore = (risk) => {
  switch(risk) {
    case 'Critical': return 4;
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 0;
  }
}

const IOCIntelligence = ({ caseId }) => {
  const [iocs, setIocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const { token } = useAuth();

  const types = ['IP', 'Domain', 'URL', 'Email', 'Attachment'];

  useEffect(() => {
    fetchIocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const fetchIocs = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/iocs';
      if (caseId) url += `?caseId=${caseId}`;
      let res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let data = [];
      if (res.status === 404) {
        // Fallback: derive IOCs from analysis history
        const histRes = await fetch('http://localhost:5000/api/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (histRes.ok) {
          const historyData = await histRes.json();
          const derivedIocs = [];
          
          const getRisk = (score) => {
            if (score >= 75) return 'Critical';
            if (score >= 50) return 'High';
            if (score >= 25) return 'Medium';
            return 'Low';
          };

          historyData.filter(item => !caseId || item.caseId === caseId).forEach(item => {
            const risk = getRisk(item.risk_score || 0);
            const source = `${item.caseId} — ${item.subject}`;
            const addIocs = (arr, type) => {
              if (arr && Array.isArray(arr)) {
                arr.forEach(val => {
                  derivedIocs.push({
                    type,
                    value: val,
                    source,
                    caseId: item.caseId,
                    risk,
                    status: 'Under Review'
                  });
                });
              }
            };
            
            if (item.iocs) {
              addIocs(item.iocs.ip_addresses, 'IP');
              addIocs(item.iocs.domains, 'Domain');
              addIocs(item.iocs.urls, 'URL');
              addIocs(item.iocs.shortened_or_suspicious_urls, 'URL');
              addIocs(item.iocs.email_addresses, 'Email');
              addIocs(item.iocs.risky_attachments, 'Attachment');
            }
          });
          data = derivedIocs;
        }
      } else {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Failed to fetch IOCs (${res.status}): ${text}`);
        }
        data = await res.json();
      }
      
      setIocs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const filteredIocs = useMemo(() => {
    return iocs.filter(ioc => {
      // Filter by type
      if (selectedTypes.length > 0 && !selectedTypes.includes(ioc.type)) {
        return false;
      }
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const valueMatch = ioc.value?.toLowerCase().includes(query);
        const sourceMatch = ioc.source?.toLowerCase().includes(query);
        if (!valueMatch && !sourceMatch) return false;
      }
      return true;
    }).sort((a, b) => getRiskScore(b.risk) - getRiskScore(a.risk));
  }, [iocs, selectedTypes, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <ShieldAlert className="mr-3 text-primary h-6 w-6" />
            IOC Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">Aggregated Indicators of Compromise from all investigations</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by IOC value or source case..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-surface/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          <Filter className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
          {types.map(type => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5
                ${selectedTypes.includes(type) 
                  ? 'bg-primary/20 text-primary border-primary/30' 
                  : 'bg-surface border-gray-700 text-gray-400 hover:text-gray-200'}`}
            >
              {getTypeIcon(type)}
              {type}
            </button>
          ))}
          {selectedTypes.length > 0 && (
            <button 
              onClick={() => setSelectedTypes([])}
              className="text-xs text-gray-500 hover:text-gray-300 underline ml-2"
            >
              Clear
            </button>
          )}
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
      ) : iocs.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl flex flex-col items-center justify-center">
          <div className="bg-surface/50 p-6 rounded-full mb-4">
            <ShieldAlert className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Indicators Found</h3>
          <p className="text-gray-400 max-w-md">Analyze an email from a case to see extracted indicators here.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Type</th>
                  <th scope="col" className="px-6 py-4 font-medium">Value</th>
                  <th scope="col" className="px-6 py-4 font-medium">Risk</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                  <th scope="col" className="px-6 py-4 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredIocs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      No IOCs match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredIocs.map((ioc, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="flex items-center text-gray-300">
                          <span className="text-gray-500 mr-2">{getTypeIcon(ioc.type)}</span>
                          {ioc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-200">{ioc.value}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(ioc.risk)}`}>
                          {ioc.risk}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {ioc.status}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {ioc.source}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IOCIntelligence;

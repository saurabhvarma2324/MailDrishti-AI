import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ServerCrash,
  Globe,
  Mail,
  Link as LinkIcon,
  FileWarning,
  Activity,
  Cpu
} from 'lucide-react';

const getRiskColor = (label) => {
  if (label.includes('High Risk')) return 'text-danger bg-danger/10 border-danger/20';
  if (label.includes('Suspicious')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  if (label.includes('Low Suspicion')) return 'text-warning bg-warning/10 border-warning/20';
  return 'text-success bg-success/10 border-success/20';
};

const getRiskStroke = (score) => {
  if (score >= 75) return '#ef4444'; // danger
  if (score >= 50) return '#f97316'; // orange-500
  if (score >= 25) return '#f59e0b'; // warning
  return '#10b981'; // success
};

const getRiskIcon = (score) => {
  if (score >= 75) return <ServerCrash className="w-8 h-8 text-danger" />;
  if (score >= 50) return <ShieldAlert className="w-8 h-8 text-orange-500" />;
  if (score >= 25) return <AlertTriangle className="w-8 h-8 text-warning" />;
  return <CheckCircle2 className="w-8 h-8 text-success" />;
};

const AnalysisResult = ({ result }) => {
  if (!result) return null;

  const score = result.risk_score || 0;
  const strokeColor = getRiskStroke(score);
  const riskClass = getRiskColor(result.risk_label || '');

  return (
    <div className="space-y-6 mt-6 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* Disclaimer */}
      {result.ai_disclaimer && (
        <div className="flex items-start p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary-light">
          <Info className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{result.ai_disclaimer}</p>
        </div>
      )}

      {/* Top Section: Score & Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             {getRiskIcon(score)}
          </div>
          <h3 className="text-sm font-medium text-gray-400 mb-4">Risk Score</h3>
          
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-gray-800 stroke-current"
                strokeWidth="8"
                cx="50" cy="50" r="40"
                fill="transparent"
              />
              <circle
                className="stroke-current transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50" cy="50" r="40"
                fill="transparent"
                style={{
                  stroke: strokeColor,
                  strokeDasharray: 251.2,
                  strokeDashoffset: 251.2 - (251.2 * score) / 100,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{score}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>

          <div className={`mt-6 px-4 py-1.5 rounded-full text-sm font-semibold border text-center ${riskClass}`}>
            {result.risk_label}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{result.subject}</h3>
            <div className="flex items-center text-gray-400 text-sm mb-4">
              <Mail className="w-4 h-4 mr-2" />
              <span>From: <strong className="text-gray-300">{result.from_address}</strong></span>
            </div>
          </div>
          
          {/* Top Reasons Summary list inline */}
          {result.top_reasons && result.top_reasons.length > 0 && (
             <div className="space-y-3">
               <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">Key Indicators</h4>
               <div className="space-y-2">
                 {result.top_reasons.slice(0, 3).map((r, i) => (
                   <div key={i} className="flex items-center text-sm">
                     <Activity className="w-3.5 h-3.5 mr-2 text-primary" />
                     <span className="text-gray-300">{r.reason}</span>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Analysis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Header Forensics Panel */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-primary" />
            Header & Protocol Forensics
          </h3>
          
          <div className="space-y-5">
            <div className="flex gap-2">
              {['spf_result', 'dkim_result', 'dmarc_result'].map(protocol => {
                const val = result.header_findings?.[protocol];
                const label = protocol.split('_')[0].toUpperCase();
                let pClass = "bg-gray-800 text-gray-400 border-gray-700";
                let pIcon = null;
                
                if (val === 'pass') {
                  pClass = "bg-success/10 text-success border-success/30";
                  pIcon = <CheckCircle2 className="w-3 h-3 mr-1" />;
                } else if (val === 'fail') {
                  pClass = "bg-danger/10 text-danger border-danger/30";
                  pIcon = <ServerCrash className="w-3 h-3 mr-1" />;
                }
                
                return (
                  <div key={protocol} className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium ${pClass}`}>
                    {pIcon}
                    {label}: {val || 'None'}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-surface/50 p-3 rounded-lg border border-gray-800">
                <p className="text-gray-500 text-xs mb-1">Origin IP</p>
                <p className="text-gray-200 font-mono">{result.header_findings?.origin_ip_candidate || 'Unknown'}</p>
              </div>
              <div className="bg-surface/50 p-3 rounded-lg border border-gray-800">
                <p className="text-gray-500 text-xs mb-1">Relay Hops</p>
                <p className="text-gray-200">{result.header_findings?.relay_hop_count || 0}</p>
              </div>
            </div>

            {result.header_findings?.flags && result.header_findings.flags.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2">Anomalies Detected</p>
                <div className="flex flex-wrap gap-2">
                  {result.header_findings.flags.map((flag, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IOCs Panel */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-primary" />
            Extracted Evidence (IOCs)
          </h3>
          
          <div className="flex-1 space-y-4">
            {/* Suspicious URLs prioritized */}
            {result.iocs?.shortened_or_suspicious_urls?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-danger mb-2 flex items-center">
                  <FileWarning className="w-3.5 h-3.5 mr-1" />
                  Suspicious / Shortened URLs
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.iocs.shortened_or_suspicious_urls.map((url, i) => (
                    <span key={i} className="px-2 py-1 bg-danger/10 text-danger border border-danger/20 rounded text-xs break-all font-mono">
                      {url}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.iocs?.urls?.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2 flex items-center">
                  <LinkIcon className="w-3.5 h-3.5 mr-1" /> All URLs
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {result.iocs.urls.map((url, i) => (
                    <span key={i} className="px-2 py-1 bg-surface border border-gray-700 text-gray-300 rounded text-xs break-all font-mono">
                      {url}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {result.iocs?.domains?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2">Domains</p>
                  <div className="flex flex-col gap-1.5">
                    {result.iocs.domains.map((dom, i) => (
                      <span key={i} className="text-xs text-gray-300 font-mono truncate">{dom}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.iocs?.ip_addresses?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs mb-2">IP Addresses</p>
                  <div className="flex flex-col gap-1.5">
                    {result.iocs.ip_addresses.map((ip, i) => (
                      <span key={i} className="text-xs text-gray-300 font-mono">{ip}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Reasons Full List */}
      {result.top_reasons && result.top_reasons.length > 0 && (
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-base font-semibold text-white mb-4">Detailed Risk Contributors</h3>
          <div className="space-y-4">
            {result.top_reasons.map((reason, idx) => {
              // Calculate a visual width based on contribution score relative to others
              // Assuming contribution is a raw SHAP value or similar, let's normalize roughly for display
              // We'll just use a generic bar that is sized by Math.abs(contribution) * somewhat arbitrary multiplier, 
              // capped at 100% just for visual flair.
              const width = Math.min(Math.max(Math.abs(reason.contribution * 50), 10), 100);
              const isPositiveRisk = reason.contribution > 0;
              
              return (
                <div key={idx} className="bg-surface/30 p-3 rounded-lg border border-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-gray-200">{reason.reason}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">Feature: {reason.feature} = {reason.value}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${isPositiveRisk ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {isPositiveRisk ? '+' : ''}{reason.contribution.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isPositiveRisk ? 'bg-danger/70' : 'bg-success/70'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Items */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {result.blockchain?.block_hash ? (
          <div className="group relative flex items-center text-success border border-success/20 bg-success/5 px-3 py-1.5 rounded cursor-help">
            <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
            Evidence Sealed: <span className="font-mono ml-1">{result.blockchain.block_hash.substring(0, 12)}…</span>
            
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-72 bg-gray-900 border border-gray-700 p-3 rounded shadow-xl z-10 text-gray-300">
              <p className="font-semibold text-white mb-1">Blockchain Evidence Log</p>
              <div className="space-y-1 mt-2 font-mono text-[10px] break-all">
                <p><span className="text-gray-500">Block:</span> {result.blockchain.block_index}</p>
                <p><span className="text-gray-500">Hash:</span> {result.blockchain.block_hash}</p>
                <p><span className="text-gray-500">Evidence:</span> {result.blockchain.evidence_hash}</p>
                <p><span className="text-gray-500">Sealed:</span> {new Date(result.blockchain.sealed_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div></div>
        )}
        
        {result.model_note && (
          <p className="text-gray-600 italic">
            Model Info: {result.model_note}
          </p>
        )}
      </div>

    </div>
  );
};

export default AnalysisResult;

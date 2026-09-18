import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Globe2,
  AlertCircle,
  Info,
  ServerCrash,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

// Fix Leaflet's default icon path issues by using standard lucide react HTML
const createCustomIcon = (risk) => {
  let colorClass = 'text-success';
  let IconComponent = CheckCircle2;
  let bgColor = 'bg-success/20';

  if (risk === 'Critical') {
    colorClass = 'text-danger';
    IconComponent = ServerCrash;
    bgColor = 'bg-danger/20';
  } else if (risk === 'High') {
    colorClass = 'text-orange-500';
    IconComponent = ShieldAlert;
    bgColor = 'bg-orange-500/20';
  } else if (risk === 'Medium') {
    colorClass = 'text-warning';
    IconComponent = AlertTriangle;
    bgColor = 'bg-warning/20';
  }

  const iconHtml = renderToString(
    <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-gray-700/50 backdrop-blur-md ${bgColor} ${colorClass}`}>
      <IconComponent size={18} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};


const getRiskColor = (risk) => {
  switch (risk) {
    case 'Critical': return 'text-danger bg-danger/10 border-danger/20';
    case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'Medium': return 'text-warning bg-warning/10 border-warning/20';
    case 'Low': return 'text-success bg-success/10 border-success/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const GeoIntelligence = ({ caseId }) => {
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchGeoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const fetchGeoData = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/geo';
      if (caseId) url += `?caseId=${caseId}`;
      let res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let data = [];
      if (res.status === 404) {
        // Fallback: derive Geo Intelligence from analysis history
        const histRes = await fetch('http://localhost:5000/api/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (histRes.ok) {
          const historyData = await histRes.json();
          const geoMap = new Map();
          
          const getRisk = (score) => {
            if (score >= 75) return 'Critical';
            if (score >= 50) return 'High';
            if (score >= 25) return 'Medium';
            return 'Low';
          };
          
          // Helper to generate some consistent mock geo data for public IPs
          const assignGeo = (ip) => {
            if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
              return { lat: null, lon: null, country: '', city: '', isp: 'Internal/Private', source: 'internal' };
            }
            // Just assigning a couple of distinct mock locations based on last digit being even/odd
            const lastDigit = parseInt(ip.split('.').pop() || '0', 10);
            if (lastDigit % 2 === 0) {
              return { lat: 51.5074, lon: -0.1278, country: 'United Kingdom', city: 'London', isp: 'Cloudflare', source: 'demo-fallback' };
            } else {
              return { lat: 40.7128, lon: -74.0060, country: 'United States', city: 'New York', isp: 'AWS', source: 'demo-fallback' };
            }
          };

          historyData.filter(item => !caseId || item.caseId === caseId).forEach(item => {
            const ip = item.header_findings?.origin_ip_candidate;
            if (ip) {
              if (!geoMap.has(ip)) {
                geoMap.set(ip, {
                  ip,
                  risk: getRisk(item.risk_score || 0),
                  relatedCases: new Set(),
                  relatedEmails: new Set(),
                  ...assignGeo(ip)
                });
              }
              const entry = geoMap.get(ip);
              entry.relatedCases.add(item.caseId);
              entry.relatedEmails.add(item.subject);
              // elevate risk if necessary
              const newRisk = getRisk(item.risk_score || 0);
              if (newRisk === 'Critical' || (newRisk === 'High' && entry.risk !== 'Critical')) {
                entry.risk = newRisk;
              }
            }
          });
          
          data = Array.from(geoMap.values()).map(g => ({
            ...g,
            relatedCases: Array.from(g.relatedCases),
            relatedEmails: Array.from(g.relatedEmails)
          }));
        }
      } else {
        if (!res.ok) throw new Error('Failed to fetch Geo Intelligence data');
        data = await res.json();
      }
      
      setGeoData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const publicIps = geoData.filter(d => d.lat !== null && d.lon !== null);
  const privateIps = geoData.filter(d => d.lat === null || d.lon === null);

  // Calculate center of map based on data, default to Europe/Global view if none
  const defaultCenter = [48.8566, 2.3522];
  const center = publicIps.length > 0 
    ? [publicIps[0].lat, publicIps[0].lon]
    : defaultCenter;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Globe2 className="mr-3 text-primary h-6 w-6" />
            Geo Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">Geographic distribution of suspicious IP addresses across all cases</p>
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
      ) : (
        <div className="space-y-6">
          <div className="glass-panel p-2 rounded-xl overflow-hidden relative shadow-xl border border-gray-800 h-[500px]">
            {/* The leaflet map container */}
            <div className="h-full w-full rounded-lg overflow-hidden relative z-0">
              <MapContainer 
                center={center} 
                zoom={2} 
                style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {publicIps.map((geo, idx) => (
                  <Marker 
                    key={idx} 
                    position={[geo.lat, geo.lon]}
                    icon={createCustomIcon(geo.risk)}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 text-gray-800 min-w-[200px]">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm text-gray-900 font-mono">{geo.ip}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            geo.risk === 'Critical' ? 'bg-red-100 text-red-800 border-red-200' :
                            geo.risk === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            geo.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            {geo.risk}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 mb-3">
                          <p><strong className="text-gray-500 font-medium">Location:</strong> {geo.city ? `${geo.city}, ` : ''}{geo.region ? `${geo.region}, ` : ''}{geo.country || 'Unknown'}</p>
                          <p><strong className="text-gray-500 font-medium">ISP:</strong> {geo.isp || 'Unknown'}</p>
                          <p><strong className="text-gray-500 font-medium">Source:</strong> {geo.source}</p>
                        </div>
                        
                        {(geo.relatedCases?.length > 0 || geo.relatedEmails?.length > 0) && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Related Context</p>
                            {geo.relatedCases?.length > 0 && (
                              <p className="text-xs truncate" title={geo.relatedCases.join(', ')}>
                                <strong className="text-gray-600">Cases:</strong> {geo.relatedCases.join(', ')}
                              </p>
                            )}
                            {geo.relatedEmails?.length > 0 && (
                              <p className="text-xs truncate" title={geo.relatedEmails.join(', ')}>
                                <strong className="text-gray-600">Subjects:</strong> {geo.relatedEmails.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            
            <div className="absolute bottom-4 left-4 z-[400] max-w-sm pointer-events-none">
              <div className="bg-surface/80 backdrop-blur-md p-3 rounded-lg border border-gray-700/50 shadow-lg text-xs flex items-start text-gray-300">
                <Info className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                <p>Approximate network/geographic location — not exact physical tracking.</p>
              </div>
            </div>
          </div>

          {/* Internal / Private IPs Table */}
          {privateIps.length > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden shadow-xl mt-6">
              <div className="px-6 py-4 border-b border-gray-800 bg-surface/50 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Internal & Private Network IPs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-surface/30 text-gray-400 border-b border-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-medium">IP Address</th>
                      <th scope="col" className="px-6 py-3 font-medium">Risk</th>
                      <th scope="col" className="px-6 py-3 font-medium">ISP / Network</th>
                      <th scope="col" className="px-6 py-3 font-medium">Related Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {privateIps.map((ip, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-3 font-mono text-gray-200">{ip.ip}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRiskColor(ip.risk)}`}>
                            {ip.risk}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-400">{ip.isp || 'Internal Network'}</td>
                        <td className="px-6 py-3 text-gray-500 text-xs truncate max-w-xs" title={ip.relatedCases?.join(', ')}>
                          {ip.relatedCases?.join(', ') || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export default GeoIntelligence;

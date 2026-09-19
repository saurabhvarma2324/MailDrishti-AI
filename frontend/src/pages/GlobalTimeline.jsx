import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Link as LinkIcon, Lock, Activity, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getTimelineIcon = (eventType) => {
  const type = eventType?.toLowerCase() || '';
  if (type.includes('threat')) return <Shield className="w-4 h-4 text-primary" />;
  if (type.includes('ioc') || type.includes('extract')) return <LinkIcon className="w-4 h-4 text-purple-500" />;
  if (type.includes('seal') || type.includes('lock')) return <Lock className="w-4 h-4 text-success" />;
  return <Activity className="w-4 h-4 text-gray-400" />;
};

const GlobalTimeline = () => {
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGlobalTimeline();
  }, []);

  const fetchGlobalTimeline = async () => {
    try {
      setLoading(true);
      // 1. Fetch all cases
      const resCases = await fetch(`${API_BASE_URL}/api/cases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resCases.ok) throw new Error('Failed to fetch cases');
      const casesData = await resCases.json();

      // 2. Fetch details for each case to get timeline
      const fetchDetailsPromises = casesData.map(c => 
        fetch(`${API_BASE_URL}/api/cases/${c._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      );

      const detailedCases = await Promise.all(fetchDetailsPromises);

      // 3. Merge timelines
      let allEvents = [];
      detailedCases.forEach(c => {
        if (c.timeline && Array.isArray(c.timeline)) {
          const caseEvents = c.timeline.map(event => ({
            ...event,
            case_id: c._id,
            caseId: c.caseId,
            caseTitle: c.title
          }));
          allEvents = [...allEvents, ...caseEvents];
        }
      });

      // 4. Sort chronologically (newest first)
      allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setTimelineEvents(allEvents);
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
            <Clock className="mr-3 text-primary h-6 w-6" />
            Global Timeline
          </h1>
          <p className="text-sm text-gray-400 mt-1">Activity across all investigations</p>
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
      ) : timelineEvents.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl flex flex-col items-center justify-center">
          <div className="bg-surface/50 p-6 rounded-full mb-4">
            <Clock className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Timeline Events</h3>
          <p className="text-gray-400 max-w-md">There is no activity recorded across any cases yet.</p>
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-xl">
          <div className="relative border-l border-gray-700 ml-4 space-y-8 pb-4 mt-4">
            {timelineEvents.map((event, index) => (
              <div key={index} className="relative pl-8">
                <div className="absolute -left-4 top-1 w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shadow-lg">
                  {getTimelineIcon(event.eventType)}
                </div>
                <div className="glass-panel p-4 rounded-lg border border-gray-800/60 shadow-sm hover:border-gray-700 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{event.eventType}</h3>
                      <button 
                        onClick={() => navigate(`/cases/${event.case_id}`, { state: { tab: 'Timeline' } })}
                        className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
                        title={`Go to case: ${event.caseTitle}`}
                      >
                        {event.caseId}
                      </button>
                    </div>
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
        </div>
      )}
    </div>
  );
};

export default GlobalTimeline;

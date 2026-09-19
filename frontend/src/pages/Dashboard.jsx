import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  MailSearch, 
  ShieldAlert, 
  Crosshair, 
  AlertTriangle, 
  Globe, 
  ServerCrash,
  Activity,
  CheckCircle2,
  Plus
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COLORS = [
  '#ef4444', // red for malware/phishing
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6b7280', // gray
];

const getRiskColor = (riskScore) => {
  if (typeof riskScore === 'number') {
    if (riskScore >= 75) return 'text-danger bg-danger/10 border-danger/20';
    if (riskScore >= 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (riskScore >= 25) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-success bg-success/10 border-success/20';
  }
  
  // string fallback
  const r = (riskScore || '').toUpperCase();
  if (r === 'CRITICAL' || r === 'HIGH') return 'text-danger bg-danger/10 border-danger/20';
  if (r === 'MEDIUM' || r === 'SUSPICIOUS') return 'text-warning bg-warning/10 border-warning/20';
  if (r === 'LOW' || r === 'SAFE') return 'text-success bg-success/10 border-success/20';
  return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
};

const getRiskIcon = (riskScore) => {
  if (typeof riskScore === 'number') {
    if (riskScore >= 75) return <ServerCrash className="w-3 h-3 mr-1" />;
    if (riskScore >= 50) return <ShieldAlert className="w-3 h-3 mr-1" />;
    if (riskScore >= 25) return <AlertTriangle className="w-3 h-3 mr-1" />;
    return <CheckCircle2 className="w-3 h-3 mr-1" />;
  }
  
  const r = (riskScore || '').toUpperCase();
  if (r === 'CRITICAL' || r === 'HIGH') return <ServerCrash className="w-3 h-3 mr-1" />;
  if (r === 'MEDIUM' || r === 'SUSPICIOUS') return <AlertTriangle className="w-3 h-3 mr-1" />;
  if (r === 'LOW' || r === 'SAFE') return <CheckCircle2 className="w-3 h-3 mr-1" />;
  return null;
};

const getRiskLabel = (riskScore) => {
  if (typeof riskScore === 'number') {
    if (riskScore >= 75) return 'CRITICAL';
    if (riskScore >= 50) return 'HIGH';
    if (riskScore >= 25) return 'SUSPICIOUS';
    return 'SAFE';
  }
  return riskScore || 'UNKNOWN';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-gray-700 p-2 rounded shadow-lg text-sm">
        <p className="text-gray-300 font-medium">{label}</p>
        <p className="text-primary font-bold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Failed to load dashboard data: {error}
      </div>
    );
  }

  // Format data for charts
  const threatDistData = Object.entries(stats.threatDistribution || {}).map(([name, value], idx) => ({
    name,
    value,
    color: COLORS[idx % COLORS.length]
  }));

  const riskDistData = stats.riskDistribution ? [
    { risk: 'Low', count: stats.riskDistribution.Low || 0 },
    { risk: 'Medium', count: stats.riskDistribution.Medium || 0 },
    { risk: 'High', count: stats.riskDistribution.High || 0 },
    { risk: 'Critical', count: stats.riskDistribution.Critical || 0 },
  ] : [];

  const threatsOverTimeData = stats.threatsOverTime || [];
  const recentCases = stats.recentInvestigations || [];

  const isEmpty = stats.totalCases === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">SOC Dashboard</h1>
        </div>
        
        <div className="glass-panel p-16 text-center rounded-xl flex flex-col items-center justify-center max-w-3xl mx-auto mt-12 border border-primary/20 bg-gradient-to-br from-surface to-surface/40 shadow-xl shadow-primary/5">
          <div className="bg-primary/10 p-6 rounded-full mb-6 border border-primary/20">
            <Activity className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Welcome to MailDrishti AI</h2>
          <p className="text-gray-400 max-w-lg mb-8 text-lg">
            Your intelligence dashboard is ready, but there's no data yet. Start your first investigation to see real-time metrics, threat distributions, and analysis charts here.
          </p>
          <button 
            onClick={() => navigate('/cases')}
            className="flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary/20 text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create First Case
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">SOC Dashboard</h1>
        <div className="text-sm text-gray-400">Live View</div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: stats.totalCases || 0, icon: Briefcase, color: 'text-primary' },
          { label: 'Emails Analyzed', value: stats.emailsAnalyzed || 0, icon: MailSearch, color: 'text-success' },
          { label: 'High-Risk Threats', value: stats.highRiskThreats || 0, icon: ShieldAlert, color: 'text-orange-500' },
          { label: 'IOCs Extracted', value: stats.iocsExtracted || 0, icon: Crosshair, color: 'text-purple-500' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{kpi.value.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-lg bg-surface border border-gray-800 ${kpi.color}`}>
              <kpi.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Critical Threats', value: stats.criticalThreats || 0, icon: AlertTriangle, color: 'text-danger' },
          { label: 'Suspicious Domains', value: stats.suspiciousDomains || 0, icon: Globe, color: 'text-warning' },
          { label: 'Suspicious IPs', value: stats.suspiciousIPs || 0, icon: ServerCrash, color: 'text-warning' },
          { label: 'Active Investigations', value: stats.activeInvestigations || 0, icon: Activity, color: 'text-primary' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface/50 border border-gray-800 p-4 rounded-lg flex items-center space-x-3">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <div>
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-lg font-semibold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Threat Distribution</h3>
          {threatDistData.length > 0 ? (
            <>
              <div className="h-64 w-full min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
                    <Pie
                      data={threatDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {threatDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {threatDistData.map((entry, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-400 bg-surface/50 px-2 py-1 rounded border border-gray-800">
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></span>
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              No threat data available yet.
            </div>
          )}
        </div>

        {/* Line Chart */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Threats Over Time (7 Days)</h3>
          {threatsOverTimeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={threatsOverTimeData} margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => {
                    const parts = (val || '').split('-');
                    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
                  }} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No timeline data available yet.
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Risk Distribution</h3>
          {riskDistData.some(d => d.count > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistData} margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="risk" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskDistData.map((entry, index) => {
                      let fill = '#3b82f6';
                      if (entry.risk === 'Critical') fill = '#ef4444';
                      else if (entry.risk === 'High') fill = '#f97316';
                      else if (entry.risk === 'Medium') fill = '#f59e0b';
                      else if (entry.risk === 'Low') fill = '#10b981';
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No risk data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Investigations Table */}
      <div className="glass-panel rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-base font-semibold text-white">Recent Investigations</h3>
          {recentCases.length > 0 && (
            <button 
              onClick={() => navigate('/cases')}
              className="text-sm text-primary hover:text-primary-light transition-colors font-medium"
            >
              View All
            </button>
          )}
        </div>
        {recentCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface/50 text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Case ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Subject</th>
                  <th scope="col" className="px-6 py-3 font-medium">Risk Score</th>
                  <th scope="col" className="px-6 py-3 font-medium">Threat Type</th>
                  <th scope="col" className="px-6 py-3 font-medium">Date</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Investigator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentCases.map((c, i) => (
                  <tr 
                    key={c._id || c.caseId || i} 
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/cases/${c._id || c.caseId}`)}
                  >
                    <td className="px-6 py-4 font-medium text-primary">{c.caseId || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-200">{c.subject || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(c.risk_score)}`}>
                        {getRiskIcon(c.risk_score)}
                        {getRiskLabel(c.risk_score)}
                        {typeof c.risk_score === 'number' ? ` (${c.risk_score})` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {c.threat_type || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {c.date ? new Date(c.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{c.status || 'Unknown'}</td>
                    <td className="px-6 py-4 text-gray-400">{c.investigator || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No recent investigations found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

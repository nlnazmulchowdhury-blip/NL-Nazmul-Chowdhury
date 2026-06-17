import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Layers, Repeat, Users as UsersIcon, TrendingUp,
  Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { getAdminDashboard } from '../../api';

const iconMap = {
  tools: Wrench,
  categories: Layers,
  conversions: Repeat,
  users: UsersIcon,
};

const colorMap = {
  tools: 'from-indigo-500 to-blue-600',
  categories: 'from-purple-500 to-pink-600',
  conversions: 'from-emerald-500 to-teal-600',
  users: 'from-amber-500 to-orange-600',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const totals = [
    { key: 'tools', label: 'Tools', value: data?.totals?.tools || 0 },
    { key: 'categories', label: 'Categories', value: data?.totals?.categories || 0 },
    { key: 'conversions', label: 'Conversions', value: data?.totals?.conversions || 0 },
    { key: 'users', label: 'Users', value: data?.totals?.users || 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your ProConverterBD platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totals.map((stat) => {
          const Icon = iconMap[stat.key];
          const grad = colorMap[stat.key];
          return (
            <div key={stat.key} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: data?.periods?.today || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'This Week', value: data?.periods?.this_week || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'This Month', value: data?.periods?.this_month || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((p) => (
          <div key={p.label} className={`${p.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${p.color}`}>{p.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">Conversions {p.label}</p>
          </div>
        ))}
      </div>

      {/* Conversions by status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data?.by_status && Object.entries(data.by_status).map(([status, count]) => {
          const colors = {
            completed: 'bg-green-50 text-green-600 border-green-200',
            processing: 'bg-blue-50 text-blue-600 border-blue-200',
            failed: 'bg-red-50 text-red-600 border-red-200',
            pending: 'bg-amber-50 text-amber-600 border-amber-200',
          };
          const icons = {
            completed: CheckCircle,
            processing: Loader2,
            failed: XCircle,
            pending: Clock,
          };
          const Icon = icons[status] || Clock;
          return (
            <div key={status} className={`rounded-xl border p-3 ${colors[status] || 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Icon size={16} className={status === 'processing' ? 'animate-spin' : ''} />
                <span className="text-xs font-medium capitalize">{status}</span>
              </div>
              <p className="text-lg font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Top Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            Top 5 Tools by Conversions
          </h3>
          {data?.by_tool?.length > 0 ? (
            <div className="space-y-2">
              {data.by_tool.map((t, i) => (
                <div key={t.slug} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700">{t.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{t.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No conversions yet</p>
          )}
        </div>

        {/* Recent Conversions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            Recent Conversions
          </h3>
          {data?.recent?.length > 0 ? (
            <div className="space-y-1">
              {data.recent.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-gray-700 truncate font-medium">{c.original_filename || 'Unknown'}</p>
                    <p className="text-gray-400 truncate">{c.tool_name}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    c.status === 'completed' ? 'bg-green-50 text-green-600' :
                    c.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No recent conversions</p>
          )}
        </div>
      </div>
    </div>
  );
}

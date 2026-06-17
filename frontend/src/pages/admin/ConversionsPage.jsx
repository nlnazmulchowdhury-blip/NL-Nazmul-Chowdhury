import { useState, useEffect } from 'react';
import { History, Download, Filter, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getAdminConversions } from '../../api';

const statusConfig = {
  completed: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  failed: { icon: XCircle, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  processing: { icon: Loader2, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  pending: { icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
};

export default function ConversionsPage() {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toolFilter, setToolFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (toolFilter) params.tool = toolFilter;

    getAdminConversions(params)
      .then(setConversions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, toolFilter]);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tools = [...new Set(conversions.map(c => c.tool_slug).filter(Boolean))];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversion History</h1>
          <p className="text-gray-500 text-sm mt-1">{conversions.length} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
          <Filter size={14} className="text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm outline-none bg-transparent text-gray-600">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        {tools.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-gray-400" />
            <select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)}
              className="text-sm outline-none bg-transparent text-gray-600">
              <option value="">All Tools</option>
              {tools.map(slug => (
                <option key={slug} value={slug}>{slug}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : conversions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <History size={32} className="mx-auto mb-3" />
            <p className="text-sm">No conversions found</p>
          </div>
        ) : (
          conversions.map((c) => {
            const config = statusConfig[c.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {c.original_filename || 'Unknown file'}
                      </span>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.text}`}>
                        <StatusIcon size={11} className={c.status === 'processing' ? 'animate-spin' : ''} />
                        {c.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span>{c.tool_name}</span>
                      <span>{formatSize(c.file_size)}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    {c.error_message && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-500">
                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                        <span>{c.error_message}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.download_url && (
                      <a
                        href={c.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Download"
                      >
                        <Download size={15} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

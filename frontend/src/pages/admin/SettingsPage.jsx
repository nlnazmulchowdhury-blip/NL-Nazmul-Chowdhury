import { useState, useEffect } from 'react';
import {
  Settings, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '../../api';

const sensitiveKeys = ['google_analytics_id', 'adsense_publisher_id'];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState({});

  useEffect(() => {
    getAdminSettings()
      .then((data) => {
        setSettings(data.settings || {});
        setMeta(data.meta || {});
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateAdminSettings(settings);
      setSuccess(result.message || 'Settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = (key) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderField = (key) => {
    const m = meta[key] || {};
    const val = settings[key] || '';
    const type = m.value_type || 'string';

    if (type === 'boolean') {
      return (
        <label key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-indigo-50/50 transition-colors">
          <input
            type="checkbox"
            checked={val === 'true'}
            onChange={(e) => handleChange(key, e.target.checked ? 'true' : 'false')}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">{m.label || key}</p>
            {m.description && <p className="text-xs text-gray-400">{m.description}</p>}
          </div>
        </label>
      );
    }

    if (type === 'color') {
      return (
        <div key={key}>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">{m.label || key}</label>
          {m.description && <p className="text-xs text-gray-400 mb-1.5">{m.description}</p>}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={val || '#6366f1'}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={val}
              onChange={(e) => handleChange(key, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="#6366f1"
            />
          </div>
        </div>
      );
    }

    if (type === 'integer') {
      return (
        <div key={key}>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">{m.label || key}</label>
          {m.description && <p className="text-xs text-gray-400 mb-1.5">{m.description}</p>}
          <input
            type="number"
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      );
    }

    if (type === 'text') {
      return (
        <div key={key}>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">{m.label || key}</label>
          {m.description && <p className="text-xs text-gray-400 mb-1.5">{m.description}</p>}
          <textarea
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            rows={3}
          />
        </div>
      );
    }

    // Default: string, email, url
    const isSensitive = sensitiveKeys.includes(key);
    return (
      <div key={key}>
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{m.label || key}</label>
        {m.description && <p className="text-xs text-gray-400 mb-1.5">{m.description}</p>}
        <div className="relative">
          <input
            type={isSensitive && !visible[key] ? 'password' : 'text'}
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pr-9"
            placeholder={m.label || key}
          />
          {isSensitive && (
            <button
              type="button"
              onClick={() => toggleVisible(key)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {visible[key] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const keys = Object.keys(meta);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure your ProConverterBD site</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-green-500" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {keys.map((key) => (
            <div key={key}>{renderField(key)}</div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{keys.length} settings</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary !py-2 !px-5 text-sm flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

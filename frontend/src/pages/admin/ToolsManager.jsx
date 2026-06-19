import { useState, useEffect } from 'react';
import {
  Plus, PenSquare, Trash2, Search,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { getAdminTools, getAdminCategories, createAdminTool, updateAdminTool, deleteAdminTool } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import AdminModal from '../../components/AdminModal';
import AdminPageHeader from '../../components/AdminPageHeader';

export default function ToolsManager() {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', category_slug: '', description: '', icon: 'wrench',
    color: '#6366f1', max_file_size_mb: 10, is_active: true,
  });

  const load = () => {
    setLoading(true);
    Promise.all([getAdminTools(), getAdminCategories()])
      .then(([t, c]) => { setTools(t); setCategories(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category_slug: categories[0]?.slug || '', description: '', icon: 'wrench', color: '#6366f1', max_file_size_mb: 10, is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (tool) => {
    setEditing(tool);
    setForm({
      name: tool.name, category_slug: tool.category_slug, description: tool.description,
      icon: tool.icon, color: tool.color, max_file_size_mb: tool.max_file_size_mb, is_active: tool.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateAdminTool(editing.id, form);
      } else {
        await createAdminTool(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save tool.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tool) => {
    if (!window.confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminTool(tool.id);
      load();
    } catch (err) {
      alert('Failed to delete tool.');
    }
  };

  const handleToggle = async (tool) => {
    try {
      await updateAdminTool(tool.id, { ...tool, is_active: !tool.is_active });
      load();
    } catch {}
  };

  const filtered = tools.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) ||
           t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader
        title="Tools"
        subtitle={`${tools.length} tools total`}
        actions={
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-48"
              />
            </div>
            <button onClick={openCreate} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
              <Plus size={16} /> Add Tool
            </button>
          </>
        }
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner className="!py-16" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <WrenchIcon className="mx-auto mb-3" size={32} />
            <p className="text-sm">No tools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Slug</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Active</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: tool.color + '18', color: tool.color }}>
                          {tool.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{tool.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{tool.category_name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{tool.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(tool)} className="mx-auto">
                        {tool.is_active
                          ? <ToggleRight size={22} className="text-indigo-500" />
                          : <ToggleLeft size={22} className="text-gray-300" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(tool)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                          <PenSquare size={15} />
                        </button>
                        <button onClick={() => handleDelete(tool)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Tool' : 'Add New Tool'}
        error={error}
        saving={saving}
        onSave={handleSave}
        saveLabel={editing ? 'Update' : 'Create'}
        maxWidth="max-w-lg"
      >
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="Tool name" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
          <select value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            rows={3} placeholder="Tool description" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Icon</label>
            <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" placeholder="lucide-icon" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-[38px] px-1 py-1 border border-gray-200 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Max (MB)</label>
            <input type="number" min="1" value={form.max_file_size_mb}
              onChange={(e) => setForm({ ...form, max_file_size_mb: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label htmlFor="is_active" className="text-sm text-gray-600">Active</label>
        </div>
      </AdminModal>
    </div>
  );
}

function WrenchIcon({ className, size }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
}

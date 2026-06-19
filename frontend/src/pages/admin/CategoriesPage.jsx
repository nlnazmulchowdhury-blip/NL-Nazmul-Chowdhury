import { useState, useEffect } from 'react';
import {
  Package, Plus, PenSquare, Trash2, X, Check, AlertCircle,
  ToggleRight, ToggleLeft, Loader2
} from 'lucide-react';
import { getAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory } from '../../api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', icon: 'folder', order: 0, is_active: true,
  });

  const load = () => {
    setLoading(true);
    setError('');
    getAdminCategories()
      .then(setCategories)
      .catch((err) => {
        console.error('Failed to load categories:', err.message || err);
        setError(err.message || 'Failed to load categories.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', icon: 'folder', order: categories.length, is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name, description: cat.description || '',
      icon: cat.icon, order: cat.order, is_active: cat.is_active,
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
        await updateAdminCategory(editing.id, form);
      } else {
        await createAdminCategory(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    setDeleting(cat.id);
    setError('');
    try {
      await deleteAdminCategory(cat.id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete.');
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-1">{categories.length} categories</p>
        </div>
        <button onClick={openCreate} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5 shrink-0">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group relative">
              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                  title="Edit"
                >
                  <PenSquare size={14} />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  disabled={deleting === cat.id}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 shadow-sm transition-all disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package size={20} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  cat.is_active ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {cat.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {cat.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900">{cat.name}</h3>
              {cat.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
              )}

              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <span>Order: {cat.order}</span>
                <span>•</span>
                <span>{cat.tool_count} tools</span>
                <span>•</span>
                <span className="font-mono">{cat.slug}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? 'Edit Category' : 'Add New Category'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Category name" autoFocus />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  rows={3} placeholder="Brief description" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Icon</label>
                  <input type="text" value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                    placeholder="lucide-icon" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Order</label>
                  <input type="number" min="0" value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm text-gray-600">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary !py-2 !px-4 text-sm flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary !py-2 !px-4 text-sm flex-1 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

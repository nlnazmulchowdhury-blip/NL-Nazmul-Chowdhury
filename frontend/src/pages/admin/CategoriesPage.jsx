import { useState, useEffect } from 'react';
import {
  Package, Plus, PenSquare, Trash2,
  ToggleRight, ToggleLeft, Loader2
} from 'lucide-react';
import { getAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import AdminModal from '../../components/AdminModal';
import AdminPageHeader from '../../components/AdminPageHeader';

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
    getAdminCategories()
      .then(setCategories)
      .catch(() => {})
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
      <AdminPageHeader
        title="Categories"
        subtitle={`${categories.length} categories`}
        actions={
          <button onClick={openCreate} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5 shrink-0">
            <Plus size={16} /> Add Category
          </button>
        }
      />

      <AlertMessage type="error" message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full">
            <LoadingSpinner className="!py-16" />
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

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Category' : 'Add New Category'}
        error={error}
        saving={saving}
        onSave={handleSave}
        saveLabel={editing ? 'Update' : 'Create'}
      >
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
      </AdminModal>
    </div>
  );
}

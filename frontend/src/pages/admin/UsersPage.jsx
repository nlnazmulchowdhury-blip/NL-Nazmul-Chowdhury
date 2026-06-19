import { useState } from 'react';
import { Users, Shield, Calendar, Activity, Search } from 'lucide-react';
import { getAdminUsers } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import AdminPageHeader from '../../components/AdminPageHeader';
import useAsyncData from '../../hooks/useAsyncData';

export default function UsersPage() {
  const { data: users, loading } = useAsyncData(getAdminUsers);
  const [search, setSearch] = useState('');

  const filtered = (users || []).filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle={`${(users || []).length} registered users`}
        actions={
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-48"
            />
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner className="!py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.username}</p>
                          <p className="text-xs text-gray-400">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_superuser ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-600">
                          <Shield size={11} /> Superuser
                        </span>
                      ) : u.is_staff ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600">
                          <Activity size={11} /> Staff
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        u.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

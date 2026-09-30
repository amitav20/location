/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { timeAgo } from '../utils/time';
import { Report, User } from '../types';
import { AlertCircle, CheckSquare, Search, Shield, Trash2 } from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

interface AdminUserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  isBanned: boolean;
  isAdmin: boolean;
}

interface AdminBusinessRow {
  id: string;
  name: string;
  category: string;
  isVerified: boolean;
  ownerName: string;
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusinessRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminErr, setAdminErr] = useState<string>('');

  const load = async () => {
    setAdminErr('');
    try {
      const res = await api.getAdminMetrics();
      setMetrics(res.metrics);
      setUsers(res.users);
      setBusinesses(res.businesses);
      setReports(res.reports);
    } catch (err) {
      setAdminErr(errorText(err, 'You must be an administrator to see this page.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      load();
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong.'));
    }
  };

  const toggleBan = async (u: AdminUserRow) => {
    if (!u.isBanned && !(await confirmAction(`Ban ${u.name}? They will be signed out and unable to sign in.`, 'Ban'))) return;
    act(() => api.banUser(u.id), u.isBanned ? `${u.name} was unbanned.` : `${u.name} was banned.`);
  };

  const removeContent = async (r: Report) => {
    const what = r.targetType === 'user' ? 'ban this user' : `delete this ${r.targetType}`;
    if (!(await confirmAction(`Do you want to ${what}? This resolves all reports about it.`, 'Confirm'))) return;
    act(() => api.removeReportedContent(r.id), 'Done. The report is resolved.');
  };

  if (adminErr) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
        <AlertCircle size={34} className="text-red-500 mx-auto" />
        <h3 className="font-bold text-red-800 text-sm">Admin access required</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto">{adminErr}</p>
      </div>
    );
  }

  const shownUsers = users.filter(
    (u) => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())
  );
  const sortedBusinesses = [...businesses].sort((a, b) => Number(a.isVerified) - Number(b.isVerified));
  const shownReports = reports.filter((r) => showResolved || r.status !== 'resolved');

  return (
    <div className="space-y-6" id="admin-workspace">
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Shield size={22} /> Admin Dashboard
          </h2>
          <p className="text-xs text-rose-100 mt-1">Manage users, verify businesses and review reports.</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-xl">
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500 font-semibold">Loading admin data...</p>
        </div>
      ) : (
        <>
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Active users', count: metrics.activeUsers, color: 'text-emerald-600' },
                { label: 'Banned', count: metrics.bannedCount, color: 'text-red-600' },
                { label: 'Verified shops', count: metrics.verifiedBiz, color: 'text-teal-600' },
                { label: 'Awaiting verification', count: metrics.unverifiedBiz, color: 'text-amber-600' },
                { label: 'Posts', count: metrics.totalPosts, color: 'text-indigo-600' },
                { label: 'Open reports', count: metrics.pendingReports, color: 'text-rose-600' }
              ].map((m) => (
                <div key={m.label} className="bg-white p-4 rounded-2xl border border-gray-200 text-center">
                  <span className="text-xs text-gray-500 font-bold block">{m.label}</span>
                  <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reports first: they need action */}
          <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-gray-800">Reports ({shownReports.length})</h3>
              <label className="text-xs text-gray-600 flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-red-600" />
                Show resolved
              </label>
            </div>
            {shownReports.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No reports to review.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {shownReports.map((r) => (
                  <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-bold uppercase text-gray-500">{r.targetType}</span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${r.status === 'resolved' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-700'}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">{r.targetName || 'Deleted content'}</p>
                    {r.targetPreview && <p className="text-gray-600 bg-white border border-gray-100 rounded-xl p-2 break-words">“{r.targetPreview}”</p>}
                    <p className="text-xs text-gray-600">
                      <strong>Reason:</strong> {r.reason}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Reported by {r.reporterName} · {timeAgo(r.createdAt)}
                    </p>
                    {r.status !== 'resolved' && (
                      <div className="flex gap-2 pt-1">
                        {r.targetExists && (
                          <button onClick={() => removeContent(r)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> {r.targetType === 'user' ? 'Ban user' : 'Remove content'}
                          </button>
                        )}
                        <button onClick={() => act(() => api.resolveReport(r.id), 'Report dismissed.')} className="flex-1 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                          <CheckSquare size={12} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-gray-800">Users ({users.length})</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full text-sm rounded-xl border border-gray-200 pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {shownUsers.map((u) => (
                  <div key={u.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">
                        {u.name} {u.isAdmin && <span className="text-[11px] text-red-600 font-bold ml-1">ADMIN</span>}
                      </p>
                      <span className="text-xs text-gray-500 block truncate">@{u.username} · {u.email}</span>
                    </div>
                    {!u.isAdmin && u.id !== currentUser.id && (
                      <button
                        onClick={() => toggleBan(u)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 ${u.isBanned ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-gray-800">Businesses ({businesses.length})</h3>
              <div className="space-y-2 max-h-[470px] overflow-y-auto">
                {sortedBusinesses.map((b) => (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{b.name}</p>
                      <span className="text-xs text-gray-500 block truncate">
                        {b.category} · owner {b.ownerName}
                      </span>
                    </div>
                    <button
                      onClick={() => act(() => api.verifyBusiness(b.id), b.isVerified ? `${b.name} is hidden until verified again.` : `${b.name} is now verified.`)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 ${b.isVerified ? 'bg-amber-100 text-amber-800' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                    >
                      {b.isVerified ? 'Revoke' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

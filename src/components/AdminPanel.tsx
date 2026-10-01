/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { timeAgo } from '../utils/time';
import { Avatar, Spinner, money, errorText } from './common/ui';
import { AdminStats, AdminUserRow, Business, Report, User } from '../types';
import {
  AlertCircle,
  Ban,
  Check,
  CheckSquare,
  Clock,
  DollarSign,
  Search,
  Shield,
  ShoppingBag,
  Store,
  Trash2,
  Users,
  X
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Reports
  const [reportStatus, setReportStatus] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Users
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Businesses
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessStatus, setBusinessStatus] = useState<'pending' | 'verified' | undefined>(undefined);
  const [businessSearch, setBusinessSearch] = useState('');
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const [adminErr, setAdminErr] = useState<string>('');

  const loadStats = async () => {
    try {
      setStats(await api.getAdminStats());
    } catch (err) {
      setAdminErr(errorText(err, 'You must be an administrator to see this page.'));
    }
  };

  const loadReports = async (status = reportStatus) => {
    setLoadingReports(true);
    try {
      setReports(await api.getReports(status));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadUsers = async (q = userSearch) => {
    setLoadingUsers(true);
    try {
      setUsers(await api.getAdminUsers({ search: q || undefined }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadBusinesses = async (st = businessStatus, q = businessSearch) => {
    setLoadingBusinesses(true);
    try {
      setBusinesses(await api.getAdminBusinesses({ status: st, search: q || undefined }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadReports();
    loadUsers();
    loadBusinesses();
  }, []);

  useEffect(() => {
    loadReports(reportStatus);
  }, [reportStatus]);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    const t = setTimeout(() => loadBusinesses(businessStatus, businessSearch), 350);
    return () => clearTimeout(t);
  }, [businessStatus, businessSearch]);

  const act = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      loadStats();
      loadReports(reportStatus);
      loadUsers(userSearch);
      loadBusinesses(businessStatus, businessSearch);
    } catch (err) {
      toast.error(errorText(err, 'Action failed.'));
    }
  };

  const toggleBan = async (u: AdminUserRow) => {
    if (u.isAdmin) return;
    if (!u.isBanned && !(await confirmAction(`Ban ${u.name}? They will be signed out immediately.`, 'Ban'))) return;
    if (u.isBanned) {
      act(() => api.unbanUser(u.id), `${u.name} was unbanned.`);
    } else {
      act(() => api.banUser(u.id), `${u.name} was banned.`);
    }
  };

  const resolveReport = async (r: Report, action: 'remove_content' | 'ban_user' | 'dismiss') => {
    const label = action === 'remove_content' ? 'Remove content' : action === 'ban_user' ? 'Ban user' : 'Dismiss';
    if (!(await confirmAction(`${label}? This will resolve the report.`, label))) return;
    act(() => api.resolveReport(r.id, action), `Report resolved: ${label}.`);
  };

  const toggleVerifyBusiness = async (b: Business) => {
    if (b.isVerified) {
      if (!(await confirmAction(`Revoke verification for "${b.name}"? The shop will be hidden from the public directory.`, 'Revoke'))) return;
      act(() => api.unverifyBusiness(b.id), `${b.name} is now unverified.`);
    } else {
      act(() => api.verifyBusiness(b.id), `${b.name} is now verified!`);
    }
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

  return (
    <div className="space-y-6 text-left" id="admin-workspace">
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Shield size={22} /> Admin Dashboard
          </h2>
          <p className="text-xs text-rose-100 mt-1">Manage users, verify local shops and moderate reported content.</p>
        </div>
        <button
          onClick={() => {
            loadStats();
            loadReports();
            loadUsers();
            loadBusinesses();
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-xl"
        >
          Refresh
        </button>
      </div>

      {/* Metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-bold block uppercase">Total Users</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.users.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stats.users.newLast7Days} new this week · {stats.users.banned} banned</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-bold block uppercase">Posts</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.posts.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stats.posts.today} today</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-bold block uppercase">Shops</span>
            <p className="text-2xl font-bold text-teal-600 mt-1">{stats.businesses.total}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{stats.businesses.pendingVerification} awaiting verification</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-bold block uppercase">Orders</span>
            <p className="text-2xl font-bold text-sky-600 mt-1">{stats.orders.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{money(stats.orders.deliveredRevenue)} revenue</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center col-span-2 sm:col-span-1">
            <span className="text-xs text-gray-500 font-bold block uppercase">Pending Reports</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.reports.pending}</p>
            <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Need review</p>
          </div>
        </div>
      )}

      {/* Reports Section */}
      <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-gray-800">Reports</h3>
            <span className="text-xs font-semibold text-gray-400">({reports.length})</span>
          </div>

          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(['pending', 'resolved', 'dismissed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setReportStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  reportStatus === st ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loadingReports ? (
          <Spinner label="Loading reports..." />
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No {reportStatus} reports to review.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {r.targetType}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${
                        r.status === 'resolved' ? 'bg-gray-200 text-gray-700' : r.status === 'dismissed' ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {r.targetPreview && (
                    <p className="text-xs text-gray-700 bg-white border border-gray-200 rounded-xl p-3 break-words font-mono">
                      “{r.targetPreview}”
                    </p>
                  )}

                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Reason:</strong> {r.reason}</p>
                    <p className="text-[11px] text-gray-400">
                      Reported by {r.reporterName} · {timeAgo(r.createdAt)}
                      {r.openReportsOnTarget > 1 && (
                        <span className="ml-1 text-red-600 font-bold">({r.openReportsOnTarget} open reports on target)</span>
                      )}
                    </p>
                    {r.resolution && <p className="text-emerald-700 text-xs"><strong>Resolution:</strong> {r.resolution}</p>}
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                    {r.targetExists && (
                      <button
                        onClick={() => resolveReport(r, 'remove_content')}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Trash2 size={13} /> Remove content
                      </button>
                    )}
                    {r.targetAuthorId && (
                      <button
                        onClick={() => resolveReport(r, 'ban_user')}
                        className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Ban size={13} /> Ban user
                      </button>
                    )}
                    <button
                      onClick={() => resolveReport(r, 'dismiss')}
                      className="py-2 px-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <CheckSquare size={13} /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users & Businesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Section */}
        <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-800">Users ({users.length})</h3>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name, username or email..."
              className="w-full text-xs rounded-xl border border-gray-200 pl-8 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-red-500 bg-gray-50 focus:bg-white"
            />
          </div>

          {loadingUsers ? (
            <Spinner label="Searching users..." />
          ) : users.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No users match your search.</p>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={u.profilePhoto} name={u.name} className="w-8 h-8 rounded-full text-xs shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-xs truncate">
                        {u.name} {u.isAdmin && <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold ml-1">ADMIN</span>}
                      </p>
                      <span className="text-[11px] text-gray-500 block truncate">@{u.username} · {u.email}</span>
                      <span className="text-[10px] text-gray-400">
                        {u.postsCount} posts · joined {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!u.isAdmin && u.id !== currentUser.id && (
                    <button
                      onClick={() => toggleBan(u)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                        u.isBanned ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Businesses Section */}
        <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-800">Shops ({businesses.length})</h3>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setBusinessStatus(undefined)}
                className={`px-2 py-1 rounded-md font-semibold ${businessStatus === undefined ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-500'}`}
              >
                All
              </button>
              <button
                onClick={() => setBusinessStatus('pending')}
                className={`px-2 py-1 rounded-md font-semibold ${businessStatus === 'pending' ? 'bg-white shadow-2xs text-amber-700' : 'text-gray-500'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setBusinessStatus('verified')}
                className={`px-2 py-1 rounded-md font-semibold ${businessStatus === 'verified' ? 'bg-white shadow-2xs text-teal-700' : 'text-gray-500'}`}
              >
                Verified
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={businessSearch}
              onChange={(e) => setBusinessSearch(e.target.value)}
              placeholder="Search shops by name..."
              className="w-full text-xs rounded-xl border border-gray-200 pl-8 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50 focus:bg-white"
            />
          </div>

          {loadingBusinesses ? (
            <Spinner label="Searching businesses..." />
          ) : businesses.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No businesses found.</p>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {businesses.map((b) => (
                <div key={b.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-xs truncate">{b.name}</p>
                    <span className="text-[11px] text-gray-500 block truncate">
                      {b.category} {b.ownerName ? `· owner: ${b.ownerName}` : ''}
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate">{b.address}</span>
                  </div>
                  <button
                    onClick={() => toggleVerifyBusiness(b)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                      b.isVerified ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {b.isVerified ? 'Revoke' : 'Verify'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

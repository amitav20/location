/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AlertCircle, Shield, Check, Ban, CheckSquare, Trash2, ArrowUpRight } from 'lucide-react';

export function AdminPanel() {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminErr, setAdminErr] = useState<string>('');

  const fetchAdminWorkspace = async () => {
    setIsLoading(true);
    setAdminErr('');
    try {
      const res = await api.getAdminMetrics();
      setMetrics(res.metrics);
      setUsers(res.users);
      setBusinesses(res.businesses);
      setReports(res.reports);
    } catch (err: any) {
      setAdminErr(err.message || 'You must be logged in as an administrator to inspect superadmin statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminWorkspace();
  }, []);

  const handleBanUser = async (uId: string) => {
    try {
      const res = await api.banUser(uId);
      setUsers(users.map((u) => (u.id === uId ? { ...u, isBanned: res.banned } : u)));
      fetchAdminWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyBusiness = async (bId: string) => {
    try {
      const res = await api.verifyBusiness(bId);
      setBusinesses(businesses.map((b) => (b.id === bId ? { ...b, isVerified: res.verified } : b)));
      fetchAdminWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (rId: string) => {
    try {
      await api.resolveReport(rId);
      setReports(reports.map((r) => (r.id === rId ? { ...r, status: 'resolved' } : r)));
      fetchAdminWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  if (adminErr) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
        <AlertCircle size={34} className="text-red-500 mx-auto" />
        <h3 className="font-bold text-red-800 text-sm">Administrative Permission Blocked</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto">{adminErr}</p>
        <p className="text-[11px] text-gray-450">Please log in utilizing the Administrator seed credential username &ldquo;admin&rdquo; from the Login/Register panel at the top right profile bubble!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-workspace">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Shield size={22} />
            Super-Admin Moderation Workspace
          </h2>
          <p className="text-xs text-rose-150 mt-1">Audit neighbor profiles, verify new business establishments, and investigate reports logs.</p>
        </div>
        <button
          onClick={fetchAdminWorkspace}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          Recorrelate Statistics
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest animate-pulse">Assembling administrative system registries...</p>
        </div>
      ) : (
        <>
          {/* Quick Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Active Neighbors', count: metrics.activeUsers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Banned Accounts', count: metrics.bannedCount, color: 'text-red-650', bg: 'bg-red-50' },
                { label: 'Verified Spots', count: metrics.verifiedBiz, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Pending Verifications', count: metrics.unverifiedBiz, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Active Social Posts', count: metrics.totalPosts, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Content Reports', count: metrics.pendingReports, color: 'text-rose-600', bg: 'bg-rose-50' }
              ].map((m, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-center flex flex-col justify-center">
                  <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block leading-snug">{m.label}</span>
                  <p className={`text-lg font-bold font-mono mt-1.5 ${m.color}`}>{m.count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Three columns list workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* USER CONTROL PANEL */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-red-600 border-b border-gray-50 pb-2 flex items-center justify-between">
                <span>Neighbor Accounts Registry</span>
                <span className="text-gray-400 font-mono text-[10px]">({users.length})</span>
              </h3>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{u.name}</p>
                      <span className="text-[10px] text-gray-400 block font-semibold">@{u.username}</span>
                    </div>

                    <button
                      onClick={() => handleBanUser(u.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[9.5px] shrink-0 transition-all ${
                        u.isBanned
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {u.isBanned ? 'Pardon / Unban' : 'Suspend / Ban'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* BUSINESS DIRECTORY VERIFICATIONS */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-red-600 border-b border-gray-50 pb-2 flex items-center justify-between">
                <span>Shops Verifications Desk</span>
                <span className="text-gray-400 font-mono text-[10px]">({businesses.length})</span>
              </h3>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {businesses.map((b) => (
                  <div key={b.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 col-span-2">
                      <p className="font-bold text-gray-800 truncate">{b.name}</p>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">{b.category}</span>
                    </div>

                    <button
                      onClick={() => handleVerifyBusiness(b.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[9.5px] shrink-0 transition-all ${
                        b.isVerified
                          ? 'bg-amber-100 text-amber-800 border border-amber-250'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {b.isVerified ? 'Revoke Verify' : 'Verify Spot'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTENT REPORTS INVESTIGATIVE TABLE */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-widest text-red-600 border-b border-gray-50 pb-2 flex items-center justify-between">
                <span>Moderation Pending Reports</span>
                <span className="text-gray-400 font-mono text-[10px]">({reports.length})</span>
              </h3>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {reports.length === 0 ? (
                  <p className="text-[11px] text-gray-400 py-12 text-center uppercase font-bold tracking-wider">Reports logs is clean.</p>
                ) : (
                  reports.map((rep) => (
                    <div key={rep.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-450 font-bold uppercase">Target: {rep.targetType}</span>
                        <span className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded uppercase ${
                          rep.status === 'resolved' ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700 font-bold animate-pulse'
                        }`}>{rep.status}</span>
                      </div>
                      <p className="font-medium text-gray-750">Reported Reason: &ldquo;{rep.reason}&rdquo;</p>
                      <p className="text-[10px] text-gray-400 font-medium">Flagged by reporter: {rep.reporterName}</p>

                      {rep.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveReport(rep.id)}
                          className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <CheckSquare size={11} />
                          <span>Resolve / Moderate</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

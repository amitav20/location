/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { StaffMember, StaffRole } from '../../types';
import {
  Check,
  Shield,
  Trash2,
  UserPlus,
  X,
  User,
  Mail
} from 'lucide-react';

interface StaffManagerModalProps {
  businessId: string;
  onClose: () => void;
}

const ROLES: Array<{ role: StaffRole; label: string; desc: string; color: string }> = [
  { role: 'manager', label: 'Manager', desc: 'Can manage catalog, orders, settings, and staff', color: 'bg-sky-100 text-sky-800' },
  { role: 'cashier', label: 'Cashier', desc: 'Can take orders, process payments, and issue receipts', color: 'bg-emerald-100 text-emerald-800' },
  { role: 'staff', label: 'Store Staff', desc: 'Can view catalog, products, and incoming orders', color: 'bg-slate-100 text-slate-800' },
  { role: 'kitchen', label: 'Kitchen / Chef', desc: 'Access to KDS display and marks preparation ready', color: 'bg-orange-100 text-orange-800' },
  { role: 'driver', label: 'Delivery Driver', desc: 'Dispatched to deliveries and updates live tracking', color: 'bg-purple-100 text-purple-800' },
];

export function StaffManagerModal({ businessId, onClose }: StaffManagerModalProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('staff');
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const list = await api.getStaff(businessId);
      setStaff(list);
    } catch (err: any) {
      toast.error(err.message || 'Could not load staff list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [businessId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address.');
      return;
    }
    setIsInviting(true);
    try {
      await api.inviteStaff(businessId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail.trim()}!`);
      setInviteEmail('');
      setShowInviteForm(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Could not send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (member: StaffMember) => {
    if (!(await confirmAction(`Remove ${member.name || member.email} from this business?`, 'Remove'))) {
      return;
    }
    try {
      await api.removeStaff(businessId, member.id);
      toast.success('Staff member removed.');
      setStaff((list) => list.filter((m) => m.id !== member.id));
    } catch (err: any) {
      toast.error(err.message || 'Could not remove staff.');
    }
  };

  const handleRoleChange = async (member: StaffMember, newRole: StaffRole) => {
    try {
      await api.updateStaffRole(businessId, member.id, newRole);
      toast.success('Role updated.');
      setStaff((list) =>
        list.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not update role.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Shield size={18} className="text-teal-600" /> Team & Roles
            </h3>
            <p className="text-xs text-gray-500">Manage permissions and team members</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Staff Members ({staff.length})
            </h4>
            {!showInviteForm && (
              <button
                type="button"
                onClick={() => setShowInviteForm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus size={14} /> Invite Member
              </button>
            )}
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <form onSubmit={handleInvite} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700">Invite New Member</h5>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Role & Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.role}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex flex-col gap-0.5 transition-all ${
                        inviteRole === r.role
                          ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{r.label}</span>
                        <input
                          type="radio"
                          name="inviteRole"
                          checked={inviteRole === r.role}
                          onChange={() => setInviteRole(r.role)}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal leading-tight">{r.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isInviting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isInviting ? 'Sending invitation...' : 'Send Invitation'}
              </button>
            </form>
          )}

          {/* List */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading team members...</div>
          ) : staff.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No staff members added yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {staff.map((member) => {
                const roleInfo = ROLES.find((r) => r.role === member.role) || {
                  label: member.role,
                  color: 'bg-gray-100 text-gray-800'
                };
                const isOwner = member.role === 'owner';

                return (
                  <div key={member.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0 text-sm">
                        {member.name ? member.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 truncate">{member.name || 'Invited Staff'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          Owner
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as StaffRole)}
                          className="text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 text-gray-700"
                        >
                          {ROLES.map((r) => (
                            <option key={r.role} value={r.role}>{r.label}</option>
                          ))}
                        </select>
                      )}

                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Remove staff member"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

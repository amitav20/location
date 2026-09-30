/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { User } from '../types';
import { toast, confirmAction } from './Toaster';
import { Ban, KeyRound, Settings, Trash2, UserCog } from 'lucide-react';

interface SettingsPanelProps {
  currentUser: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
  onEditProfile: () => void;
}

const inputClass = 'w-full text-sm rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500';
const labelClass = 'text-xs text-gray-500 font-bold uppercase block mb-1';
const cardClass = 'bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-4';

export function SettingsPanel({ currentUser, onUserUpdated, onAccountDeleted, onEditProfile }: SettingsPanelProps) {
  // Account details
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Blocked people
  const [blocked, setBlocked] = useState<User[]>([]);

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    api.getBlockedUsers().then(setBlocked).catch((err) => console.error(err));
  }, []);

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    try {
      const res = await api.updateProfile({ name, email, mobile });
      onUserUpdated(res.user);
      toast.success('Account details saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('The new password must be at least 8 characters.');
      return;
    }
    setIsSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed. Other devices have been signed out.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const unblock = async (user: User) => {
    try {
      await api.unblockUser(user.id);
      setBlocked((list) => list.filter((u) => u.id !== user.id));
      toast.success(`${user.name} is unblocked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unblock.');
    }
  };

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirmAction(
      'Delete your account permanently? Your posts, stories, comments, events and shops will be removed. This cannot be undone.',
      'Delete account'
    );
    if (!ok) return;
    try {
      await api.deleteAccount(deletePassword);
      toast.success('Your account was deleted.');
      onAccountDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete account.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold font-display text-gray-900 flex items-center gap-2">
          <Settings size={22} className="text-teal-600" /> Settings
        </h2>
        <button onClick={onEditProfile} className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">
          Edit public profile
        </button>
      </div>

      <form onSubmit={saveAccount} className={cardClass}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <UserCog size={18} className="text-teal-600" /> Account details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Mobile</label>
            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={20} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-500">Your email, phone and date of birth are never shown to other people.</p>
        <button type="submit" disabled={isSavingAccount} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold">
          {isSavingAccount ? 'Saving...' : 'Save details'}
        </button>
      </form>

      <form onSubmit={savePassword} className={cardClass}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <KeyRound size={18} className="text-teal-600" /> Change password
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Current</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>New</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Repeat new</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" className={inputClass} required />
          </div>
        </div>
        <button type="submit" disabled={isSavingPassword} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold">
          {isSavingPassword ? 'Saving...' : 'Change password'}
        </button>
      </form>

      <div className={cardClass}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Ban size={18} className="text-teal-600" /> Blocked people
        </h3>
        {blocked.length === 0 ? (
          <p className="text-sm text-gray-500">You haven't blocked anyone.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {blocked.map((u) => (
              <li key={u.id} className="py-2.5 flex items-center gap-3">
                <img src={u.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100" referrerPolicy="no-referrer" />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-800 block truncate">{u.name}</span>
                  <span className="text-xs text-gray-500">@{u.username}</span>
                </span>
                <button onClick={() => unblock(u)} className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700">
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={deleteAccount} className="bg-white rounded-3xl border border-rose-200 shadow-sm p-5 sm:p-6 space-y-3">
        <h3 className="font-bold text-rose-700 flex items-center gap-2">
          <Trash2 size={18} /> Delete account
        </h3>
        <p className="text-sm text-gray-600">This permanently removes your account and everything you posted. Enter your password to continue.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            className={`${inputClass} sm:max-w-xs`}
            required
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold">
            Delete my account
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { Spinner, money } from '../common/ui';
import {
  Award,
  Check,
  Gift,
  Plus,
  QrCode,
  Save,
  Sparkles,
  Star,
  Users,
  X
} from 'lucide-react';
import type { LoyaltyProgram } from '../../types';

interface LoyaltyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

export function LoyaltyManagerModal({
  isOpen,
  onClose,
  businessId,
  businessName
}: LoyaltyManagerModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgram>({
    isActive: true,
    type: 'stamps',
    targetStamps: 10,
    targetSpend: 1000,
    rewardText: 'Free gift or 20% discount on completion',
    rewardDiscountPercent: 20,
    rewardDiscountAmount: 0,
    validityDays: 90,
    summary: 'Earn 1 stamp per purchase'
  });

  // Stamp customer walk-in state
  const [stampCode, setStampCode] = useState('');
  const [stampsToAdd, setStampsToAdd] = useState('1');
  const [stamping, setStamping] = useState(false);

  const fetchProgram = async () => {
    try {
      setLoading(true);
      const data = await api.getShopLoyaltyProgram(businessId);
      if (data) {
        setProgram(data);
      }
    } catch (err: any) {
      toast.error('Failed to load loyalty settings: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && businessId) {
      fetchProgram();
    }
  }, [isOpen, businessId]);

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.setShopLoyaltyProgram(businessId, program);
      setProgram(updated);
      toast.success('Loyalty program rules updated!');
    } catch (err: any) {
      toast.error('Failed to save program: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleWalkInStamp = async () => {
    if (!stampCode.trim()) {
      toast.error('Please enter customer loyalty card code');
      return;
    }
    setStamping(true);
    try {
      await api.stampLoyaltyCard(businessId, {
        code: stampCode.trim(),
        stamps: parseInt(stampsToAdd, 10) || 1
      });
      toast.success('Successfully added stamps to customer card!');
      setStampCode('');
    } catch (err: any) {
      toast.error('Failed to stamp card: ' + (err.message || 'Error'));
    } finally {
      setStamping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Digital Loyalty & Stamps</h2>
              <p className="text-xs text-white/80">{businessName} • Customer Retention</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner className="w-8 h-8 text-amber-500" />
              <p className="text-sm">Loading loyalty program...</p>
            </div>
          ) : (
            <>
              {/* Quick Cashier Scan & Stamp Walk-in Box */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  Quick In-Store Cashier Stamp
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Enter or scan a customer's loyalty code (e.g. GCL:12345) to stamp their card for a walk-in purchase.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={stampCode}
                    onChange={(e) => setStampCode(e.target.value)}
                    placeholder="Customer card code (GCL:...)"
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={stampsToAdd}
                    onChange={(e) => setStampsToAdd(e.target.value)}
                    className="w-16 text-xs px-2 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-center"
                  />
                  <button
                    onClick={handleWalkInStamp}
                    disabled={stamping || !stampCode.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {stamping ? <Spinner className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Stamp
                  </button>
                </div>
              </div>

              {/* Program Configuration Form */}
              <form onSubmit={handleSaveProgram} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Program Settings</h3>
                    <p className="text-xs text-slate-500">Configure rules for customers earning rewards</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Active</span>
                    <input
                      type="checkbox"
                      checked={program.isActive}
                      onChange={(e) => setProgram({ ...program, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Program Model
                    </label>
                    <select
                      value={program.type}
                      onChange={(e) => setProgram({ ...program, type: e.target.value as 'stamps' | 'spend' })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="stamps">Digital Stamps (Orders / Visits)</option>
                      <option value="spend">Spend Milestones (Total Money)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {program.type === 'stamps' ? 'Target Stamps Required' : 'Target Spend Amount'}
                    </label>
                    <input
                      type="number"
                      value={program.type === 'stamps' ? program.targetStamps : program.targetSpend}
                      onChange={(e) =>
                        setProgram({
                          ...program,
                          [program.type === 'stamps' ? 'targetStamps' : 'targetSpend']: parseInt(e.target.value, 10) || 1
                        })
                      }
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reward Description (Shown to Customers)
                  </label>
                  <input
                    type="text"
                    value={program.rewardText}
                    onChange={(e) => setProgram({ ...program, rewardText: e.target.value })}
                    placeholder="e.g. Free Artisan Coffee on 8th visit!"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Discount % Code Generated
                    </label>
                    <input
                      type="number"
                      value={program.rewardDiscountPercent || 0}
                      onChange={(e) =>
                        setProgram({ ...program, rewardDiscountPercent: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Validity Period (Days)
                    </label>
                    <input
                      type="number"
                      value={program.validityDays || 60}
                      onChange={(e) =>
                        setProgram({ ...program, validityDays: parseInt(e.target.value, 10) || 30 })
                      }
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                  >
                    {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    Save Loyalty Program
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium text-sm hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

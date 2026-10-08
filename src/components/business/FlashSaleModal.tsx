/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { Spinner } from '../common/ui';
import {
  Clock,
  Flame,
  MapPin,
  Send,
  Sparkles,
  Users,
  X,
  Zap
} from 'lucide-react';

interface FlashSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

export function FlashSaleModal({
  isOpen,
  onClose,
  businessId,
  businessName
}: FlashSaleModalProps) {
  const [title, setTitle] = useState('');
  const [discountPercent, setDiscountPercent] = useState('25');
  const [radiusM, setRadiusM] = useState<500 | 1000 | 2000 | 5000>(1000);
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [maxClaims, setMaxClaims] = useState('20');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a flash sale title');
      return;
    }

    setSubmitting(true);
    try {
      await api.createFlashSale(businessId, {
        title: title.trim(),
        discountPercent: parseInt(discountPercent, 10) || 20,
        radiusM,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        maxClaims: maxClaims ? parseInt(maxClaims, 10) : undefined
      });
      toast.success('Flash sale launched! Nearby customers are being notified.');
      onClose();
    } catch (err: any) {
      toast.error('Failed to launch flash sale: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Launch Proximity Flash Sale</h2>
              <p className="text-xs text-white/80">{businessName} • Push to Nearby Shoppers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-xs text-orange-900 dark:text-orange-200 leading-relaxed">
            Flash sales broadcast a high-priority push notification to all app users within your selected radius.
            Shops may launch 1 flash sale every 24 hours.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Sale Title & Offer
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash Lunch Deal: 30% Off Bowls next 2 hrs!"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount Percent (%)
              </label>
              <input
                type="number"
                min="5"
                max="90"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Broadcast Radius
              </label>
              <select
                value={radiusM}
                onChange={(e) => setRadiusM(parseInt(e.target.value, 10) as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value={500}>500 meters (Immediate vicinity)</option>
                <option value={1000}>1 kilometer (Neighborhood)</option>
                <option value={2000}>2 kilometers (Local area)</option>
                <option value={5000}>5 kilometers (Wide radius)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Claims Cap (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxClaims}
                onChange={(e) => setMaxClaims(e.target.value)}
                placeholder="Unlimited if empty"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? <Spinner className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              Broadcast Flash Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

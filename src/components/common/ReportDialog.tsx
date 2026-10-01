/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { ReportTargetType } from '../../types';
import { toast } from '../Toaster';
import { errorText } from './ui';

export type ReportTarget = { type: ReportTargetType; id: string };

const QUICK_REASONS = ['Spam', 'Harassment', 'Hate speech', 'Scam or fraud', 'Inappropriate content'];

const LABELS: Record<ReportTargetType, string> = {
  post: 'post',
  comment: 'comment',
  story: 'story',
  user: 'person',
  business: 'shop',
  product: 'product',
  message: 'message'
};

// Asks for a reason and files a report for moderators
export function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 3) {
      toast.error('Please pick or describe the problem.');
      return;
    }
    setIsSending(true);
    try {
      await api.submitReport(target.type, target.id, reason.trim());
      toast.success('Thanks. Our moderators will review it.');
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not send the report.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={20} /> Report this {LABELS[target.type]}
        </h3>
        <p className="text-xs text-gray-500">Help keep the community safe. What is wrong with it?</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${reason === r ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Or describe the problem..."
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={submit} disabled={isSending} className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl text-xs font-semibold text-white">
            {isSending ? 'Sending...' : 'Send report'}
          </button>
        </div>
      </div>
    </div>
  );
}

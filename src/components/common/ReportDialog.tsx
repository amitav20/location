/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { toast } from '../Toaster';

export type ReportTarget = { type: 'post' | 'comment' | 'story' | 'user' | 'business' | 'product'; id: string };

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

// Asks for a reason and files a report for moderators
export function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (reason.trim().length < 3) {
      toast.error('Please describe the problem.');
      return;
    }
    try {
      await api.submitReport(target.id, target.type, reason.trim());
      toast.success('Thanks - moderators will review it.');
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not send the report.'));
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <AlertTriangle className="text-red-500" size={20} /> Report {target.type}
        </h3>
        <p className="text-xs text-gray-500">Help keep the community safe. What is wrong with it?</p>
        <textarea
          placeholder="e.g. Spam, harassment, hate speech..."
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold text-white">Send report</button>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import { FinanceSummary, PayoutAccount } from '../../types';
import {
  Banknote,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Landmark,
  Wallet,
  X
} from 'lucide-react';

interface FinanceModalProps {
  businessId: string;
  onClose: () => void;
}

export function FinanceModal({ businessId, onClose }: FinanceModalProps) {
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Payout Account State
  const [showEditAccount, setShowEditAccount] = useState<boolean>(false);
  const [payoutType, setPayoutType] = useState<'bank' | 'upi'>('bank');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchFinance = async () => {
    setIsLoading(true);
    try {
      const [f, acc] = await Promise.all([
        api.getShopFinance(businessId),
        api.getPayoutAccount(businessId),
      ]);
      setFinance(f);
      setPayoutAccount(acc);
      if (acc) {
        setPayoutType(acc.type);
        setAccountHolder(acc.holderName || '');
        if (acc.type === 'upi') setUpiId(acc.ifscOrVpa || '');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not load finance details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [businessId]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (payoutType === 'bank') {
        await api.setPayoutAccount(businessId, {
          type: 'bank',
          accountHolder: accountHolder.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim(),
        });
      } else {
        await api.setPayoutAccount(businessId, {
          type: 'upi',
          upiId: upiId.trim(),
        });
      }
      toast.success('Payout account updated!');
      setShowEditAccount(false);
      fetchFinance();
    } catch (err: any) {
      toast.error(err.message || 'Could not save payout account.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const csvStatementUrl = api.getShopStatementsUrl(businessId, currentMonth, 'csv');
  const pdfStatementUrl = api.getShopStatementsUrl(businessId, currentMonth, 'pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Landmark size={18} className="text-teal-600" /> Finance, Payouts & Statements
            </h3>
            <p className="text-xs text-gray-500">Track earnings balance and configure automated bank deposits</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">Loading finance data...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            {/* Balance Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Available Balance</span>
                <p className="text-xl font-black font-display text-teal-900 mt-1">{money(finance?.availableBalance || 0)}</p>
                <p className="text-[11px] text-teal-700/80 mt-0.5">Ready for next transfer</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Pending Clearance</span>
                <p className="text-xl font-black font-display text-gray-900 mt-1">{money(finance?.pendingBalance || 0)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Clearing in 24-48 hours</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Paid Out</span>
                <p className="text-xl font-black font-display text-emerald-900 mt-1">{money(finance?.totalPaidOut || 0)}</p>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">All time transfers</p>
              </div>
            </div>

            {/* Payout Account */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">Automated Payout Destination</h4>
                {!showEditAccount && (
                  <button
                    type="button"
                    onClick={() => setShowEditAccount(true)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    {payoutAccount ? 'Change Account' : 'Set Account'}
                  </button>
                )}
              </div>

              {showEditAccount ? (
                <form onSubmit={handleSaveAccount} className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutType('bank')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        payoutType === 'bank' ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutType('upi')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        payoutType === 'upi' ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      UPI ID
                    </button>
                  </div>

                  {payoutType === 'bank' ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Account Holder Name"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="col-span-2 rounded-xl bg-gray-50 border border-gray-200 p-2.5 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="rounded-xl bg-gray-50 border border-gray-200 p-2.5 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="rounded-xl bg-gray-50 border border-gray-200 p-2.5 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="IFSC / Routing Code"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="col-span-2 rounded-xl bg-gray-50 border border-gray-200 p-2.5 outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. storename@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full text-xs rounded-xl bg-gray-50 border border-gray-200 p-2.5 outline-none"
                    />
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEditAccount(false)}
                      className="px-3 py-1.5 text-xs text-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                    >
                      {isSaving ? 'Saving...' : 'Save Payout Method'}
                    </button>
                  </div>
                </form>
              ) : payoutAccount ? (
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">
                      {payoutAccount.type === 'bank' ? `Bank: ${payoutAccount.maskedAccount}` : `UPI: ${payoutAccount.ifscOrVpa}`}
                    </h5>
                    <p className="text-gray-500">{payoutAccount.holderName || 'Verified Payout Account'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No payout account linked yet.</p>
              )}
            </div>

            {/* Monthly Statements */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h4 className="font-bold text-gray-800">Monthly Statements ({currentMonth})</h4>
                <p className="text-gray-500">Download itemized accounting statements and tax receipts</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={csvStatementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1 shadow-2xs"
                >
                  <Download size={13} /> CSV
                </a>
                <a
                  href={pdfStatementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1 shadow-2xs"
                >
                  <Download size={13} /> PDF
                </a>
              </div>
            </div>

            {/* Recent Payouts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Recent Transfers ({finance?.payouts?.length || 0})
              </h4>
              {finance?.payouts && finance.payouts.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  {finance.payouts.map((p) => (
                    <div key={p.id} className="p-3.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-gray-800">Transfer #{p.reference || p.id}</p>
                        <p className="text-[11px] text-gray-500">{new Date(p.paidAt).toLocaleDateString()}</p>
                      </div>
                      <span className="font-black text-emerald-700 text-sm">+{money(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-2">No transfers recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

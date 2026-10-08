/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import { ScanResult } from '../../types';
import {
  Award,
  Barcode,
  CheckCircle,
  PackageCheck,
  Search,
  ShoppingBag,
  X,
  AlertCircle
} from 'lucide-react';

interface ScannerModalProps {
  businessId: string;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function ScannerModal({ businessId, onClose, onOrderUpdated }: ScannerModalProps) {
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [handoverSuccess, setHandoverSuccess] = useState<boolean>(false);
  const [isHandingOver, setIsHandingOver] = useState<boolean>(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a barcode, order number, or loyalty code.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setHandoverSuccess(false);
    try {
      const scanRes = await api.scanCode(businessId, code.trim());
      setResult(scanRes);
    } catch (err: any) {
      toast.error(err.message || 'No matching order, product or card found.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandover = async () => {
    if (!result?.order) return;
    setIsHandingOver(true);
    try {
      await api.handoverOrder(result.order.id, code.trim());
      setHandoverSuccess(true);
      toast.success('Order pickup verified and fulfilled!');
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Could not verify handover.');
    } finally {
      setIsHandingOver(false);
    }
  };

  const handleAddStamp = async () => {
    if (!result?.loyaltyCard) return;
    try {
      await api.stampLoyaltyCard(businessId, { code: result.loyaltyCard.code, stamps: 1 });
      toast.success('Customer loyalty card stamped +1!');
      // re-scan to refresh
      const scanRes = await api.scanCode(businessId, code.trim());
      setResult(scanRes);
    } catch (err: any) {
      toast.error(err.message || 'Could not add stamp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Barcode size={18} className="text-teal-600" /> Barcode & Order Scanner
            </h3>
            <p className="text-xs text-gray-500">Lookup orders, products or customer cards</p>
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
          <form onSubmit={handleLookup} className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Enter or scan barcode / QR code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ORD-1092, EAN-841029, L-9821"
                className="flex-1 text-sm font-mono rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Search size={14} /> Look Up
              </button>
            </div>
          </form>

          {/* Results */}
          {isLoading && (
            <div className="py-8 text-center text-xs text-gray-400">Looking up code...</div>
          )}

          {result && (
            <div className="space-y-4">
              {result.type === 'order' && result.order && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Order #{result.order.number}</h4>
                      <p className="text-gray-500">Customer: {result.order.customerName || 'Guest'}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase text-[10px]">
                      {result.order.status}
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100 border-t border-b border-gray-200/60 py-2 space-y-1">
                    {result.order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between py-1 text-gray-700">
                        <span>{it.quantity}× {it.productName}</span>
                        <span className="font-bold">{money(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-gray-900">
                    <span>Total</span>
                    <span className="text-teal-700">{money(result.order.totalAmount)}</span>
                  </div>

                  {result.order.status !== 'delivered' && !handoverSuccess ? (
                    <button
                      type="button"
                      onClick={handleHandover}
                      disabled={isHandingOver}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <PackageCheck size={15} />
                      {isHandingOver ? 'Confirming...' : 'Confirm Pickup / Handover'}
                    </button>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      Handover Complete & Verified
                    </div>
                  )}
                </div>
              )}

              {result.type === 'product' && result.product && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-xs">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <ShoppingBag size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{result.product.name}</h4>
                    <p className="text-teal-700 font-bold text-sm">{money(result.product.price)}</p>
                    <p className="text-gray-500">In stock: {result.product.stock} units</p>
                  </div>
                </div>
              )}

              {result.type === 'loyalty_card' && result.loyaltyCard && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 text-xs text-amber-950">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Award size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Loyalty Card #{result.loyaltyCard.code}</h4>
                      <p className="text-amber-800">
                        {result.loyaltyCard.stampsCount} / {result.loyaltyCard.stampsRequired} stamps collected
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStamp}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Stamp +1 Point
                  </button>
                </div>
              )}

              {result.type === 'unknown' && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>No match found for code "{result.rawCode}".</span>
                </div>
              )}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

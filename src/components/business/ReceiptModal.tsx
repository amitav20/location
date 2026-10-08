/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import { Receipt } from '../../types';
import {
  Download,
  Printer,
  Receipt as ReceiptIcon,
  X,
  ExternalLink
} from 'lucide-react';

interface ReceiptModalProps {
  orderId: string;
  onClose: () => void;
}

export function ReceiptModal({ orderId, onClose }: ReceiptModalProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    api.getOrderReceipt(orderId)
      .then((res) => {
        if (active) setReceipt(res);
      })
      .catch((err) => {
        toast.error(err.message || 'Could not load receipt.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const d = receipt?.data || {};
  const items = Array.isArray(d.items) ? d.items : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <ReceiptIcon size={18} className="text-teal-600" />
            <h3 className="font-display font-black text-base text-gray-900">Receipt</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-xl"
              title="Print Receipt"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading receipt...</div>
          ) : !receipt ? (
            <div className="py-12 text-center text-xs text-rose-500 font-bold">Could not load receipt details.</div>
          ) : (
            <div className="border border-gray-200 rounded-2xl p-6 bg-slate-50/50 space-y-4 font-mono text-xs text-slate-700 shadow-inner">
              {/* Shop Header */}
              <div className="text-center space-y-1">
                <h4 className="font-black text-base text-slate-900 font-display">{d.businessName || 'GeoConnect Store'}</h4>
                {d.businessAddress && <p className="text-[11px] text-slate-500">{d.businessAddress}</p>}
                {d.businessPhone && <p className="text-[11px] text-slate-500">Tel: {d.businessPhone}</p>}
                {d.taxId && <p className="text-[11px] text-slate-500">Tax ID: {d.taxId}</p>}
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Order Meta */}
              <div className="flex justify-between text-[11px]">
                <span>Order #{receipt.orderNumber}</span>
                <span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</span>
              </div>
              {d.tableCode && <div className="font-bold text-[11px]">Dine-In Table: {d.tableCode}</div>}
              {d.customerName && <div className="text-[11px] text-gray-500">Customer: {d.customerName}</div>}

              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Items */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] text-gray-400 tracking-wider">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
                {items.map((it: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">
                        {it.quantity}× {it.name || it.productName}
                      </span>
                      <span className="font-bold">{money(it.total || it.lineTotal || 0)}</span>
                    </div>
                    {it.variant && <div className="text-[10px] text-gray-500 pl-3">{it.variant}</div>}
                    {it.modifiers && it.modifiers.length > 0 && (
                      <div className="text-[10px] text-gray-400 pl-3">+{it.modifiers.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />

              {/* Charges */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(d.subtotal || 0)}</span>
                </div>
                {d.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{money(d.deliveryFee)}</span>
                  </div>
                )}
                {d.packagingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Packaging Fee</span>
                    <span>{money(d.packagingFee)}</span>
                  </div>
                )}
                {d.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{money(d.tax)}</span>
                  </div>
                )}
                {d.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>-{money(d.discount)}</span>
                  </div>
                )}

                <div className="border-t border-dashed border-gray-300 my-1 pt-1 flex justify-between font-bold text-sm text-slate-900">
                  <span>TOTAL PAID</span>
                  <span className="text-teal-700">{money(d.total || 0)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />

              <div className="text-center text-[10px] text-gray-500 space-y-1">
                <p>Payment: {d.paymentMethod ? d.paymentMethod.toUpperCase() : 'CASH'}</p>
                <p className="font-bold text-slate-700">Thank you for your visit!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center print:hidden">
          {receipt?.links?.pdf ? (
            <a
              href={receipt.links.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
            >
              <Download size={14} /> PDF Download
            </a>
          ) : <div />}

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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { Order } from '../../types';
import {
  Car,
  CheckCircle,
  Clock,
  PackageCheck,
  User,
  X
} from 'lucide-react';

interface ArrivalsModalProps {
  businessId: string;
  onClose: () => void;
}

export function ArrivalsModal({ businessId, onClose }: ArrivalsModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    try {
      const list = await api.getBusinessOrders(businessId);
      setOrders(list.filter((o) => o.arrival && o.status !== 'delivered'));
    } catch (err: any) {
      console.warn('Could not refresh arrival orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [businessId]);

  const handleHandover = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'delivered');
      toast.success('Order marked as handed over.');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Could not update status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Car size={18} className="text-teal-600" /> Curbside & Pickup Arrivals
            </h3>
            <p className="text-xs text-gray-500">Live monitoring of customers arriving outside</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Checking arrival status...</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <Car size={36} className="mx-auto text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">No customers currently waiting</h4>
              <p className="text-xs text-gray-400">
                When customers tap "I've Arrived" outside your store, their order and vehicle info will pop up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const arr = o.arrival!;
                const hasArrived = arr.status === 'arrived';

                return (
                  <div
                    key={o.id}
                    className={`bg-gray-50 border-l-4 ${
                      hasArrived ? 'border-emerald-500' : 'border-amber-500'
                    } rounded-2xl p-4 border border-gray-200/80 space-y-3 text-xs`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Order #{o.number}</h4>
                        <p className="text-gray-500">{o.customerName || 'Customer'}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          hasArrived ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {hasArrived ? 'HERE NOW' : 'ON THE WAY'}
                      </span>
                    </div>

                    {arr.vehicle && (
                      <div className="bg-white p-2.5 rounded-xl border border-gray-200/70 flex items-center gap-2 font-semibold text-gray-800">
                        <Car size={16} className="text-teal-600" />
                        <span>
                          {[arr.vehicle.color, arr.vehicle.model, arr.vehicle.plate].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}

                    <div className="text-gray-600">
                      {o.items.map((it) => `${it.quantity}× ${it.productName}`).join(', ')}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleHandover(o.id)}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck size={14} /> Confirm Handover & Fulfill
                    </button>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

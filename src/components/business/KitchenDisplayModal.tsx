/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { KitchenTicket, OrderStatus } from '../../types';
import {
  ChefHat,
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

interface KitchenDisplayModalProps {
  businessId: string;
  onClose: () => void;
}

export function KitchenDisplayModal({ businessId, onClose }: KitchenDisplayModalProps) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const fetchTickets = async () => {
    try {
      const list = await api.getKitchenTickets(businessId);
      setTickets(list);
    } catch (err: any) {
      console.warn('Could not refresh KDS tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [businessId]);

  const handleUpdateStatus = async (ticketId: string, status: OrderStatus) => {
    try {
      await api.updateKitchenTicketStatus(ticketId, status);
      toast.success(`Ticket marked as ${status}.`);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Could not update status.');
    }
  };

  const activeTickets = tickets.filter(
    (t) => t.status === 'pending' || t.status === 'processing'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 md:p-6 overflow-hidden">
      {/* KDS Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ChefHat size={22} />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-slate-100 flex items-center gap-2">
              Kitchen Display System (KDS)
            </h2>
            <p className="text-xs text-slate-400">
              {activeTickets.length} active ticket{activeTickets.length === 1 ? '' : 's'} in preparation queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2.5 rounded-xl text-xs font-bold transition-colors ${
              soundEnabled ? 'bg-slate-800 text-sky-400 hover:bg-slate-700' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle notification chime"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-1 overflow-y-auto py-6">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-sm">Loading kitchen queue...</div>
        ) : activeTickets.length === 0 ? (
          <div className="py-24 text-center text-slate-500 space-y-2">
            <ChefHat size={48} className="mx-auto text-slate-700" />
            <h4 className="text-slate-300 font-bold text-base">Kitchen is all caught up!</h4>
            <p className="text-xs text-slate-500">Incoming dine-in and takeout orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeTickets.map((t) => {
              const isLate = t.waitingMinutes > 20;
              const isMedium = t.waitingMinutes > 10;
              const borderColor = isLate ? 'border-rose-500' : isMedium ? 'border-amber-500' : 'border-emerald-500';
              const timerColor = isLate ? 'text-rose-400 bg-rose-500/20' : isMedium ? 'text-amber-400 bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/20';

              return (
                <div
                  key={t.orderId}
                  className={`bg-slate-900 border-t-4 ${borderColor} rounded-2xl p-4 flex flex-col justify-between shadow-xl text-xs border border-slate-800`}
                >
                  <div className="space-y-3">
                    {/* Ticket Header */}
                    <div className="flex justify-between items-start pb-2 border-b border-slate-800">
                      <div>
                        <h4 className="font-mono font-black text-lg text-white">#{t.orderNumber}</h4>
                        {t.tableLabel ? (
                          <span className="text-[11px] font-bold text-amber-400">Dine-in: {t.tableLabel}</span>
                        ) : (
                          <span className="text-[11px] text-sky-400">Takeout / Delivery</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${timerColor}`}>
                        <Clock size={12} />
                        {t.waitingMinutes}m
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {t.items.map((it, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-black text-amber-400 w-5">{it.quantity}×</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-200">{it.name}</p>
                            {it.variantName && <p className="text-[11px] text-sky-300">{it.variantName}</p>}
                            {it.modifiers && it.modifiers.length > 0 && (
                              <p className="text-[10px] text-slate-400">+{it.modifiers.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 mt-3">
                    {t.status === 'pending' ? (
                      <button
                        onClick={() => handleUpdateStatus(t.orderId, 'processing')}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play size={14} /> Start Preparing
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(t.orderId, 'ready')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle size={14} /> Mark Ready (Bump)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

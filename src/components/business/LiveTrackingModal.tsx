/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { Spinner, money } from '../common/ui';
import {
  Car,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  User,
  X
} from 'lucide-react';
import type { Tracking } from '../../types';

interface LiveTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string;
  businessName?: string;
}

export function LiveTrackingModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  businessName
}: LiveTrackingModalProps) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTracking = async () => {
    try {
      const data = await api.getOrderTracking(orderId);
      setTracking(data);
    } catch (err: any) {
      toast.error('Failed to load tracking data: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    fetchTracking();
    const interval = setInterval(fetchTracking, 12000);
    return () => clearInterval(interval);
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Tracking Order #{orderNumber || tracking?.orderId?.slice(-6) || ''}
              </h2>
              <p className="text-xs text-white/80">
                {businessName || tracking?.shop?.name || 'Local Shop'} • Live Updates
              </p>
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
          {loading && !tracking ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner className="w-8 h-8 text-teal-600" />
              <p className="text-sm">Fetching live delivery status...</p>
            </div>
          ) : !tracking ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Tracking information not yet available for this order.</p>
            </div>
          ) : (
            <>
              {/* ETA Highlight */}
              {tracking.etaMinutes !== null && tracking.etaMinutes !== undefined && (
                <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                      Estimated Delivery
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {tracking.etaMinutes <= 2 ? 'Arriving any minute!' : `~${tracking.etaMinutes} minutes away`}
                    </h3>
                  </div>
                </div>
              )}

              {/* Milestones Stepper */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Delivery Milestones
                </h4>
                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {tracking.milestones.map((m, idx) => {
                    const isDone = m.isDone;
                    return (
                      <div key={m.status} className="flex items-start gap-4 relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold ${
                                isDone ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                              }`}
                            >
                              {m.label}
                            </span>
                            {m.at && (
                              <span className="text-xs text-slate-400">
                                {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Partner Details */}
              {(tracking.driver || tracking.courier) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assigned Courier
                  </h4>
                  {tracking.driver && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {tracking.driver.name}
                          </div>
                          <div className="text-xs text-slate-500">In-house Delivery Driver</div>
                        </div>
                      </div>
                      {tracking.driver.phone && (
                        <a
                          href={`tel:${tracking.driver.phone}`}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-teal-700"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Driver
                        </a>
                      )}
                    </div>
                  )}

                  {tracking.courier && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {tracking.courier.name}
                        </div>
                        <div className="text-xs text-slate-500">Third-Party Courier Partner</div>
                      </div>
                      {tracking.courier.trackingUrl && (
                        <a
                          href={tracking.courier.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-medium flex items-center gap-1.5 hover:bg-slate-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Track External
                        </a>
                      )}
                    </div>
                  )}

                  {tracking.driverLocation && (
                    <div className="flex items-center gap-2 pt-2 text-xs text-teal-600 dark:text-teal-400">
                      <Compass className="w-4 h-4 animate-spin text-teal-500" />
                      <span>
                        Live GPS Signal Active (Lat {tracking.driverLocation.latitude.toFixed(4)}, Lng {tracking.driverLocation.longitude.toFixed(4)})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Destination Address */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Destination
                  </span>
                  <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                    {tracking.destination?.address || 'Customer Address on Order'}
                  </p>
                </div>
              </div>
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

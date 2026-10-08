/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { Spinner, money } from '../common/ui';
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  User,
  Users,
  X,
  XCircle
} from 'lucide-react';
import type { Booking, Service } from '../../types';

interface BookingsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

export function BookingsManagerModal({
  isOpen,
  onClose,
  businessId,
  businessName
}: BookingsManagerModalProps) {
  const [tab, setTab] = useState<'calendar' | 'services'>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // New service form
  const [showAddService, setShowAddService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('45');
  const [servicePrice, setServicePrice] = useState('500');
  const [serviceDeposit, setServiceDeposit] = useState<'none' | 'percent' | 'full'>('none');
  const [savingService, setSavingService] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getShopBookings(businessId, selectedDate);
      setBookings(data);
    } catch (err: any) {
      toast.error('Failed to load bookings: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await api.getShopServices(businessId);
      setServices(data);
    } catch (err: any) {
      toast.error('Failed to load services: ' + (err.message || 'Error'));
    }
  };

  useEffect(() => {
    if (!isOpen || !businessId) return;
    if (tab === 'calendar') {
      fetchBookings();
    } else {
      fetchServices();
    }
  }, [isOpen, businessId, selectedDate, tab]);

  const handleUpdateStatus = async (bookingId: string, status: 'completed' | 'no_show') => {
    try {
      await api.updateBookingStatus(bookingId, status);
      toast.success(`Booking marked as ${status.replace('_', ' ')}`);
      fetchBookings();
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.message || 'Error'));
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setSavingService(true);
    try {
      await api.createShopService(businessId, {
        name: serviceName.trim(),
        durationMinutes: parseInt(serviceDuration, 10) || 30,
        price: parseFloat(servicePrice) || 0,
        depositType: serviceDeposit
      });
      toast.success('Service created successfully!');
      setShowAddService(false);
      setServiceName('');
      fetchServices();
    } catch (err: any) {
      toast.error('Failed to create service: ' + (err.message || 'Error'));
    } finally {
      setSavingService(false);
    }
  };

  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Appointments & Services</h2>
              <p className="text-xs text-white/80">{businessName} • Booking Calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-4">
          <button
            onClick={() => setTab('calendar')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
              tab === 'calendar'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Schedule Calendar
          </button>
          <button
            onClick={() => setTab('services')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
              tab === 'services'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Services Catalog
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === 'calendar' ? (
            <>
              {/* Date navigation bar */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <button
                  onClick={() => shiftDate(1)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Spinner className="w-8 h-8 text-teal-600" />
                  <p className="text-sm">Loading schedule...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No appointments booked for this date.</p>
                </div>
              ) : (
                bookings.map((item) => {
                  const isPendingOrConfirmed = item.status === 'confirmed' || item.status === 'pending';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-teal-600" />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({item.service?.durationMinutes || 30} mins)
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.status === 'no_show' || item.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="pt-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.service?.name || 'Service Appointment'}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>Customer: {item.customerName || 'Walk-in'}</span>
                          {item.specialist && <span>• Specialist: {item.specialist.name}</span>}
                          <span>• {money(item.price || item.service?.price || 0)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-xs italic text-slate-400 mt-1">"{item.notes}"</p>
                        )}
                      </div>

                      {isPendingOrConfirmed && (
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'no_show')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> No-Show
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'completed')}
                            className="px-4 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              {/* Services List Tab */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Offered Services</h3>
                  <p className="text-xs text-slate-500">Bookable treatments, haircuts, tables or sessions</p>
                </div>
                <button
                  onClick={() => setShowAddService(!showAddService)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service
                </button>
              </div>

              {showAddService && (
                <form
                  onSubmit={handleCreateService}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">New Service Details</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. Deluxe Haircut & Wash"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Duration (Min)
                      </label>
                      <input
                        type="number"
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Deposit Type
                      </label>
                      <select
                        value={serviceDeposit}
                        onChange={(e) => setServiceDeposit(e.target.value as any)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="none">No Deposit</option>
                        <option value="percent">Percentage</option>
                        <option value="full">Full Upfront</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="px-3 py-1 rounded text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingService}
                      className="px-4 py-1 rounded bg-teal-600 text-white text-xs font-bold"
                    >
                      {savingService ? <Spinner className="w-3.5 h-3.5" /> : 'Save Service'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h4>
                      <p className="text-xs text-slate-500">
                        {s.durationMinutes} mins • {money(s.price)} • Deposit: {s.depositType}
                      </p>
                    </div>
                  </div>
                ))}
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

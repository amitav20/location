/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api, CheckoutInput } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import { Cart, Fulfilment, Order, PaymentIntent, TimeSlot } from '../../types';
import {
  Bike,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  MapPin,
  Phone,
  Store,
  UtensilsCrossed,
  X,
  AlertCircle
} from 'lucide-react';

interface CheckoutDialogProps {
  cart: Cart;
  onClose: () => void;
  onOrderSuccess: (orders: Order[]) => void;
}

export function CheckoutDialog({ cart, onClose, onOrderSuccess }: CheckoutDialogProps) {
  const [fulfilment, setFulfilment] = useState<Fulfilment>('delivery');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tableCode, setTableCode] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isPlacing, setIsPlacing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Primary shop ID in cart
  const primaryShopId = cart.shops[0]?.shopId;

  // Fetch available slots for the primary shop
  useEffect(() => {
    if (!primaryShopId) return;
    let isMounted = true;
    setIsLoadingSlots(true);
    api.getAvailableSlots(primaryShopId)
      .then((slots) => {
        if (isMounted) {
          setAvailableSlots(slots || []);
        }
      })
      .catch((err) => {
        console.warn('Could not load slots:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });
    return () => {
      isMounted = false;
    };
  }, [primaryShopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (fulfilment === 'delivery' && address.trim().length < 5) {
      setErrorMessage('Please enter a complete delivery address.');
      return;
    }

    if (fulfilment === 'dine_in' && !tableCode.trim()) {
      setErrorMessage('Please enter your table or counter number.');
      return;
    }

    setIsPlacing(true);
    try {
      const selectedSlot = availableSlots.find((s) => s.id === selectedSlotId);
      const scheduledFor = selectedSlot ? `${selectedSlot.startAt}` : undefined;

      const input: CheckoutInput = {
        deliveryAddress: fulfilment === 'delivery' ? address.trim() : undefined,
        fulfilment,
        contactPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        tableCode: fulfilment === 'dine_in' ? tableCode.trim() : undefined,
        scheduledFor,
        paymentMethod,
        promoCode: cart.promo?.code
      };

      const result = await api.checkout(input);
      const orders = Array.isArray(result) ? result : result.orders;
      const payment = (!Array.isArray(result) && result.payment) ? result.payment : null;

      if (payment && payment.clientSecret) {
        toast.info(`Payment initiated (${payment.status}). Completing transaction...`);
      }

      toast.success(`Success! ${orders.length} order(s) placed.`);
      onOrderSuccess(orders);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Checkout failed. Please check your details.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsPlacing(false);
    }
  };

  const deliveryFee = cart.charges?.deliveryFee ?? 0;
  const packagingFee = cart.charges?.packagingFee ?? 0;
  const taxAmount = cart.charges?.tax ?? 0;
  const discountAmount = cart.discount ?? 0;
  const subtotal = cart.subtotal;
  const grandTotal = cart.total;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900">Checkout</h3>
            <p className="text-xs text-gray-500">Review your order details and choose fulfilment</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Fulfilment Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Fulfilment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFulfilment('delivery')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  fulfilment === 'delivery'
                    ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bike size={20} className={fulfilment === 'delivery' ? 'text-teal-600' : 'text-gray-400'} />
                <span>Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfilment('pickup')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  fulfilment === 'pickup'
                    ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Store size={20} className={fulfilment === 'pickup' ? 'text-teal-600' : 'text-gray-400'} />
                <span>Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfilment('dine_in')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                  fulfilment === 'dine_in'
                    ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UtensilsCrossed size={20} className={fulfilment === 'dine_in' ? 'text-teal-600' : 'text-gray-400'} />
                <span>Dine-In</span>
              </button>
            </div>
          </div>

          {/* Fulfilment-specific Inputs */}
          {fulfilment === 'delivery' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                  Delivery Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter street, apartment, floor, landmark..."
                    className="w-full text-xs rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-3 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {fulfilment === 'dine_in' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                  Table / Counter Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value)}
                  placeholder="e.g. Table 5, Counter A, Booth 3"
                  className="w-full text-xs rounded-xl bg-gray-50 border border-gray-200 p-3 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {fulfilment === 'pickup' && (
            <div className="bg-teal-50/70 border border-teal-200/60 rounded-2xl p-4 text-xs text-teal-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Store size={15} className="text-teal-700" /> Pickup at the shop counter
              </p>
              <p className="text-teal-700/80">You will receive a notification and code when your order is ready for pickup.</p>
            </div>
          )}

          {/* Contact Phone & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="For order status updates"
                  className="w-full text-xs rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-3 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                Order Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ring the bell, cutlery please"
                className="w-full text-xs rounded-xl bg-gray-50 border border-gray-200 p-3 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Time Slot Scheduling (Feature #10) */}
          {availableSlots.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-teal-600" /> Schedule Order Time (Optional)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedSlotId('')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                    !selectedSlotId
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  As soon as possible
                </button>
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                      selectedSlotId === slot.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Selector (Feature #11) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-xl ${paymentMethod === 'cash' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <DollarSign size={16} />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Cash on Fulfilment</span>
                  <span className="text-[10px] text-gray-400 font-normal">Pay upon receipt</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  paymentMethod === 'online'
                    ? 'border-teal-600 bg-teal-50/60 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-xl ${paymentMethod === 'online' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <CreditCard size={16} />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Credit / Debit Card</span>
                  <span className="text-[10px] text-gray-400 font-normal">Fast, secure online pay</span>
                </div>
              </button>
            </div>
          </div>

          {/* Order Summary & Charges Breakdown (Feature #8) */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Charges Breakdown</h4>
            
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-800">{money(subtotal)}</span>
              </div>

              {fulfilment === 'delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-gray-800">
                    {deliveryFee > 0 ? money(deliveryFee) : 'Free'}
                  </span>
                </div>
              )}

              {packagingFee > 0 && (
                <div className="flex justify-between">
                  <span>Packaging Fee</span>
                  <span className="font-semibold text-gray-800">{money(packagingFee)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Estimated Tax</span>
                  <span className="font-semibold text-gray-800">{money(taxAmount)}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount {cart.promo?.code ? `(${cart.promo.code})` : ''}</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-black text-gray-900">
                <span>Total Due</span>
                <span className="text-teal-700 font-display text-base">{money(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPlacing}
              className="px-5 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPlacing}
              className="px-8 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              <CheckCircle size={15} />
              {isPlacing ? 'Placing Order...' : `Confirm Order · ${money(grandTotal)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

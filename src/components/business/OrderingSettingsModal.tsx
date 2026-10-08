/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import { DeliveryZone, ShopSettings } from '../../types';
import {
  Bike,
  Clock,
  DollarSign,
  MapPin,
  Plus,
  Save,
  Settings,
  Store,
  Trash2,
  UtensilsCrossed,
  X
} from 'lucide-react';

interface OrderingSettingsModalProps {
  businessId: string;
  onClose: () => void;
}

export function OrderingSettingsModal({ businessId, onClose }: OrderingSettingsModalProps) {
  // Fulfilment
  const [enableDelivery, setEnableDelivery] = useState<boolean>(true);
  const [enablePickup, setEnablePickup] = useState<boolean>(true);
  const [enableDineIn, setEnableDineIn] = useState<boolean>(true);

  // Taxes & Charges
  const [taxRate, setTaxRate] = useState<string>('5');
  const [taxInclusive, setTaxInclusive] = useState<boolean>(true);
  const [packagingFee, setPackagingFee] = useState<string>('0');

  // Scheduling
  const [asapEnabled, setAsapEnabled] = useState<boolean>(true);
  const [slotMinutes, setSlotMinutes] = useState<string>('30');
  const [daysAhead, setDaysAhead] = useState<string>('3');
  const [maxOrdersPerSlot, setMaxOrdersPerSlot] = useState<string>('10');

  // Zones
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [showAddZone, setShowAddZone] = useState<boolean>(false);
  const [zoneName, setZoneName] = useState<string>('');
  const [zoneMinKm, setZoneMinKm] = useState<string>('0');
  const [zoneMaxKm, setZoneMaxKm] = useState<string>('5');
  const [zoneFee, setZoneFee] = useState<string>('3');
  const [zoneMinOrder, setZoneMinOrder] = useState<string>('15');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getShopSettings(businessId), api.getDeliveryZones(businessId)])
      .then(([settings, zonesList]) => {
        if (!active) return;
        if (settings.fulfilment) {
          setEnableDelivery(settings.fulfilment.delivery ?? true);
          setEnablePickup(settings.fulfilment.pickup ?? true);
          setEnableDineIn(settings.fulfilment.dineIn ?? true);
        }
        if (settings.taxes && settings.taxes.length > 0) {
          setTaxRate(String(settings.taxes[0].rate || 0));
        }
        setTaxInclusive(settings.taxInclusive ?? true);
        setPackagingFee(String(settings.packagingFee ?? 0));
        if (settings.scheduling) {
          setAsapEnabled(settings.scheduling.asap ?? true);
          setSlotMinutes(String(settings.scheduling.slotMinutes || 30));
          setDaysAhead(String(settings.scheduling.daysAhead || 3));
          setMaxOrdersPerSlot(String(settings.scheduling.maxOrdersPerSlot || 10));
        }
        setZones(zonesList || []);
      })
      .catch((err) => {
        toast.error(err.message || 'Could not load ordering settings.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Partial<ShopSettings> = {
        fulfilment: {
          delivery: enableDelivery,
          pickup: enablePickup,
          dineIn: enableDineIn,
        },
        taxInclusive,
        packagingFee: Number(packagingFee) || 0,
        taxes: [{ name: 'Standard Tax', rate: Number(taxRate) || 0, inclusive: taxInclusive }],
        scheduling: {
          asap: asapEnabled,
          slotMinutes: Number(slotMinutes) || 30,
          daysAhead: Number(daysAhead) || 3,
          maxOrdersPerSlot: Number(maxOrdersPerSlot) || 10,
        },
      };

      await Promise.all([
        api.updateShopSettings(businessId, payload),
        api.setDeliveryZones(businessId, zones),
      ]);

      toast.success('Ordering settings and delivery zones saved!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddZone = () => {
    if (!zoneName.trim()) {
      toast.error('Please enter a zone name.');
      return;
    }
    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: zoneName.trim(),
      type: 'circle',
      minKm: Number(zoneMinKm) || 0,
      maxKm: Number(zoneMaxKm) || 5,
      fee: Number(zoneFee) || 0,
      minOrder: Number(zoneMinOrder) || 0,
      enabled: true,
    };
    setZones((prev) => [...prev, newZone]);
    setShowAddZone(false);
    setZoneName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Settings size={18} className="text-teal-600" /> Ordering & Delivery Settings
            </h3>
            <p className="text-xs text-gray-500">Configure fulfilment channels, taxes, packaging & delivery radius</p>
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
          <div className="py-20 text-center text-xs text-gray-400">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            {/* Fulfilment Channels */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fulfilment Channels</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between gap-3 transition-all ${
                  enableDelivery ? 'border-teal-600 bg-teal-50/50' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <Bike size={20} className={enableDelivery ? 'text-teal-600' : 'text-gray-400'} />
                    <input
                      type="checkbox"
                      checked={enableDelivery}
                      onChange={(e) => setEnableDelivery(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">Delivery</span>
                    <span className="text-[10px] text-gray-500">Accept delivery orders</span>
                  </div>
                </label>

                <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between gap-3 transition-all ${
                  enablePickup ? 'border-teal-600 bg-teal-50/50' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <Store size={20} className={enablePickup ? 'text-teal-600' : 'text-gray-400'} />
                    <input
                      type="checkbox"
                      checked={enablePickup}
                      onChange={(e) => setEnablePickup(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">Pickup</span>
                    <span className="text-[10px] text-gray-500">Counter collection</span>
                  </div>
                </label>

                <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between gap-3 transition-all ${
                  enableDineIn ? 'border-teal-600 bg-teal-50/50' : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <UtensilsCrossed size={20} className={enableDineIn ? 'text-teal-600' : 'text-gray-400'} />
                    <input
                      type="checkbox"
                      checked={enableDineIn}
                      onChange={(e) => setEnableDineIn(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">Dine-In</span>
                    <span className="text-[10px] text-gray-500">Table QR code ordering</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Taxes & Charges */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Taxes & Packaging Charges</h4>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Packaging Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={packagingFee}
                      onChange={(e) => setPackagingFee(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="tax-inclusive"
                    checked={taxInclusive}
                    onChange={(e) => setTaxInclusive(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="tax-inclusive" className="font-semibold text-gray-700 cursor-pointer">
                    Tax-Inclusive Pricing (Menu prices already include taxes)
                  </label>
                </div>
              </div>
            </div>

            {/* Order Scheduling */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduling & Time Slots</h4>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="asap-enabled"
                    checked={asapEnabled}
                    onChange={(e) => setAsapEnabled(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="asap-enabled" className="font-semibold text-gray-700 cursor-pointer">
                    Enable Immediate / ASAP Orders
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Slot Interval</label>
                    <input
                      type="number"
                      value={slotMinutes}
                      onChange={(e) => setSlotMinutes(e.target.value)}
                      placeholder="e.g. 30 min"
                      className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Advance Days</label>
                    <input
                      type="number"
                      value={daysAhead}
                      onChange={(e) => setDaysAhead(e.target.value)}
                      placeholder="e.g. 3 days"
                      className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Max Orders/Slot</label>
                    <input
                      type="number"
                      value={maxOrdersPerSlot}
                      onChange={(e) => setMaxOrdersPerSlot(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Zones */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Delivery Zones ({zones.length})
                </h4>
                {!showAddZone && (
                  <button
                    type="button"
                    onClick={() => setShowAddZone(true)}
                    className="px-3 py-1 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Zone
                  </button>
                )}
              </div>

              {showAddZone && (
                <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 space-y-3 text-xs">
                  <h5 className="font-bold text-gray-800">Add Radius Zone</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Zone name (e.g. Inner City)"
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      className="col-span-2 text-xs rounded-xl bg-white border border-gray-200 p-2 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Min KM"
                      value={zoneMinKm}
                      onChange={(e) => setZoneMinKm(e.target.value)}
                      className="text-xs rounded-xl bg-white border border-gray-200 p-2 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max KM"
                      value={zoneMaxKm}
                      onChange={(e) => setZoneMaxKm(e.target.value)}
                      className="text-xs rounded-xl bg-white border border-gray-200 p-2 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Fee ($)"
                      value={zoneFee}
                      onChange={(e) => setZoneFee(e.target.value)}
                      className="text-xs rounded-xl bg-white border border-gray-200 p-2 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Min Order ($)"
                      value={zoneMinOrder}
                      onChange={(e) => setZoneMinOrder(e.target.value)}
                      className="text-xs rounded-xl bg-white border border-gray-200 p-2 outline-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddZone(false)}
                      className="px-3 py-1.5 text-xs text-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddZone}
                      className="px-4 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
                    >
                      Add Zone
                    </button>
                  </div>
                </div>
              )}

              {zones.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-3">No delivery zones set.</p>
              ) : (
                <div className="space-y-2">
                  {zones.map((z) => (
                    <div key={z.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <h5 className="font-bold text-gray-800">{z.name}</h5>
                        <p className="text-[11px] text-gray-500">
                          {z.minKm} - {z.maxKm} km · Fee: {money(z.fee)} · Min order: {money(z.minOrder)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setZones((prev) => prev.filter((item) => item.id !== z.id))}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

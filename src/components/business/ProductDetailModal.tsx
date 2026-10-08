/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { SafeImage, money } from '../common/ui';
import { Product, ProductVariant, ModifierGroup, ModifierItem } from '../../types';
import {
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  X,
  AlertCircle
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, options?: { variantId?: string; modifierIds?: string[] }) => Promise<boolean | void>;
}

export function ProductDetailModal({ product, onClose, onAddToCart }: ProductDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.options && product.options.length > 0) {
      product.options.forEach((opt) => {
        if (opt.values && opt.values.length > 0) {
          initial[opt.name] = opt.values[0];
        }
      });
    }
    return initial;
  });

  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [isNotified, setIsNotified] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Match selected variant
  const activeVariant: ProductVariant | null = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    return (
      product.variants.find((v) => {
        if (!v.optionValues) return false;
        return Object.entries(selectedOptions).every(
          ([optName, optVal]) => v.optionValues?.[optName] === optVal
        );
      }) || product.variants[0] || null
    );
  }, [product.variants, selectedOptions]);

  // Current effective price and stock
  const effectivePrice = activeVariant?.price ?? product.price;
  const effectiveStock = activeVariant ? (activeVariant.stock ?? 0) : product.stock;
  const isOutOfStock = effectiveStock <= 0;

  // Flatten selected modifier IDs and calculate modifier additional price
  const selectedModifierIds = useMemo(() => {
    return Object.values(selectedModifiers).flat();
  }, [selectedModifiers]);

  const modifiersExtraPrice = useMemo(() => {
    let total = 0;
    if (!product.modifierGroups) return 0;
    const allItems: ModifierItem[] = product.modifierGroups.flatMap((g) => g.items || []);
    selectedModifierIds.forEach((id) => {
      const item = allItems.find((i) => i.id === id);
      if (item && item.price) total += item.price;
    });
    return total;
  }, [product.modifierGroups, selectedModifierIds]);

  const lineTotal = (effectivePrice + modifiersExtraPrice) * quantity;

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  };

  const handleModifierToggle = (group: ModifierGroup, item: ModifierItem) => {
    setSelectedModifiers((prev) => {
      const current = prev[group.id] || [];
      const isSelected = current.includes(item.id);
      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== item.id) };
      }
      // If single selection (maxSelection === 1)
      if (group.maxSelection === 1) {
        return { ...prev, [group.id]: [item.id] };
      }
      // If maxSelection reached
      if (group.maxSelection && current.length >= group.maxSelection) {
        toast.info(`You can select at most ${group.maxSelection} in ${group.name}.`);
        return prev;
      }
      return { ...prev, [group.id]: [...current, item.id] };
    });
  };

  const handleToggleNotify = async () => {
    setIsSubscribing(true);
    try {
      if (isNotified) {
        await api.unsubscribeStockNotification(product.id, activeVariant?.id);
        setIsNotified(false);
        toast.success("You'll no longer receive stock notifications for this item.");
      } else {
        await api.subscribeStockNotification(product.id, activeVariant?.id);
        setIsNotified(true);
        toast.success("We'll notify you when this item is back in stock!");
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update alert.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleAdd = async () => {
    // Validate required modifier groups
    if (product.modifierGroups) {
      for (const group of product.modifierGroups) {
        const count = (selectedModifiers[group.id] || []).length;
        if (group.minSelection && count < group.minSelection) {
          toast.error(`Please select at least ${group.minSelection} option(s) for "${group.name}".`);
          return;
        }
      }
    }

    setIsAdding(true);
    try {
      const success = await onAddToCart(product, quantity, {
        variantId: activeVariant?.id,
        modifierIds: selectedModifierIds.length > 0 ? selectedModifierIds : undefined
      });
      if (success !== false) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not add to bag.');
    } finally {
      setIsAdding(false);
    }
  };

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 pr-2">
            <h3 className="font-display font-black text-lg text-gray-900 truncate">{product.name}</h3>
            {product.category && <p className="text-xs text-teal-700 font-semibold">{product.category}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Images Section */}
          <div className="space-y-3">
            <div className="relative h-64 md:h-72 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              {images.length > 0 ? (
                <SafeImage
                  src={images[selectedImageIndex] || images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  fallback={<ShoppingBag size={48} className="text-gray-300 mx-auto" />}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ShoppingBag size={48} />
                </div>
              )}

              {/* Stock Badge */}
              <div className="absolute top-3 left-3">
                {isOutOfStock ? (
                  <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Out of Stock
                  </span>
                ) : effectiveStock <= 5 ? (
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Only {effectiveStock} left!
                  </span>
                ) : (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    In Stock ({effectiveStock})
                  </span>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedImageIndex === idx ? 'border-teal-600 ring-2 ring-teal-100' : 'border-gray-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">About</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Variant Options Selection (e.g. Size, Color) */}
          {product.options && product.options.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {product.options.map((opt) => (
                <div key={opt.name} className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {opt.name}: <span className="text-teal-700 capitalize font-black">{selectedOptions[opt.name] || 'Select'}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const isSelected = selectedOptions[opt.name] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleOptionChange(opt.name, val)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modifier Groups (Add-ons / Toppings) */}
          {product.modifierGroups && product.modifierGroups.length > 0 && (
            <div className="space-y-5 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add-ons & Options</h4>
              {product.modifierGroups.map((group) => {
                const groupSelected = selectedModifiers[group.id] || [];
                return (
                  <div key={group.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <h5 className="font-bold text-sm text-gray-900">{group.name}</h5>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {group.minSelection && group.minSelection > 0 ? (
                          <span className="text-amber-600 font-bold">Required ({group.minSelection}) · </span>
                        ) : null}
                        {group.maxSelection ? `Up to ${group.maxSelection}` : 'Optional'}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {group.items.map((item) => {
                        const isChecked = groupSelected.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/60 px-2 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type={group.maxSelection === 1 ? 'radio' : 'checkbox'}
                                name={`group-${group.id}`}
                                checked={isChecked}
                                onChange={() => handleModifierToggle(group, item)}
                                className="rounded text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-xs font-semibold text-gray-800">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-700">
                              {item.price > 0 ? `+${money(item.price)}` : 'Free'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Restock Notification Banner if Out of Stock */}
          {isOutOfStock && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-800 text-xs font-medium">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>Currently out of stock. Want to know when it’s back?</span>
              </div>
              <button
                type="button"
                onClick={handleToggleNotify}
                disabled={isSubscribing}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isNotified
                    ? 'bg-rose-200 text-rose-900 hover:bg-rose-300'
                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                }`}
              >
                {isNotified ? (
                  <>
                    <BellOff size={13} /> Subscribed
                  </>
                ) : (
                  <>
                    <Bell size={13} /> Notify Me
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer (Quantity + Add To Bag) */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isOutOfStock}
                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-xl hover:bg-gray-50"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold text-gray-800">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                disabled={quantity >= effectiveStock || isOutOfStock}
                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-xl hover:bg-gray-50"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="text-right sm:text-left">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total</span>
              <span className="text-lg font-black font-display text-gray-900">{money(lineTotal)}</span>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock || isAdding}
              className="flex-2 sm:flex-none px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              <ShoppingBag size={15} />
              {isAdding ? 'Adding...' : isOutOfStock ? 'Sold Out' : `Add to Bag · ${money(lineTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

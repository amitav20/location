/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { CartItem, Product } from '../../types';

export interface AppliedPromo {
  code: string;
  discountPercent: number;
  businessId: string | null; // null = platform-wide code
}

function readStoredCart(key: string): { items: CartItem[]; promo: AppliedPromo | null } {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      promo: parsed?.promo || null
    };
  } catch {
    return { items: [], promo: null };
  }
}

// Shopping bag + applied coupon, persisted per user so it survives tab switches and reloads
export function useCart(userId: string | undefined) {
  const storageKey = `geoconnect_cart_${userId || 'guest'}`;
  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart(storageKey).items);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(() => readStoredCart(storageKey).promo);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ items: cart, promo: appliedPromo }));
    } catch {
      // Storage unavailable (private mode etc.) - cart just won't persist
    }
  }, [cart, appliedPromo, storageKey]);

  /** Adds one more of a product; returns false if that would exceed the available stock. */
  const addToCart = (product: Product): boolean => {
    const inCart = cart.find((i) => i.productId === product.id)?.quantity || 0;
    if (inCart + 1 > Math.min(99, product.stock)) return false;
    setCart((prev) =>
      prev.some((i) => i.productId === product.id)
        ? prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1, product } : i))
        : [...prev, { productId: product.id, quantity: 1, product }]
    );
    return true;
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  /** Sets a line's quantity (1..stock, max 99); 0 removes it. */
  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const max = Math.min(99, i.product?.stock ?? 99);
          return { ...i, quantity: Math.max(0, Math.min(quantity, max)) };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const lineTotal = (i: CartItem) => (i.product?.price || 0) * i.quantity;
  const subtotal = cart.reduce((sum, i) => sum + lineTotal(i), 0);
  const discountAmount = appliedPromo
    ? cart
        .filter((i) => appliedPromo.businessId === null || i.product?.businessId === appliedPromo.businessId)
        .reduce((sum, i) => sum + lineTotal(i), 0) *
      (appliedPromo.discountPercent / 100)
    : 0;

  return {
    cart,
    addToCart,
    removeFromCart,
    setQuantity,
    clearCart,
    appliedPromo,
    setAppliedPromo,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    itemCount: cart.reduce((n, i) => n + i.quantity, 0)
  };
}

export type CartState = ReturnType<typeof useCart>;

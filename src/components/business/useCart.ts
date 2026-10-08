/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { Cart, CartLine, Product } from '../../types';
import { toast } from '../Toaster';

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCart = useCallback(async (code?: string) => {
    try {
      const data = await api.getCart(code !== undefined ? code : promoCode);
      setCart(data);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [promoCode]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (
    product: Product,
    qty = 1,
    options?: { variantId?: string; modifierIds?: string[] }
  ): Promise<boolean> => {
    try {
      let updated: Cart;
      if (options?.variantId || (options?.modifierIds && options.modifierIds.length > 0)) {
        updated = await api.addCartItem(product.id, qty, options, promoCode);
      } else {
        const currentQty = cart?.shops.flatMap((s) => s.items).find((i) => i.product.id === product.id && !i.variant && (!i.modifiers || i.modifiers.length === 0))?.quantity || 0;
        updated = await api.setCartQuantity(product.id, currentQty + qty, promoCode);
      }
      setCart(updated);
      toast.success(`${product.name} added to your bag.`);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Could not add to bag.');
      return false;
    }
  };

  const updateLine = async (lineId: string, quantity: number) => {
    try {
      const updated = await api.updateCartLine(lineId, quantity, promoCode);
      setCart(updated);
    } catch (err: any) {
      toast.error(err.message || 'Could not update quantity.');
    }
  };

  const removeLine = async (lineId: string) => {
    try {
      const updated = await api.removeCartLine(lineId, promoCode);
      setCart(updated);
    } catch (err: any) {
      toast.error(err.message || 'Could not remove item.');
    }
  };

  const setQuantity = async (productId: string, quantity: number) => {
    try {
      const updated = await api.setCartQuantity(productId, quantity, promoCode);
      setCart(updated);
    } catch (err: any) {
      toast.error(err.message || 'Could not update quantity.');
    }
  };

  const removeFromCart = async (productId: string) => {
    await setQuantity(productId, 0);
  };

  const clearCart = async () => {
    try {
      const updated = await api.clearCart();
      setCart(updated);
      setPromoCode('');
    } catch (err: any) {
      toast.error(err.message || 'Could not clear cart.');
    }
  };

  const applyPromo = async (code: string): Promise<boolean> => {
    try {
      const updated = await api.getCart(code.trim());
      setCart(updated);
      if (updated.promo && updated.promo.valid) {
        setPromoCode(code.trim());
        toast.success(updated.promo.message || 'Coupon applied!');
        return true;
      } else {
        toast.error(updated.promo?.message || 'Invalid coupon code.');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid coupon code.');
      return false;
    }
  };

  const removePromo = async () => {
    setPromoCode('');
    await fetchCart('');
  };

  const cartItems: CartLine[] = cart ? cart.shops.flatMap((s) => s.items) : [];

  return {
    cart,
    cartItems,
    shops: cart?.shops || [],
    itemCount: cart?.itemsCount || 0,
    subtotal: cart?.subtotal || 0,
    discountAmount: cart?.discount || 0,
    total: cart?.total || 0,
    canCheckout: cart?.canCheckout ?? false,
    promo: cart?.promo || null,
    promoCode,
    setPromoCode,
    applyPromo,
    removePromo,
    addToCart,
    setQuantity,
    removeFromCart,
    updateLine,
    removeLine,
    clearCart,
    refresh: () => fetchCart(),
    isLoading
  };
}

export type CartState = ReturnType<typeof useCart>;

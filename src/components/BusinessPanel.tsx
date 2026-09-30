/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { ShopView } from './business/ShopView';
import { BusinessDashboard } from './business/BusinessDashboard';
import { useCart } from './business/useCart';
import { BIZ_CATEGORIES } from './business/theme';
import { formatOrderNumber } from './business/orders';
import { Business, Order, Product, User } from '../types';
import { Briefcase, CreditCard, MapPin, Minus, Plus, ShoppingBag, Star, Store, Trash2 } from 'lucide-react';

interface BusinessPanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
  /** 'orders', 'dashboard', or a shop id to open (from a notification or the map) */
  initialTarget?: string;
}

type SubTab = 'directory' | 'marketplace' | 'cart' | 'dashboard';

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const money = (n: number) => `$${n.toFixed(2)}`;

const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-200 text-gray-600'
};

export function BusinessPanel({ currentUser, setAppView, triggerNotificationRefresh, initialTarget }: BusinessPanelProps) {
  const initialTab: SubTab = initialTarget === 'orders' ? 'cart' : initialTarget === 'dashboard' ? 'dashboard' : 'directory';
  const shopToOpen = initialTarget && !['orders', 'dashboard'].includes(initialTarget) ? initialTarget : undefined;

  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialTab);

  // Directory
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [range, setRange] = useState<string>(shopToOpen ? 'global' : '25');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<Business | null>(null);
  const [isLoadingShops, setIsLoadingShops] = useState(true);

  // Marketplace
  const [marketplaceProducts, setMarketplaceProducts] = useState<(Product & { distanceKm?: number })[]>([]);
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('');
  const [marketRange, setMarketRange] = useState<string>('50');

  // Bag (persisted per user) + checkout
  const bag = useCart(currentUser.id);
  const { cart, removeFromCart, setQuantity, clearCart, appliedPromo, setAppliedPromo, discountAmount, total: cartTotal, itemCount } = bag;
  const [checkoutAddress, setCheckoutAddress] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderMessage, setOrderMessage] = useState<string>('');
  const [orderError, setOrderError] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  const fetchBusinesses = async () => {
    setIsLoadingShops(true);
    try {
      const data: Business[] = await api.getBusinesses({ range, category, search });
      setBusinesses(data);
      if (shopToOpen && !selectedShop) {
        const shop = data.find((b) => b.id === shopToOpen);
        if (shop) setSelectedShop(shop);
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not load shops.'));
    } finally {
      setIsLoadingShops(false);
    }
  };

  const fetchMarketplace = async () => {
    try {
      setMarketplaceProducts(await api.getMarketplaceProducts({ search: marketSearch, category: marketCategory, range: marketRange }));
    } catch (err) {
      toast.error(errorText(err, 'Could not load products.'));
    }
  };

  const fetchOrders = async () => {
    try {
      setOrders(await api.getOrders());
    } catch (err) {
      console.error(err);
    }
  };

  // Debounce text filters so we don't query on every keystroke
  useEffect(() => {
    if (activeSubTab !== 'directory') return;
    const t = window.setTimeout(fetchBusinesses, search ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [activeSubTab, range, category, search, currentUser.location.latitude, currentUser.location.longitude]);

  useEffect(() => {
    if (activeSubTab !== 'marketplace') return;
    const t = window.setTimeout(fetchMarketplace, marketSearch || marketCategory ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [activeSubTab, marketSearch, marketCategory, marketRange, currentUser.location.latitude, currentUser.location.longitude]);

  useEffect(() => {
    if (activeSubTab === 'cart') fetchOrders();
  }, [activeSubTab]);

  const handleFollowShop = async (shopId: string) => {
    try {
      const res = await api.toggleFollow(shopId, 'business');
      const patch = (b: Business) =>
        b.id === shopId ? { ...b, isFollowing: res.following, followersCount: Math.max(0, (b.followersCount || 0) + (res.following ? 1 : -1)) } : b;
      setBusinesses((list) => list.map(patch));
      setSelectedShop((s) => (s ? patch(s) : s));
      toast.success(res.following ? "You'll get this shop's offers and updates." : 'Unfollowed.');
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong.'));
    }
  };

  const handleSendMessage = async (ownerId: string) => {
    if (ownerId === currentUser.id) {
      toast.info('This is your own shop.');
      return;
    }
    try {
      const thread = await api.startPrivateChat(ownerId);
      setAppView('chat', thread.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not start chat.'));
    }
  };

  // Reload the directory after a review so the shop header shows the new average rating
  const refreshSelectedShop = async (shopId: string) => {
    try {
      const updated: Business[] = await api.getBusinesses({ range: 'global' });
      const found = updated.find((b) => b.id === shopId);
      if (found) setSelectedShop(found);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is sold out.`);
      return;
    }
    if (bag.addToCart(product)) toast.success(`${product.name} added to your bag.`);
    else toast.error(`Only ${product.stock} of ${product.name} available.`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setOrderError('');
    setOrderMessage('');
    if (checkoutAddress.trim().length < 5) {
      setOrderError('Please enter a delivery or pickup address.');
      return;
    }
    setIsCheckingOut(true);
    try {
      const items = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      await api.checkoutCart(items, checkoutAddress.trim(), appliedPromo?.code);
      clearCart();
      setCheckoutAddress('');
      setOrderMessage('Order placed! The shop has been notified.');
      setSelectedShop(null);
      setActiveSubTab('cart');
      fetchOrders();
      triggerNotificationRefresh();
    } catch (err) {
      setOrderError(errorText(err, 'Checkout failed. Please try again.'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cancelOrder = async (o: Order) => {
    if (!(await confirmAction(`Cancel your ${money(o.totalAmount)} order from ${o.businessName}?`, 'Cancel order'))) return;
    try {
      await api.cancelOrder(o.id);
      toast.success('Order cancelled.');
      fetchOrders();
    } catch (err) {
      toast.error(errorText(err, 'Could not cancel the order.'));
    }
  };

  const selectClass = 'bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Store size={22} /> Local Shops & Services
          </h2>
          <p className="text-xs text-teal-100 mt-1">Discover, order from and support shops near you.</p>
        </div>

        <div className="grid grid-cols-4 md:flex gap-1.5 bg-black/15 p-1 rounded-xl">
          {[
            { id: 'directory' as const, label: 'Shops', icon: <Store size={14} /> },
            { id: 'marketplace' as const, label: 'Marketplace', icon: <ShoppingBag size={14} /> },
            { id: 'cart' as const, label: `Bag & Orders${itemCount ? ` (${itemCount})` : ''}`, icon: <CreditCard size={14} /> },
            { id: 'dashboard' as const, label: 'My Business', icon: <Briefcase size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSelectedShop(null);
                setOrderMessage('');
                setOrderError('');
              }}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs font-semibold ${
                activeSubTab === tab.id ? 'bg-white text-teal-800' : 'text-white hover:bg-white/10'
              }`}
              title={tab.label}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Directory */}
      {activeSubTab === 'directory' && !selectedShop && (
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search shops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`md:w-56 ${selectClass}`} aria-label="Category">
              <option value="">All categories</option>
              {BIZ_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value)} className={`md:w-40 ${selectClass}`} aria-label="Distance">
              <option value="5">Within 5 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="global">Anywhere</option>
            </select>
          </div>

          {isLoadingShops ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center bg-white py-16 rounded-3xl border border-gray-200 text-gray-500 text-sm">No shops found nearby. Try a wider distance.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => setSelectedShop(biz)}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:ring-1 hover:ring-teal-100 transition-all flex flex-col text-left"
                >
                  <div className="relative h-40 bg-gray-200 w-full">
                    <img src={biz.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    <span className="absolute top-3 left-3 bg-white/90 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-700 shadow-sm">{biz.category}</span>
                    {biz.isVerified ? (
                      <span className="absolute top-3 right-3 bg-teal-500 text-white px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-sm">Verified</span>
                    ) : (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-sm">Awaiting verification</span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2 w-full">
                    <div className="flex items-start gap-2 justify-between">
                      <h4 className="font-bold text-gray-800 text-sm">{biz.name}</h4>
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-lg shrink-0">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        {biz.averageRating ? biz.averageRating.toFixed(1) : 'New'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{biz.description}</p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto pt-2">
                      <MapPin size={12} className="text-teal-600 shrink-0" /> <span className="truncate">{biz.address}</span>
                    </p>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
                      <span className="text-teal-700">{biz.distanceKm} km away</span>
                      <span>
                        {biz.followersCount || 0} followers{biz.isFollowing ? ' · Following' : ''}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'directory' && selectedShop && (
        <ShopView
          key={selectedShop.id}
          shop={selectedShop}
          currentUser={currentUser}
          bag={bag}
          onBack={() => setSelectedShop(null)}
          onFollow={handleFollowShop}
          onMessage={handleSendMessage}
          onAddToCart={handleAddToCart}
          onReviewSubmitted={refreshSelectedShop}
          checkoutAddress={checkoutAddress}
          setCheckoutAddress={setCheckoutAddress}
          orderError={orderError}
          isCheckingOut={isCheckingOut}
          onCheckout={handleCheckout}
        />
      )}

      {/* Marketplace */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search products..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
            />
            <input
              type="text"
              placeholder="Category (e.g. Food, Apparel)"
              value={marketCategory}
              onChange={(e) => setMarketCategory(e.target.value)}
              className="md:w-56 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
            />
            <select value={marketRange} onChange={(e) => setMarketRange(e.target.value)} className={`md:w-40 ${selectClass}`} aria-label="Distance">
              <option value="5">Within 5 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="global">Anywhere</option>
            </select>
          </div>

          {marketplaceProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 text-gray-500 text-sm">No products found. Try a wider distance.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {marketplaceProducts.map((p) => {
                const soldOut = p.stock <= 0;
                return (
                  <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col">
                    <div className="h-40 bg-gray-100 relative">
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      <span className="absolute top-2 left-2 bg-teal-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{p.category}</span>
                      {soldOut && <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm font-bold text-gray-700">Sold out</span>}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                      <h4 className="font-bold text-gray-800 text-sm truncate" title={p.name}>{p.name}</h4>
                      <p className="text-xs text-gray-500 font-semibold truncate">
                        {p.businessName}
                        {p.distanceKm !== undefined && ` · ${p.distanceKm} km`}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                        <span className="text-sm font-bold text-teal-700">{money(p.price)}</span>
                        <button
                          onClick={() => handleAddToCart(p)}
                          disabled={soldOut}
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bag & orders */}
      {activeSubTab === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-gray-800">Your bag</h3>

            {cart.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Your bag is empty.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex gap-3 bg-gray-50 p-3 rounded-2xl items-center border border-gray-100">
                    <img src={item.product?.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover bg-white" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">{item.product?.name}</h4>
                      <span className="text-xs text-gray-500">{money(item.product?.price || 0)} each</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl">
                      <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="p-1.5 text-gray-600 hover:text-teal-700" aria-label="Decrease quantity">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= Math.min(99, item.product?.stock ?? 99)}
                        className="p-1.5 text-gray-600 hover:text-teal-700 disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-teal-700 w-16 text-right">{money((item.product?.price || 0) * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Remove">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {appliedPromo && (
                    <div className="flex justify-between items-center text-sm text-emerald-700 font-semibold">
                      <span>
                        Coupon {appliedPromo.code} (-{appliedPromo.discountPercent}%)
                        <button type="button" onClick={() => setAppliedPromo(null)} className="ml-2 text-xs text-gray-400 hover:text-red-500 underline">
                          remove
                        </button>
                      </span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-teal-700 text-lg">{money(cartTotal)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Have a coupon? Open the shop and enter it in the bag there.</p>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs text-gray-500 font-bold uppercase block">Delivery address</label>
                    <input
                      type="text"
                      placeholder="Street, number, city"
                      value={checkoutAddress}
                      maxLength={300}
                      onChange={(e) => setCheckoutAddress(e.target.value)}
                      className="w-full text-sm rounded-xl border border-gray-200 p-3 outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {orderError && <p className="text-sm text-rose-600 font-semibold bg-rose-50 px-3 py-2 rounded-xl">{orderError}</p>}

                  <button onClick={handleCheckout} disabled={isCheckingOut} className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                    {isCheckingOut ? 'Placing order...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 h-fit">
            <h3 className="font-bold text-gray-800">Your orders</h3>
            {orderMessage && <p className="text-sm bg-teal-50 text-teal-700 p-2.5 rounded-xl font-medium">{orderMessage}</p>}

            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No orders yet.</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {orders.map((o) => (
                  <div key={o.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        Order {formatOrderNumber(o.id)} · {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{o.businessName}</p>
                    <div className="space-y-0.5">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-600">
                          <span>
                            {it.productName} × {it.quantity}
                          </span>
                          <span>{money(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {o.promoCode && (
                      <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                        <span>Coupon {o.promoCode} (-{o.discountPercent}%)</span>
                        <span>-{money((o.subtotalAmount || 0) - o.totalAmount)}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={11} /> {o.address}
                    </p>
                    <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span className="text-teal-700">{money(o.totalAmount)}</span>
                    </div>
                    {o.status === 'pending' && (
                      <button onClick={() => cancelOrder(o)} className="w-full py-1.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold text-gray-600">
                        Cancel order
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'dashboard' && <BusinessDashboard currentUser={currentUser} triggerNotificationRefresh={triggerNotificationRefresh} />}
    </div>
  );
}

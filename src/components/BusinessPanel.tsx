/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { BusinessDashboard } from './business/BusinessDashboard';
import { ShopView } from './business/ShopView';
import { useCart } from './business/useCart';
import { CheckoutDialog } from './business/CheckoutDialog';
import { Avatar, SafeImage, Spinner, distanceLabel, money, errorText } from './common/ui';
import { Business, BusinessCategoryItem, Order, OrderStatus, Product, User } from '../types';
import {
  Briefcase,
  Check,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Store,
  Trash2
} from 'lucide-react';

interface BusinessPanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
  shopToOpen?: string;
  initialTarget?: string;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  ready: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-200 text-gray-600'
};

export function BusinessPanel({ currentUser, setAppView, triggerNotificationRefresh, shopToOpen, initialTarget }: BusinessPanelProps) {
  const targetShopId = shopToOpen || initialTarget;
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'marketplace' | 'cart' | 'dashboard'>('directory');

  // Categories
  const [categories, setCategories] = useState<BusinessCategoryItem[]>([]);

  // Directory
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedShop, setSelectedShop] = useState<Business | null>(null);
  const [range, setRange] = useState<string>('25');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isLoadingShops, setIsLoadingShops] = useState(true);

  // Marketplace
  const [marketplaceProducts, setMarketplaceProducts] = useState<Product[]>([]);
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('');
  const [marketRange, setMarketRange] = useState<string>('50');

  // Server-backed Bag & Checkout
  const bag = useCart();
  const { cartItems, removeFromCart, setQuantity, clearCart, promo, discountAmount, total: cartTotal, itemCount, canCheckout } = bag;
  const [checkoutAddress, setCheckoutAddress] = useState<string>(
    [currentUser.location?.city, currentUser.location?.state, currentUser.location?.country].filter(Boolean).join(', ')
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderMessage, setOrderMessage] = useState<string>('');
  const [orderError, setOrderError] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState<boolean>(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const fetchBusinesses = async () => {
    setIsLoadingShops(true);
    try {
      const data: Business[] = await api.getBusinesses({ range, category, search });
      setBusinesses(data);
      if (targetShopId && !selectedShop) {
        const shop = data.find((b) => b.id === targetShopId || b.slug === targetShopId);
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
    const shop = businesses.find((b) => b.id === shopId) || selectedShop;
    const isFollowing = shop?.isFollowing ?? false;
    try {
      const res = await api.setFollowBusiness(shopId, !isFollowing);
      const patch = (b: Business) =>
        b.id === shopId ? { ...b, isFollowing: res.following, followersCount: res.followersCount } : b;
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

  const refreshSelectedShop = async (shopId: string) => {
    try {
      const found = businesses.find((b) => b.id === shopId);
      if (found) {
        const updated = await api.getBusiness(found.slug);
        setSelectedShop(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is sold out.`);
      return;
    }
    await bag.addToCart(product);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isCheckingOut) return;
    setOrderError('');
    setOrderMessage('');
    if (checkoutAddress.trim().length < 5) {
      setOrderError('Please enter a delivery or pickup address.');
      return;
    }
    setIsCheckingOut(true);
    try {
      const placedOrders = await api.checkout(checkoutAddress.trim(), '', promo?.code);
      await clearCart();
      setOrderMessage(`Order placed! ${placedOrders.length} order(s) created.`);
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
    if (!(await confirmAction(`Cancel order ${o.number} from ${o.businessName}?`, 'Cancel order'))) return;
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
    <div className="space-y-6 text-left">
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
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
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
            <Spinner label="Loading shops..." />
          ) : businesses.length === 0 ? (
            <div className="text-center bg-white py-16 rounded-3xl border border-gray-200 text-gray-500 text-sm">
              No shops found nearby. Try a wider distance.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => setSelectedShop(biz)}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md hover:ring-1 hover:ring-teal-100 transition-all flex flex-col text-left"
                >
                  <div className="relative h-40 bg-gray-200 w-full">
                    <SafeImage src={biz.coverImage} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 bg-white/90 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-700 shadow-sm">
                      {biz.category}
                    </span>
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
                    {biz.description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{biz.description}</p>}
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto pt-2">
                      <MapPin size={12} className="text-teal-600 shrink-0" /> <span className="truncate">{biz.address}</span>
                    </p>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
                      <span className="text-teal-700">{distanceLabel(biz.distanceKm)}</span>
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
              placeholder="Category (e.g. Coffee, Bakery)"
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
                      <SafeImage src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-teal-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{p.category}</span>
                      {soldOut && <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm font-bold text-gray-700">Sold out</span>}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                      <h4 className="font-bold text-gray-800 text-sm truncate" title={p.name}>{p.name}</h4>
                      <p className="text-xs text-gray-500 font-semibold truncate">
                        {p.businessName}
                        {p.distanceKm !== undefined && ` · ${distanceLabel(p.distanceKm)}`}
                      </p>
                      {p.description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                        <span className="text-sm font-bold text-teal-700">{money(p.price)}</span>
                        <button
                          onClick={() => handleAddToCart(p)}
                          disabled={soldOut}
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-2xs"
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

            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Your bag is empty.</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id || item.product.id} className="flex gap-3 bg-gray-50 p-3 rounded-2xl items-center border border-gray-100">
                    <SafeImage src={item.product.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover bg-white shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">{item.product.name}</h4>
                      {item.variant && <p className="text-[11px] text-teal-700 font-semibold">{item.variant.title}</p>}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-[10px] text-gray-400 truncate">+{item.modifiers.map((m) => m.name).join(', ')}</p>
                      )}
                      <span className="text-xs text-gray-500">{money(item.unitPrice || item.product.price)} each</span>
                      {item.problem && (
                        <p className="text-[11px] text-rose-500 font-bold">
                          {item.problem === 'out_of_stock' ? 'Sold out' : item.problem === 'not_enough_stock' ? 'Not enough stock' : 'Unavailable'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl">
                      <button
                        onClick={() => bag.updateLine ? bag.updateLine(item.id, item.quantity - 1) : setQuantity(item.product.id, item.quantity - 1)}
                        className="p-1.5 text-gray-600 hover:text-teal-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => bag.updateLine ? bag.updateLine(item.id, item.quantity + 1) : setQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= Math.min(99, item.product.stock)}
                        className="p-1.5 text-gray-600 hover:text-teal-700 disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-teal-700 w-16 text-right">{money(item.lineTotal)}</span>
                    <button
                      onClick={() => bag.removeLine ? bag.removeLine(item.id) : removeFromCart(item.product.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {promo && (
                    <div className="flex justify-between items-center text-sm text-emerald-700 font-semibold">
                      <span>Coupon {promo.code} ({promo.discountPercent ? `-${promo.discountPercent}%` : ''})</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-teal-700 text-lg">{money(cartTotal)}</span>
                  </div>

                  <button
                    onClick={() => setShowCheckoutDialog(true)}
                    disabled={isCheckingOut || !canCheckout}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                  >
                    Proceed to Checkout
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
                        {o.number} · {new Date(o.createdAt).toLocaleDateString()}
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
                          <span>{money(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                    {o.promoCode && (
                      <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                        <span>Coupon {o.promoCode} (-{o.discountPercent}%)</span>
                        <span>-{money(o.discountAmount)}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={11} className="text-teal-600 shrink-0" /> {o.address}
                    </p>
                    <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span className="text-teal-700">{money(o.totalAmount)}</span>
                    </div>

                    {/* Order history */}
                    {o.history && o.history.length > 0 && (
                      <div className="pt-1 text-[11px] text-gray-500 space-y-0.5 border-t border-gray-200">
                        <span className="font-bold block text-gray-600">Status updates:</span>
                        {o.history.map((h, hIdx) => (
                          <p key={hIdx}>
                            • <strong className="capitalize">{h.status}</strong>: {h.note || 'Updated'} ({new Date(h.at).toLocaleDateString()})
                          </p>
                        ))}
                      </div>
                    )}

                    {o.canCancel && (
                      <button
                        onClick={() => cancelOrder(o)}
                        className="w-full py-1.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold text-gray-600"
                      >
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

      {showCheckoutDialog && bag.cart && (
        <CheckoutDialog
          cart={bag.cart}
          onClose={() => setShowCheckoutDialog(false)}
          onOrderSuccess={(placedOrders) => {
            setShowCheckoutDialog(false);
            bag.clearCart();
            setOrderMessage(`Order placed! ${placedOrders.length} order(s) created.`);
            fetchOrders();
            triggerNotificationRefresh();
          }}
        />
      )}
    </div>
  );
}

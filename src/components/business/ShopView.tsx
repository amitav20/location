/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { ReportDialog } from '../common/ReportDialog';
import { Business, BusinessOffer, Product, Review, User } from '../../types';
import { getThemeClasses } from './theme';
import { CartState } from './useCart';
import { AlertTriangle, ShoppingBag, Trash2, Star, MapPin, Phone, MessageSquare, Globe, CreditCard, Building, Tag, Clock, Store } from 'lucide-react';

interface ShopViewProps {
  shop: Business;
  currentUser: User;
  bag: CartState;
  onBack: () => void;
  onFollow: (shopId: string) => void;
  onMessage: (ownerId: string) => void;
  onAddToCart: (product: Product) => void;
  onReviewSubmitted: (shopId: string) => void;
  checkoutAddress: string;
  setCheckoutAddress: (value: string) => void;
  orderError: string;
  isCheckingOut: boolean;
  onCheckout: () => void;
}

// A single shop's page: catalog, offers, reviews, about, and the bag sidebar
export function ShopView({
  shop: selectedShop,
  currentUser,
  bag,
  onBack,
  onFollow: handleFollowShop,
  onMessage: handleSendMessage,
  onAddToCart: handleAddToCart,
  onReviewSubmitted,
  checkoutAddress,
  setCheckoutAddress,
  orderError,
  isCheckingOut,
  onCheckout: handleCheckout
}: ShopViewProps) {
  const { cart, removeFromCart, appliedPromo, setAppliedPromo, discountAmount, total: cartTotal } = bag;

  const [shopActiveTab, setShopActiveTab] = useState<'catalog' | 'offers' | 'reviews' | 'about'>('catalog');
  const [shopCategoryFilter, setShopCategoryFilter] = useState<string>('');
  const [shopSearchFilter, setShopSearchFilter] = useState<string>('');
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [shopOffers, setShopOffers] = useState<BusinessOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shopReviews, allProducts, offers] = await Promise.all([
          api.getReviews(selectedShop.id),
          api.getMarketplaceProducts({}),
          api.getBusinessOffers(selectedShop.id)
        ]);
        if (cancelled) return;
        setReviews(shopReviews);
        setShopProducts(allProducts.filter((p: Product) => p.businessId === selectedShop.id));
        setShopOffers(offers || []);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load this shop.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedShop.id]);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoCode.trim()) {
      setPromoError('Please enter a coupon code.');
      return;
    }
    try {
      const promo = await api.validatePromo(promoCode, selectedShop.id);
      setAppliedPromo(promo);
      setPromoCode('');
    } catch (err: any) {
      setPromoError(err.message || 'Invalid coupon code for this storefront.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    try {
      const data = await api.submitReview(selectedShop.id, newRating, newReviewText);
      setReviews((prev) => [...prev, data]);
      setNewReviewText('');
      onReviewSubmitted(selectedShop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const averageReviewScore = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  const theme = getThemeClasses(selectedShop.themeVibe);
  const isOwner = selectedShop.ownerId === currentUser.id;
  const myReview = reviews.find((r) => r.userId === currentUser.id);

  return (
    <div className={`${theme.wrapper} shadow-lg border border-gray-200/40 relative space-y-6 transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          ← Back to shops
        </button>
      </div>

      {/* Epic custom Banner header cover */}
      <div className="relative h-64 md:h-80 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 shadow-inner">
        <img
          src={selectedShop.coverImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"}
          alt={selectedShop.name}
          className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex items-end p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4">
            <div className="flex items-center gap-4 md:gap-5 text-white">
              <img
                src={selectedShop.logo || "https://images.unsplash.com/photo-1472851294608-062f824d296e?w=150"}
                alt="Logo"
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl object-cover border-4 border-white/40 shadow-2xl bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl md:text-3xl font-extrabold font-display tracking-tight text-white">{selectedShop.name}</h2>
                  {selectedShop.isVerified && (
                    <span className="bg-emerald-500 text-white text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                      Verified Local Brand
                    </span>
                  )}
                </div>
                <p className="text-xs text-teal-300 font-medium">#{selectedShop.category} • {selectedShop.distanceKm ? `${selectedShop.distanceKm} km away` : 'Nearby'}</p>
                
                {/* Brand customizable slogan tagline */}
                {selectedShop.tagline && (
                  <p className="text-[11px] md:text-xs italic text-slate-200 mt-1 font-medium bg-black/45 px-3 py-1.5 rounded-xl border border-white/10 max-w-sm md:max-w-md">
                    "{selectedShop.tagline}"
                  </p>
                )}

                <div className="flex items-center gap-2 text-white/90 text-xs pt-1">
                  <div className="flex items-center font-bold text-amber-400">
                    <Star size={13} className="fill-amber-400 mr-0.5" />
                    <span>{selectedShop.averageRating ? Number(selectedShop.averageRating).toFixed(1) : 'No ratings yet'}</span>
                  </div>
                  <span>•</span>
                  <span className="font-semibold text-white/80">{selectedShop.followersCount || 0} Followers</span>
                </div>
              </div>
            </div>

            {isOwner ? (
              <span className="px-4 py-2 bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold backdrop-blur-md shrink-0">
                This is your shop{selectedShop.isVerified ? '' : ' · awaiting verification'}
              </span>
            ) : (
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => handleFollowShop(selectedShop.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md border ${
                    selectedShop.isFollowing ? 'bg-white text-gray-800 border-white' : 'bg-white/20 hover:bg-white/30 text-white border-white/25'
                  }`}
                >
                  {selectedShop.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={() => handleSendMessage(selectedShop.ownerId)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <MessageSquare size={14} />
                  Message Shop
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold"
                  title="Report this shop"
                >
                  <AlertTriangle size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Tab navigation representing their own domain */}
      <div className="border-b border-gray-200 flex gap-2 overflow-x-auto pb-px bg-white p-2 rounded-2xl">
        {[
          { id: 'catalog', label: 'Products' },
          { id: 'offers', label: `Offers (${shopOffers.length})` },
          { id: 'reviews', label: `Reviews (${reviews.length})` },
          { id: 'about', label: 'About' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setShopActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              shopActiveTab === tab.id
                ? theme.navTabActive
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Content Panels */}
        <div className="lg:col-span-3 space-y-6">

          {/* STORE CATALOG TAB PANEL */}
          {shopActiveTab === 'catalog' && (
            <div className="space-y-4">
              {/* Internal store search & category filters */}
              <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={shopSearchFilter}
                  onChange={(e) => setShopSearchFilter(e.target.value)}
                  className={`flex-1 text-xs rounded-xl px-3.5 py-2 outline-none border transition-all ${theme.inputBg}`}
                />
                <select
                  value={shopCategoryFilter}
                  onChange={(e) => setShopCategoryFilter(e.target.value)}
                  className={`text-xs rounded-xl px-3 py-2 outline-none border font-bold transition-all ${theme.inputBg}`}
                >
                  <option value="">All categories</option>
                  {Array.from(new Set(shopProducts.map(p => p.category || 'General'))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Render catalog products */}
              {shopProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                  <Store className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs text-gray-500 italic">This shop has no products yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shopProducts
                    .filter(p => {
                      if (shopCategoryFilter && p.category !== shopCategoryFilter) return false;
                      if (shopSearchFilter && !p.name.toLowerCase().includes(shopSearchFilter.toLowerCase()) && !p.description.toLowerCase().includes(shopSearchFilter.toLowerCase())) return false;
                      return true;
                    })
                    .map((p) => {
                      const isOutOfStock = p.stock === 0;
                      const isLowStock = p.stock > 0 && p.stock <= 5;
                      
                      return (
                        <div key={p.id} className={`${theme.card} flex gap-4 hover:shadow-md transition-all relative overflow-hidden group`}>
                          <img
                            src={p.images[0] || "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200"}
                            alt={p.name}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-gray-50 shrink-0 group-hover:scale-105 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex justify-between items-start gap-1">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.pillBg} ${theme.accentText}`}>{p.category || 'General'}</span>
                                {/* Inventory Indicator Badges */}
                                {isOutOfStock ? (
                                  <span className="text-[11px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md uppercase">Sold Out</span>
                                ) : isLowStock ? (
                                  <span className="text-[11px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase animate-pulse">Only {p.stock} left!</span>
                                ) : (
                                  <span className="text-[11px] font-extrabold text-teal-700 bg-teal-50/50 px-1.5 py-0.5 rounded-md uppercase">{p.stock} Available</span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-xs text-gray-800 tracking-tight truncate mt-1">{p.name}</h4>
                              <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-2">{p.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3 bg-gray-50 p-1.5 px-2.5 rounded-xl">
                              <span className={`text-sm font-black font-mono ${theme.priceText}`}>${p.price}</span>
                              <button
                                onClick={() => handleAddToCart(p)}
                                disabled={isOutOfStock}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : theme.primaryButton
                                }`}
                              >
                                <ShoppingBag size={11} />
                                {isOutOfStock ? 'Sold Out' : 'Add Bag'}
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

          {/* DISCOUNT DEALS & COUPONS TAB PANEL */}
          {shopActiveTab === 'offers' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider text-teal-600">Active Coupons & Vouchers</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Copy a code and paste it in your bag at checkout.</p>
              
              {shopOffers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                  <Tag className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs text-gray-500 italic">No offers right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shopOffers.map((o) => (
                    <div key={o.id} className="relative bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-dashed border-teal-200 p-5 rounded-2xl flex justify-between items-center overflow-hidden shadow-sm">
                      {/* Circle notches for ticket/coupon style */}
                      <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-r border-teal-200"></div>
                      <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-l border-teal-200"></div>
                      
                      <div className="pl-4 pr-1.5 space-y-1">
                        <span className="bg-teal-600 text-white text-[11px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm">{o.discountPercent}% OFF DISCOUNT</span>
                        <h5 className="font-extrabold text-xs text-gray-800 mt-1">{o.title}</h5>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{o.description}</p>
                        <span className="block text-[11px] text-gray-500 mt-0.5">Valid until {new Date(o.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="text-right pr-4 shrink-0 border-l border-teal-200/40 pl-4">
                        <span className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">PROMO CODE</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(o.promoCode || '');
                            toast.success(`Code "${o.promoCode}" copied. Paste it at checkout.`);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-mono font-bold text-teal-600 shadow-sm transition-all"
                        >
                          {o.promoCode || 'NO CODE'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RATINGS & REVIEW FEED TAB PANEL */}
          {shopActiveTab === 'reviews' && (
            <div className="space-y-6">
              {/* Reviews statistics block */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-center space-y-1">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Average Score</span>
                  <h2 className="text-4xl font-black text-teal-600 font-mono">
                    {reviews.length > 0 ? averageReviewScore.toFixed(1) : '–'}
                  </h2>
                  <div className="flex justify-center text-amber-500" aria-label={`${averageReviewScore.toFixed(1)} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} className={Math.round(averageReviewScore) >= s ? 'fill-current' : 'text-gray-300'} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 block">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Rating breakdown</span>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="font-mono w-3 text-right font-bold text-gray-500">{star}</span>
                        <Star size={11} className="fill-gray-400 text-gray-400 shrink-0" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-600 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="font-mono text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submission form */}
              {!isOwner && (
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
                <h4 className="font-extrabold text-xs uppercase tracking-widest text-teal-600">{myReview ? 'Update your review' : 'Write a review'}</h4>
                
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-200 inline-flex">
                    <span className="text-xs font-semibold text-gray-500 pl-1">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewRating(s)}
                        className={`p-1 hover:scale-110 transition-transform ${
                          newRating >= s ? 'text-amber-500' : 'text-gray-300'
                        }`}
                      >
                        <Star size={16} className={`fill-current ${newRating >= s ? 'fill-amber-500' : 'fill-none'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Share your experience..."
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                    >
                      {myReview ? 'Update Review' : 'Send Review'}
                    </button>
                  </div>
                </form>
              </div>
              )}

              {/* Review lists view */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-6 text-center">No reviews yet. Be the first!</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-gray-800">{rev.userName}</span>
                          <span className="text-xs text-gray-400 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg text-xs font-bold">
                          <Star size={11} className="fill-amber-500" />
                          <span className="ml-1">{rev.rating}.0 Star rating</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* INFO & ABOUT TAB PANEL */}
          {shopActiveTab === 'about' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="space-y-2">
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider text-teal-600">About this shop</h3>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">{selectedShop.description || 'No description yet.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-100 p-4 rounded-2xl space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-black block">Opening hours</span>
                  <p className="text-sm text-gray-700 font-semibold flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-500 shrink-0" /> {selectedShop.openingHours || 'Not provided by the shop yet'}
                  </p>
                </div>
                <div className="border border-gray-100 p-4 rounded-2xl space-y-1">
                  <span className="text-xs text-gray-400 uppercase font-black block">Location</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedShop.latitude}&mlon=${selectedShop.longitude}#map=17/${selectedShop.latitude}/${selectedShop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-teal-700 font-semibold hover:underline flex items-center gap-1.5"
                  >
                    <MapPin size={14} className="shrink-0" /> {selectedShop.address} (open map)
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Information & Local Store Checkout drawer */}
        <div className="space-y-6">
          {/* Standalone Quick Contacts */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest text-teal-600">Contact</h4>
            
            <div className="space-y-3.5 text-xs text-gray-600 font-medium">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{selectedShop.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-emerald-500 shrink-0" />
                <span>{selectedShop.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe size={16} className="text-emerald-500 shrink-0" />
                <a
                  href={selectedShop.website ? (selectedShop.website.startsWith('http') ? selectedShop.website : `https://${selectedShop.website}`) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline hover:text-teal-800 truncate"
                >
                  {selectedShop.website || 'No website registered'}
                </a>
              </div>
              <div className="flex items-center gap-2.5 border-t border-gray-100/70 pt-2.5">
                <Building size={16} className="text-emerald-500 shrink-0" />
                <span>Category: <strong>{selectedShop.category}</strong></span>
              </div>

              {/* Dynamic Instagram and Twitter accounts */}
              {(selectedShop.instagramUrl || selectedShop.twitterUrl) && (
                <div className="flex gap-2.5 pt-2 border-t border-gray-100/50">
                  {selectedShop.instagramUrl && (
                    <a
                      href={selectedShop.instagramUrl.startsWith('http') ? selectedShop.instagramUrl : `https://instagram.com/${selectedShop.instagramUrl.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-pink-600 font-bold bg-pink-50 hover:bg-pink-100 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      <span>Instagram</span>
                    </a>
                  )}
                  {selectedShop.twitterUrl && (
                    <a
                      href={selectedShop.twitterUrl.startsWith('http') ? selectedShop.twitterUrl : `https://twitter.com/${selectedShop.twitterUrl.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-sky-600 font-bold bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      <span>Twitter</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive In-Store Shopping Cart Sidebar Bag */}
          <div className={`${theme.card} relative space-y-4 shadow-md`}>
            <div className="flex justify-between items-center">
              <h4 className={`font-extrabold text-xs uppercase tracking-widest ${theme.subTitleColor}`}>Your Bag</h4>
              <span className="bg-teal-50 text-teal-600 text-xs font-extrabold px-2 py-0.5 rounded-full font-mono">{cart.length} items</span>
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-5 leading-relaxed text-center">Your bag is empty.</p>
            ) : (
              <div className="space-y-4.5">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="min-w-0 pr-1.5 flex-1">
                        <p className="font-extrabold text-gray-700 truncate text-[11px]">{item.product?.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">Qty: {item.quantity} • ${item.product?.price} ea</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-xs font-mono truncate ${theme.priceText}`}>${(item.product?.price || 0) * item.quantity}</span>
                        <button
                          onClick={() => {
                            removeFromCart(item.productId);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-all shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2.5">
                  {/* Active Promo Input Field */}
                  <div className="pb-2 border-b border-gray-100/50 space-y-1.5 text-left">
                    <label className="text-[11px] text-gray-400 font-bold uppercase block">Coupon code:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. WELCOME10"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 text-[11px] rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1.5 font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs font-black cursor-pointer hover:bg-slate-700 transition-colors shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <span className="text-[11px] text-rose-500 font-bold block">{promoError}</span>
                    )}
                    {appliedPromo && (
                      <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1 pb-1">
                        ✔ Code "<strong>{appliedPromo.code}</strong>" applied
                        {appliedPromo.businessId ? ' (this shop only)' : ''}
                        <button
                          type="button"
                          onClick={() => setAppliedPromo(null)}
                          className="ml-1 text-gray-400 hover:text-red-500 underline"
                        >
                          remove
                        </button>
                      </span>
                    )}
                  </div>

                  {appliedPromo && (
                    <div className="flex justify-between text-xs text-emerald-600 font-extrabold bg-emerald-50 px-2 py-1 rounded-lg">
                      <span>Promo Discount (-{appliedPromo.discountPercent}%):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-extrabold pb-1">
                    <span className="text-gray-500">Billed Total:</span>
                    <span className={`font-mono text-sm ${theme.priceText}`}>
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  {orderError && (
                    <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-2 rounded-lg">{orderError}</p>
                  )}

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your precise delivery / pickup address..."
                      value={checkoutAddress}
                      onChange={(e) => setCheckoutAddress(e.target.value)}
                      className="w-full text-xs rounded-xl bg-gray-50 border border-transparent p-2 outline-none focus:bg-white focus:border-teal-400"
                    />
                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="w-full py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold shadow-md transform active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard size={13} />
                      {isCheckingOut ? 'Placing order...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      {showReport && <ReportDialog target={{ type: 'business', id: selectedShop.id }} onClose={() => setShowReport(false)} />}
    </div>
  );
}

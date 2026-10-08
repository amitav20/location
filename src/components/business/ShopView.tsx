/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { ReportDialog } from '../common/ReportDialog';
import { Avatar, SafeImage, distanceLabel, money } from '../common/ui';
import { Business, BusinessOffer, Product, Review, User } from '../../types';
import { getThemeClasses } from './theme';
import { CartState } from './useCart';
import { DAYS, formatDayHours } from './openingHours';
import { ProductDetailModal } from './ProductDetailModal';
import { CheckoutDialog } from './CheckoutDialog';
import {
  AlertTriangle,
  Building,
  Clock,
  CreditCard,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Trash2
} from 'lucide-react';

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
  const { cartItems, removeFromCart, promo, applyPromo, removePromo, discountAmount, total: cartTotal, canCheckout } = bag;

  const [shopActiveTab, setShopActiveTab] = useState<'catalog' | 'offers' | 'reviews' | 'about'>('catalog');
  const [shopCategoryFilter, setShopCategoryFilter] = useState<string>('');
  const [shopSearchFilter, setShopSearchFilter] = useState<string>('');
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [shopOffers, setShopOffers] = useState<BusinessOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const [selectedModalProduct, setSelectedModalProduct] = useState<Product | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shopReviews, products, offers] = await Promise.all([
          api.getReviews(selectedShop.id),
          api.getShopProducts(selectedShop.id),
          api.getOffers(selectedShop.id)
        ]);
        if (cancelled) return;
        setReviews(shopReviews);
        setShopProducts(products);
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
    if (!promoCodeInput.trim()) {
      toast.error('Please enter a coupon code.');
      return;
    }
    const success = await applyPromo(promoCodeInput.trim());
    if (success) setPromoCodeInput('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    try {
      const res = await api.saveReview(selectedShop.id, newRating, newReviewText.trim());
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.userId !== currentUser.id);
        return [res.review, ...filtered];
      });
      setNewReviewText('');
      toast.success('Review saved!');
      onReviewSubmitted(selectedShop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save review.');
    }
  };

  const handleDeleteReview = async () => {
    if (!(await confirmAction('Delete your review?', 'Delete'))) return;
    try {
      await api.deleteMyReview(selectedShop.id);
      setReviews((prev) => prev.filter((r) => r.userId !== currentUser.id));
      toast.success('Review deleted.');
      onReviewSubmitted(selectedShop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete review.');
    }
  };

  const theme = getThemeClasses(selectedShop.themeVibe);
  const isOwner = selectedShop.ownerId === currentUser.id;
  const myReview = reviews.find((r) => r.isMine || r.userId === currentUser.id);

  const productCategories = Array.from(new Set(shopProducts.map((p) => p.category).filter(Boolean)));
  const filteredProducts = shopProducts.filter((p) => {
    const matchesCategory = !shopCategoryFilter || p.category === shopCategoryFilter;
    const matchesSearch = !shopSearchFilter || p.name.toLowerCase().includes(shopSearchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`${theme.wrapper} shadow-lg border border-gray-200/40 relative space-y-6 transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          ← Back to shops
        </button>
      </div>

      {/* Header Banner */}
      <div className="relative h-64 md:h-80 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 shadow-inner">
        <SafeImage
          src={selectedShop.coverImage}
          alt={selectedShop.name}
          className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
          fallback={<div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold">GeoConnect Local Store</div>}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex items-end p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4">
            <div className="flex items-center gap-4 md:gap-5 text-white">
              <SafeImage
                src={selectedShop.logo}
                alt={selectedShop.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl object-cover bg-white p-1 border-2 border-white/20 shadow-xl shrink-0"
                fallback={<div className="w-20 h-20 rounded-2xl bg-teal-700 text-white font-bold flex items-center justify-center text-xl">{selectedShop.name.slice(0, 2)}</div>}
              />
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-3xl font-black font-display tracking-tight text-white">{selectedShop.name}</h1>
                  {selectedShop.isVerified && (
                    <span className="bg-teal-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Verified
                    </span>
                  )}
                </div>
                {selectedShop.tagline && <p className="text-xs md:text-sm text-teal-200 font-medium italic">{selectedShop.tagline}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-300 pt-1">
                  <span className="flex items-center gap-1 font-bold text-amber-400">
                    <Star size={13} className="fill-amber-400" />
                    {selectedShop.averageRating ? selectedShop.averageRating.toFixed(1) : 'New'} ({selectedShop.reviewsCount || reviews.length})
                  </span>
                  <span>·</span>
                  <span>{selectedShop.followersCount || 0} followers</span>
                  {selectedShop.distanceKm !== undefined && (
                    <>
                      <span>·</span>
                      <span>{distanceLabel(selectedShop.distanceKm)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isOwner && (
                <>
                  <button
                    onClick={() => handleSendMessage(selectedShop.ownerId)}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-sm transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                  <button
                    onClick={() => handleFollowShop(selectedShop.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedShop.isFollowing ? 'bg-rose-500 text-white' : 'bg-teal-500 text-white hover:bg-teal-400'
                    }`}
                  >
                    {selectedShop.isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={() => setShowReport(true)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                    title="Report shop"
                  >
                    <AlertTriangle size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200/60 pb-2 overflow-x-auto">
        {(['catalog', 'offers', 'reviews', 'about'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setShopActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              shopActiveTab === tab ? theme.navTabActive : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'catalog' && `Products (${shopProducts.length})`}
            {tab === 'offers' && `Offers (${shopOffers.length})`}
            {tab === 'reviews' && `Reviews (${reviews.length})`}
            {tab === 'about' && 'About & Hours'}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <div className="lg:col-span-2 space-y-6">
          {/* CATALOG TAB */}
          {shopActiveTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={shopSearchFilter}
                  onChange={(e) => setShopSearchFilter(e.target.value)}
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                />
                {productCategories.length > 0 && (
                  <select
                    value={shopCategoryFilter}
                    onChange={(e) => setShopCategoryFilter(e.target.value)}
                    className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">All Categories</option>
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 text-gray-500 text-xs">
                  No products available right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((prod) => {
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    const hasModifiers = prod.modifierGroups && prod.modifierGroups.length > 0;
                    const isConfigurable = hasVariants || hasModifiers;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedModalProduct(prod)}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col p-4 gap-3 cursor-pointer group"
                      >
                        <div className="h-36 bg-gray-100 rounded-xl overflow-hidden relative">
                          <SafeImage
                            src={prod.images?.[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallback={<ShoppingBag size={32} className="text-gray-300" />}
                          />
                          {prod.stock <= 0 && (
                            <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Sold out
                            </span>
                          )}
                          {prod.stock > 0 && prod.stock <= 5 && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Only {prod.stock} left
                            </span>
                          )}
                          {isConfigurable && (
                            <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Options available
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-bold text-sm text-gray-800 group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                              <span className="text-sm font-black text-teal-700">{money(prod.price)}</span>
                            </div>
                            {prod.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prod.description}</p>}
                          </div>
                          <div className="pt-3 border-t border-gray-100 mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">
                              {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isConfigurable) {
                                  setSelectedModalProduct(prod);
                                } else {
                                  handleAddToCart(prod);
                                }
                              }}
                              disabled={prod.stock <= 0 && !isConfigurable}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold"
                            >
                              {isConfigurable ? 'Choose Options' : prod.stock <= 0 ? 'Notify Me' : 'Add to Bag'}
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

          {/* OFFERS TAB */}
          {shopActiveTab === 'offers' && (
            <div className="space-y-4">
              {shopOffers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 text-gray-500 text-xs">
                  No active offers right now. Check back soon!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {shopOffers.map((off) => (
                    <div key={off.id} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-amber-950">{off.title}</h4>
                        <span className="bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-lg">
                          {off.discountPercent}% OFF
                        </span>
                      </div>
                      {off.description && <p className="text-xs text-amber-900/80">{off.description}</p>}
                      {off.promoCode && (
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-xs text-amber-800 font-mono font-bold bg-white px-2 py-1 rounded-md border border-amber-200">
                            {off.promoCode}
                          </span>
                          <button
                            onClick={() => {
                              applyPromo(off.promoCode);
                            }}
                            className="text-xs font-bold text-amber-900 hover:underline"
                          >
                            Apply to Bag
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {shopActiveTab === 'reviews' && (
            <div className="space-y-5">
              {!isOwner && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-teal-700">
                    {myReview ? 'Edit Your Review' : 'Write a Review'}
                  </h4>
                  <form onSubmit={handleSubmitReview} className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-500">Rating:</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewRating(s)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star size={16} className={newRating >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Share your experience with this shop..."
                        value={newReviewText}
                        maxLength={1000}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500 text-gray-700"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
                      >
                        {myReview ? 'Update' : 'Post'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">No reviews yet. Be the first to share your thoughts!</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={rev.userPhoto} name={rev.userName} className="w-7 h-7 rounded-full text-[10px]" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-gray-800 block">{rev.userName}</span>
                              {rev.isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg text-xs font-bold">
                            <Star size={12} className="fill-amber-500" />
                            <span>{rev.rating}.0</span>
                          </div>
                          {(rev.isMine || rev.userId === currentUser.id) && (
                            <button onClick={handleDeleteReview} className="text-gray-400 hover:text-rose-600 p-1" title="Delete review">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                      {rev.reply && (
                        <div className="mt-2 p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-xs">
                          <div className="font-bold text-teal-800">Response from store:</div>
                          <p className="text-gray-700 mt-0.5">{rev.reply.body}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABOUT & HOURS TAB */}
          {shopActiveTab === 'about' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-teal-700">About the Shop</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {selectedShop.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Clock size={14} /> Opening Hours
                </h3>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3 divide-y divide-gray-100">
                  {DAYS.map((d) => {
                    const dayHours = selectedShop.openingHours?.[d.key];
                    return (
                      <div key={d.key} className="py-2 flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-700">{d.label}</span>
                        <span className={dayHours && dayHours.length > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400 italic'}>
                          {formatDayHours(dayHours)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Details & In-Store Bag */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3.5 text-xs text-gray-600">
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider text-teal-700">Shop Info</h4>
            <p className="flex items-start gap-2">
              <MapPin size={15} className="text-teal-600 shrink-0 mt-0.5" />
              <span>{selectedShop.address}</span>
            </p>
            {selectedShop.phone && (
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-teal-600 shrink-0" />
                <span>{selectedShop.phone}</span>
              </p>
            )}
            {selectedShop.website && (
              <p className="flex items-center gap-2 truncate">
                <Globe size={15} className="text-teal-600 shrink-0" />
                <a
                  href={selectedShop.website.startsWith('http') ? selectedShop.website : `https://${selectedShop.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:underline truncate"
                >
                  {selectedShop.website}
                </a>
              </p>
            )}
          </div>

          {/* Bag Sidebar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-700">Your Bag</h4>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.length} items
              </span>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">Your bag is empty.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.id || item.product.id} className="flex justify-between items-start text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="min-w-0 pr-2 flex-1">
                        <p className="font-bold text-gray-800 truncate">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-[11px] text-teal-700 font-semibold">{item.variant.title}</p>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-[10px] text-gray-400 truncate">
                            +{item.modifiers.map((m) => m.name).join(', ')}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-0.5">Qty: {item.quantity} · {money(item.unitPrice || item.product.price)} ea</p>
                        {item.problem && (
                          <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                            {item.problem === 'out_of_stock' ? 'Out of stock' : item.problem === 'not_enough_stock' ? 'Not enough stock' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{money(item.lineTotal)}</span>
                        <button
                          onClick={() => bag.removeLine ? bag.removeLine(item.id) : removeFromCart(item.product.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded-md"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500 font-bold uppercase block">Coupon code</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. BREW15"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        className="flex-1 text-xs rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 uppercase font-mono outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="bg-gray-900 text-white rounded-xl px-3 py-1.5 font-bold hover:bg-gray-800"
                      >
                        Apply
                      </button>
                    </div>
                    {promo && (
                      <div className="flex justify-between items-center text-[11px] text-emerald-600 font-bold pt-1">
                        <span>Code "{promo.code}" applied</span>
                        <button type="button" onClick={removePromo} className="text-gray-400 hover:text-rose-500 underline">
                          remove
                        </button>
                      </div>
                    )}
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount</span>
                      <span>-{money(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-black text-sm text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span>{money(cartTotal)}</span>
                  </div>

                  {orderError && <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl">{orderError}</p>}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => setShowCheckoutDialog(true)}
                      disabled={isCheckingOut || !canCheckout}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard size={14} />
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedModalProduct && (
        <ProductDetailModal
          product={selectedModalProduct}
          onClose={() => setSelectedModalProduct(null)}
          onAddToCart={(prod, qty, opts) => bag.addToCart(prod, qty, opts)}
        />
      )}

      {showCheckoutDialog && bag.cart && (
        <CheckoutDialog
          cart={bag.cart}
          onClose={() => setShowCheckoutDialog(false)}
          onOrderSuccess={(orders) => {
            setShowCheckoutDialog(false);
            bag.clearCart();
            toast.success(`Order placed! ${orders.length} order(s) created.`);
          }}
        />
      )}

      {showReport && <ReportDialog target={{ type: 'business', id: selectedShop.id }} onClose={() => setShowReport(false)} />}
    </div>
  );
}

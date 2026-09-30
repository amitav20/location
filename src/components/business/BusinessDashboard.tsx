/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { MediaInput } from '../common/MediaInput';
import type { PickedLocation } from '../common/LocationPicker';
import { timeAgo } from '../../utils/time';
import { Business, BusinessCategory, BusinessOffer, Order, Product, Review, User } from '../../types';
import { BIZ_CATEGORIES } from './theme';
import { formatOrderNumber } from './orders';
import { AlertCircle, Building, Check, DollarSign, MapPin, Plus, ShoppingBag, Star, Tag, Trash2 } from 'lucide-react';

const LocationPicker = lazy(() => import('../common/LocationPicker').then((m) => ({ default: m.LocationPicker })));

type DashboardData =
  | { owned: false }
  | {
      owned: true;
      businesses: { id: string; name: string; isVerified: boolean }[];
      business: Business;
      products: Product[];
      offers: BusinessOffer[];
      reviews: Review[];
      orders: Order[];
      analytics: { followersCount: number; reviewsCount: number; ordersCount: number; totalSales: number };
    };

interface BusinessDashboardProps {
  currentUser: User;
  triggerNotificationRefresh: () => void;
}

interface ShopForm {
  name: string;
  category: BusinessCategory;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  openingHours: string;
  logo: string;
  coverImage: string;
  themeVibe: string;
  tagline: string;
  instagramUrl: string;
  twitterUrl: string;
  location: PickedLocation;
}

interface ProductForm {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  image: string;
}

const THEME_VIBES = [
  { value: 'minimal', label: 'Minimal', color: 'bg-teal-500' },
  { value: 'vintage', label: 'Vintage', color: 'bg-amber-600' },
  { value: 'neon', label: 'Neon', color: 'bg-fuchsia-500' },
  { value: 'organic', label: 'Organic', color: 'bg-emerald-800' }
];

const NEXT_STATUSES: Record<Order['status'], Order['status'][]> = {
  pending: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-200 text-gray-600'
};

const inputClass = 'w-full text-sm rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500';
const labelClass = 'text-xs text-gray-500 font-bold uppercase block mb-1';
const cardClass = 'bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4';
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const money = (n: number) => `$${n.toFixed(2)}`;

function emptyShopForm(user: User): ShopForm {
  return {
    name: '',
    category: 'Cafe',
    description: '',
    address: '',
    phone: '',
    email: user.email || '',
    website: '',
    openingHours: '',
    logo: '',
    coverImage: '',
    themeVibe: 'minimal',
    tagline: '',
    instagramUrl: '',
    twitterUrl: '',
    location: { latitude: user.location.latitude, longitude: user.location.longitude, label: user.location.city || 'My location' }
  };
}

function shopFormFrom(b: Business): ShopForm {
  return {
    name: b.name,
    category: b.category,
    description: b.description || '',
    address: b.address,
    phone: b.phone,
    email: b.email,
    website: b.website || '',
    openingHours: b.openingHours || '',
    logo: b.logo || '',
    coverImage: b.coverImage || '',
    themeVibe: b.themeVibe || 'minimal',
    tagline: b.tagline || '',
    instagramUrl: b.instagramUrl || '',
    twitterUrl: b.twitterUrl || '',
    location: { latitude: b.latitude, longitude: b.longitude, label: b.address }
  };
}

const shopPayload = (f: ShopForm) => ({
  name: f.name,
  category: f.category,
  description: f.description,
  address: f.address,
  phone: f.phone,
  email: f.email,
  website: f.website,
  openingHours: f.openingHours,
  logo: f.logo,
  coverImage: f.coverImage,
  themeVibe: f.themeVibe,
  tagline: f.tagline,
  instagramUrl: f.instagramUrl,
  twitterUrl: f.twitterUrl,
  latitude: f.location.latitude,
  longitude: f.location.longitude
});

// ---------- Shop details form (register + edit) ----------
function ShopFormFields({ form, setForm, showBranding }: { form: ShopForm; setForm: (f: ShopForm) => void; showBranding: boolean }) {
  const set = (k: keyof ShopForm, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Shop name</label>
          <input value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass}>
            {BIZ_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input type="tel" value={form.phone} maxLength={30} onChange={(e) => set('phone', e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Website (optional)</label>
          <input value={form.website} maxLength={200} onChange={(e) => set('website', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Opening hours</label>
          <input value={form.openingHours} maxLength={200} onChange={(e) => set('openingHours', e.target.value)} placeholder="e.g. Mon-Fri 9-18, Sat 10-14" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Street address</label>
        <input value={form.address} maxLength={200} onChange={(e) => set('address', e.target.value)} className={inputClass} required />
      </div>

      <div>
        <label className={labelClass}>Location on the map</label>
        <Suspense fallback={<div className="h-[180px] rounded-xl bg-gray-100 animate-pulse" />}>
          <LocationPicker value={form.location} height={180} onChange={(location) => setForm({ ...form, location, address: form.address || location.label })} />
        </Suspense>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={form.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} rows={3} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Logo</label>
          <MediaInput value={form.logo} onChange={(url) => set('logo', url)} placeholder="Image link or upload" />
        </div>
        <div>
          <label className={labelClass}>Cover image</label>
          <MediaInput value={form.coverImage} onChange={(url) => set('coverImage', url)} placeholder="Image link or upload" />
        </div>
      </div>

      {showBranding && (
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
          <span className="text-xs text-teal-700 font-bold uppercase block">Shop page style</span>
          <div className="grid grid-cols-4 gap-2">
            {THEME_VIBES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => set('themeVibe', v.value)}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 bg-white ${form.themeVibe === v.value ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'}`}
              >
                <span className={`w-4 h-4 rounded-full ${v.color}`} />
                <span className="text-xs font-semibold text-slate-700">{v.label}</span>
              </button>
            ))}
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input value={form.tagline} maxLength={120} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Crafted in small batches." className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Instagram</label>
              <input value={form.instagramUrl} maxLength={200} onChange={(e) => set('instagramUrl', e.target.value)} placeholder="@handle" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Twitter</label>
              <input value={form.twitterUrl} maxLength={200} onChange={(e) => set('twitterUrl', e.target.value)} placeholder="@handle" className={inputClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Dashboard ----------
export function BusinessDashboard({ currentUser, triggerNotificationRefresh }: BusinessDashboardProps) {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [registerForm, setRegisterForm] = useState<ShopForm | null>(null);
  const [settingsForm, setSettingsForm] = useState<ShopForm | null>(null);
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New offer
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerPct, setOfferPct] = useState('15');
  const [offerCode, setOfferCode] = useState('');
  const [offerExpires, setOfferExpires] = useState('');

  const load = async (businessId = selectedId) => {
    try {
      setDashData(await api.getBusinessDashboard(businessId));
    } catch (err) {
      toast.error(errorText(err, 'Could not load your business.'));
    }
  };

  useEffect(() => {
    load();
  }, [selectedId]);

  const business = dashData?.owned ? dashData.business : null;

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm) return;
    setIsSaving(true);
    try {
      const created = await api.createBusiness(shopPayload(registerForm));
      toast.success('Business registered. An admin will verify it before it becomes public.');
      setRegisterForm(null);
      setSelectedId(created.id);
      load(created.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not register the business.'));
    } finally {
      setIsSaving(false);
    }
  };

  const submitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm || !business) return;
    setIsSaving(true);
    try {
      await api.updateBusiness(business.id, shopPayload(settingsForm));
      toast.success('Shop details saved.');
      setSettingsForm(null);
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not save.'));
    } finally {
      setIsSaving(false);
    }
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm || !business) return;
    const payload = {
      businessId: business.id,
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      category: productForm.category || 'General',
      stock: Number(productForm.stock),
      images: productForm.image ? [productForm.image] : undefined
    };
    setIsSaving(true);
    try {
      if (productForm.id) await api.updateBusinessProduct(productForm.id, payload);
      else await api.addBusinessProduct(payload);
      toast.success(productForm.id ? 'Product updated.' : 'Product added.');
      setProductForm(null);
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the product.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!(await confirmAction(`Delete "${p.name}"? This cannot be undone.`, 'Delete'))) return;
    try {
      await api.deleteBusinessProduct(p.id);
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not delete.'));
    }
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    try {
      await api.addBusinessOffer({
        businessId: business.id,
        title: offerTitle,
        description: offerDesc,
        discountPercent: Number(offerPct),
        promoCode: offerCode,
        expiresOn: offerExpires || undefined
      });
      toast.success('Offer published. Your followers have been notified.');
      setOfferTitle('');
      setOfferDesc('');
      setOfferCode('');
      setOfferExpires('');
      load();
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not publish the offer.'));
    }
  };

  const deleteOffer = async (o: BusinessOffer) => {
    if (!(await confirmAction(`Delete the offer "${o.title}"?`, 'Delete'))) return;
    try {
      await api.deleteBusinessOffer(o.id);
      load();
    } catch (err) {
      toast.error(errorText(err, 'Could not delete the offer.'));
    }
  };

  const updateOrderStatus = async (o: Order, status: Order['status']) => {
    if (status === 'cancelled' && !(await confirmAction('Cancel this order? The items go back into stock and the customer is notified.', 'Cancel order'))) return;
    try {
      await api.updateOrderStatus(o.id, status);
      load();
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not update the order.'));
    }
  };

  if (!dashData) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-gray-500">Loading your business...</p>
      </div>
    );
  }

  // Registration form (first business, or "register another")
  if (registerForm) {
    return (
      <form onSubmit={submitRegister} className={`${cardClass} max-w-2xl mx-auto`}>
        <h3 className="font-bold text-gray-800 text-lg">Register a business</h3>
        <p className="text-sm text-gray-500">New businesses are checked by an admin before they appear publicly.</p>
        <ShopFormFields form={registerForm} setForm={setRegisterForm} showBranding={false} />
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => setRegisterForm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm">
            {isSaving ? 'Submitting...' : 'Submit registration'}
          </button>
        </div>
      </form>
    );
  }

  if (!dashData.owned || !business) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm text-center space-y-3">
        <Building size={34} className="text-teal-500 mx-auto" />
        <h3 className="font-bold text-gray-800">Have a local business?</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">Create a shop page to list products, receive orders and get reviews from people nearby.</p>
        <button onClick={() => setRegisterForm(emptyShopForm(currentUser))} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm">
          Register your business
        </button>
      </div>
    );
  }

  const { products, offers, reviews, orders, analytics, businesses } = dashData;
  const now = Date.now();

  return (
    <div className="space-y-6">
      {/* Business switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="biz-switch" className="text-xs font-bold text-gray-500 uppercase shrink-0">Business</label>
          <select id="biz-switch" value={business.id} onChange={(e) => setSelectedId(e.target.value)} className="text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white min-w-0">
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.isVerified ? '' : ' (awaiting verification)'}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setRegisterForm(emptyShopForm(currentUser))} className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Plus size={15} /> Register another business
        </button>
      </div>

      {!business.isVerified && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>
            <strong>Awaiting verification.</strong> Only you can see this shop until an admin verifies it. You can already add products and offers.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sales', value: money(analytics.totalSales), icon: <DollarSign size={20} />, tone: 'bg-teal-50 text-teal-600' },
          { label: 'Orders', value: analytics.ordersCount, icon: <ShoppingBag size={20} />, tone: 'bg-sky-50 text-sky-600' },
          { label: 'Reviews', value: analytics.reviewsCount, icon: <Star size={20} />, tone: 'bg-amber-50 text-amber-500' },
          { label: 'Followers', value: analytics.followersCount, icon: <Check size={20} />, tone: 'bg-indigo-50 text-indigo-600' }
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">{s.label}</span>
              <p className="text-lg font-bold text-gray-800 mt-1">{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tone}`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Shop card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-teal-500 to-indigo-600">
          {business.coverImage && <img src={business.coverImage} alt="" className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            <img src={business.logo} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-white" referrerPolicy="no-referrer" />
            <div>
              <h3 className="text-white font-bold leading-none">{business.name}</h3>
              <span className="text-xs text-teal-100">{business.category}</span>
            </div>
          </div>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600 space-y-1 min-w-0">
            <p className="flex items-center gap-1.5 truncate">
              <MapPin size={14} className="text-teal-600 shrink-0" /> {business.address}
            </p>
            <p className="text-xs text-gray-500">{business.openingHours || 'Opening hours not set'} · {business.phone} · {business.email}</p>
          </div>
          <button onClick={() => setSettingsForm(shopFormFrom(business))} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold shrink-0">
            Edit shop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: products + offers */}
        <div className="lg:col-span-2 space-y-6">
          <section className={cardClass}>
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-800">Products ({products.length})</h4>
              <button
                onClick={() => setProductForm({ name: '', description: '', price: '', category: 'General', stock: '10', image: '' })}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus size={13} /> Add product
              </button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No products yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {products.map((p) => (
                  <div key={p.id} className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex gap-3">
                    <img src={p.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover bg-white shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm text-gray-800 truncate">{p.name}</h5>
                      <p className="text-xs text-gray-500">
                        {money(p.price)} · {p.category}
                      </p>
                      <p className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                        {p.stock === 0 ? 'Sold out' : `${p.stock} in stock`}
                      </p>
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          onClick={() =>
                            setProductForm({
                              id: p.id,
                              name: p.name,
                              description: p.description,
                              price: String(p.price),
                              category: p.category,
                              stock: String(p.stock),
                              image: p.images[0] || ''
                            })
                          }
                          className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button onClick={() => deleteProduct(p)} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <Tag size={16} className="text-teal-600" /> Offers & promo codes
            </h4>
            <form onSubmit={submitOffer} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} maxLength={100} placeholder="Offer title (e.g. Happy Hour)" className={`${inputClass} sm:col-span-2`} required />
              <input value={offerDesc} onChange={(e) => setOfferDesc(e.target.value)} maxLength={500} placeholder="Description (optional)" className={`${inputClass} sm:col-span-2`} />
              <input type="number" min={1} max={100} value={offerPct} onChange={(e) => setOfferPct(e.target.value)} placeholder="Discount %" className={inputClass} required />
              <input
                value={offerCode}
                onChange={(e) => setOfferCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={20}
                placeholder="Promo code (e.g. HAPPY20)"
                className={`${inputClass} font-mono`}
              />
              <label className="text-xs text-gray-500 sm:col-span-2 flex items-center gap-2">
                Valid until
                <input type="date" value={offerExpires} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setOfferExpires(e.target.value)} className="text-sm rounded-xl border border-gray-200 px-2 py-1.5" />
                <span className="text-gray-400">(default: one week)</span>
              </label>
              <button type="submit" className="sm:col-span-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold">
                Publish offer
              </button>
            </form>
            {offers.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {offers.map((o) => {
                  const expired = new Date(o.expiresAt).getTime() <= now;
                  return (
                    <li key={o.id} className="py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${expired ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {o.title} · {o.discountPercent}% off {o.promoCode && <code className="text-teal-700">{o.promoCode}</code>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {expired ? 'Expired' : 'Valid until'} {new Date(o.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => deleteOffer(o)} className="p-2 text-gray-400 hover:text-red-600" aria-label="Delete offer">
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right: orders + reviews */}
        <div className="space-y-6">
          <section className={cardClass}>
            <h4 className="font-bold text-gray-800">Orders ({orders.length})</h4>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {orders.map((o) => (
                  <div key={o.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        {formatOrderNumber(o.id)} · {timeAgo(o.createdAt)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{o.customerName}</p>
                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <MapPin size={12} className="shrink-0 mt-0.5" /> {o.address}
                    </p>
                    <div className="space-y-0.5 border-t border-gray-200 pt-1.5">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span>{it.productName} × {it.quantity}</span>
                          <span>{money(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total {o.promoCode ? `(code ${o.promoCode})` : ''}</span>
                      <span className="text-teal-700">{money(o.totalAmount)}</span>
                    </div>
                    {NEXT_STATUSES[o.status].length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {NEXT_STATUSES[o.status].map((st) => (
                          <button
                            key={st}
                            onClick={() => updateOrderStatus(o, st)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                              st === 'cancelled' ? 'border-gray-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-white'
                            } bg-white`}
                          >
                            Mark {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h4 className="font-bold text-gray-800">Reviews ({reviews.length})</h4>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet.</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {reviews.map((r) => (
                  <div key={r.id} className="text-sm space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-gray-800">{r.userName}</span>
                      <span className="text-amber-500 text-xs font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-gray-600">{r.comment}</p>}
                    <p className="text-[11px] text-gray-400">{timeAgo(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit shop modal */}
      {settingsForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={submitSettings} className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 my-auto">
            <h3 className="font-bold text-gray-800 text-lg">Edit shop</h3>
            <ShopFormFields form={settingsForm} setForm={setSettingsForm} showBranding />
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setSettingsForm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / edit product modal */}
      {productForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={submitProduct} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3 my-auto">
            <h3 className="font-bold text-gray-800 text-lg">{productForm.id ? 'Edit product' : 'Add a product'}</h3>
            <div>
              <label className={labelClass}>Name</label>
              <input value={productForm.name} maxLength={100} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={productForm.description} maxLength={1000} rows={2} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Price ($)</label>
                <input type="number" min={0} step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Stock</label>
                <input type="number" min={0} step={1} value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input value={productForm.category} maxLength={40} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Photo</label>
              <MediaInput value={productForm.image} onChange={(url) => setProductForm({ ...productForm, image: url })} placeholder="Image link or upload" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setProductForm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

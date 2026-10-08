/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { api, ProductInput, ShopInput } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { MediaInput } from '../common/MediaInput';
import { Avatar, SafeImage, Spinner, distanceLabel, money } from '../common/ui';
import type { PickedLocation } from '../common/LocationPicker';
import { timeAgo } from '../../utils/time';
import {
  Business,
  BusinessCategoryItem,
  BusinessOffer,
  BusinessStats,
  DayKey,
  OpeningHours,
  Order,
  OrderStatus,
  Product,
  Review,
  ThemeVibe,
  User
} from '../../types';
import { DAYS, DEFAULT_HOURS, formatDayHours } from './openingHours';
import {
  AlertCircle,
  Building,
  Check,
  Clock,
  DollarSign,
  MapPin,
  Plus,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  ChefHat,
  Barcode,
  QrCode,
  Users,
  Settings,
  Sparkles,
  Receipt as ReceiptIcon,
  Car,
  Landmark,
  Award,
  Flame,
  CalendarDays,
  Truck,
  MessageSquare
} from 'lucide-react';

import { StaffManagerModal } from './StaffManagerModal';
import { TablesManagerModal } from './TablesManagerModal';
import { ScannerModal } from './ScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { KitchenDisplayModal } from './KitchenDisplayModal';
import { OrderingSettingsModal } from './OrderingSettingsModal';
import { CatalogImportModal } from './CatalogImportModal';
import { FinanceModal } from './FinanceModal';
import { ArrivalsModal } from './ArrivalsModal';
import { LiveTrackingModal } from './LiveTrackingModal';
import { ReviewsManagerModal } from './ReviewsManagerModal';
import { LoyaltyManagerModal } from './LoyaltyManagerModal';
import { FlashSaleModal } from './FlashSaleModal';
import { BookingsManagerModal } from './BookingsManagerModal';

const LocationPicker = lazy(() => import('../common/LocationPicker').then((m) => ({ default: m.LocationPicker })));

interface BusinessDashboardProps {
  currentUser: User;
  triggerNotificationRefresh: () => void;
}

interface ShopFormState {
  name: string;
  categoryId: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  openingHours: OpeningHours;
  logo: string;
  coverImage: string;
  originalLogo: string;
  originalCover: string;
  theme: ThemeVibe;
  tagline: string;
  instagram: string;
  twitter: string;
  location: PickedLocation;
}

interface ProductFormState {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  isActive: boolean;
  image: string;
  originalImage: string;
}

const THEME_VIBES: { value: ThemeVibe; label: string; color: string }[] = [
  { value: 'minimal', label: 'Minimal', color: 'bg-teal-500' },
  { value: 'vintage', label: 'Vintage', color: 'bg-amber-600' },
  { value: 'neon', label: 'Neon', color: 'bg-fuchsia-500' },
  { value: 'organic', label: 'Organic', color: 'bg-emerald-800' }
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  ready: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-200 text-gray-600'
};

const inputClass = 'w-full text-sm rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500';
const labelClass = 'text-xs text-gray-500 font-bold uppercase block mb-1';
const cardClass = 'bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4';
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function emptyShopForm(user: User, defaultCategoryId: string): ShopFormState {
  return {
    name: '',
    categoryId: defaultCategoryId,
    description: '',
    address: '',
    phone: user.mobile || '',
    email: user.email || '',
    website: '',
    openingHours: DEFAULT_HOURS,
    logo: '',
    coverImage: '',
    originalLogo: '',
    originalCover: '',
    theme: 'minimal',
    tagline: '',
    instagram: '',
    twitter: '',
    location: { latitude: user.location.latitude, longitude: user.location.longitude, label: user.location.city || 'My location' }
  };
}

function shopFormFrom(b: Business): ShopFormState {
  return {
    name: b.name,
    categoryId: b.categoryId,
    description: b.description || '',
    address: b.address,
    phone: b.phone,
    email: b.email,
    website: b.website || '',
    openingHours: b.openingHours || DEFAULT_HOURS,
    logo: b.logo || '',
    coverImage: b.coverImage || '',
    originalLogo: b.logo || '',
    originalCover: b.coverImage || '',
    theme: b.themeVibe || 'minimal',
    tagline: b.tagline || '',
    instagram: b.instagramUrl || '',
    twitter: b.twitterUrl || '',
    location: { latitude: b.latitude, longitude: b.longitude, label: b.address }
  };
}

// Opening hours editor per day
function OpeningHoursEditor({
  value,
  onChange
}: {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}) {
  const toggleDay = (key: DayKey, open: boolean) => {
    const updated = { ...value };
    if (open) {
      updated[key] = [['09:00', '18:00']];
    } else {
      updated[key] = [];
    }
    onChange(updated);
  };

  const updateRange = (key: DayKey, index: number, from: string, to: string) => {
    const updated = { ...value };
    const current = [...(updated[key] || [])];
    current[index] = [from, to];
    updated[key] = current;
    onChange(updated);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Opening Hours</span>
      <div className="divide-y divide-gray-100">
        {DAYS.map((d) => {
          const ranges = value[d.key] || [];
          const isOpen = ranges.length > 0;
          const [from, to] = ranges[0] || ['09:00', '18:00'];
          return (
            <div key={d.key} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 w-32">
                <input
                  type="checkbox"
                  id={`day-open-${d.key}`}
                  checked={isOpen}
                  onChange={(e) => toggleDay(d.key, e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor={`day-open-${d.key}`} className="font-semibold text-gray-700 cursor-pointer">
                  {d.label}
                </label>
              </div>

              {isOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={from}
                    onChange={(e) => updateRange(d.key, 0, e.target.value, to)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={to}
                    onChange={(e) => updateRange(d.key, 0, from, e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              ) : (
                <span className="text-gray-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shop details form (register + edit)
function ShopFormFields({
  form,
  setForm,
  categories,
  showBranding
}: {
  form: ShopFormState;
  setForm: (f: ShopFormState) => void;
  categories: BusinessCategoryItem[];
  showBranding: boolean;
}) {
  const set = (k: keyof ShopFormState, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Shop name</label>
          <input value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputClass} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
        <div className="sm:col-span-2">
          <label className={labelClass}>Website (optional)</label>
          <input value={form.website} maxLength={200} onChange={(e) => set('website', e.target.value)} placeholder="https://myshop.com" className={inputClass} />
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

      <OpeningHoursEditor value={form.openingHours} onChange={(openingHours) => set('openingHours', openingHours)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Logo</label>
          <MediaInput value={form.logo} onChange={(url) => set('logo', url)} allowLinks={false} placeholder="Upload logo" />
        </div>
        <div>
          <label className={labelClass}>Cover image</label>
          <MediaInput value={form.coverImage} onChange={(url) => set('coverImage', url)} allowLinks={false} placeholder="Upload cover" />
        </div>
      </div>

      {showBranding && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <span className="text-xs text-teal-700 font-bold uppercase block">Shop page style & social links</span>
          <div className="grid grid-cols-4 gap-2">
            {THEME_VIBES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => set('theme', v.value)}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 bg-white ${form.theme === v.value ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xs' : 'border-slate-200'}`}
              >
                <span className={`w-4 h-4 rounded-full ${v.color}`} />
                <span className="text-xs font-semibold text-slate-700">{v.label}</span>
              </button>
            ))}
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input value={form.tagline} maxLength={120} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Freshly roasted artisan coffee." className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Instagram handle</label>
              <input value={form.instagram} maxLength={200} onChange={(e) => set('instagram', e.target.value)} placeholder="@handle" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Twitter handle</label>
              <input value={form.twitter} maxLength={200} onChange={(e) => set('twitter', e.target.value)} placeholder="@handle" className={inputClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BusinessDashboard({ currentUser, triggerNotificationRefresh }: BusinessDashboardProps) {
  const [categories, setCategories] = useState<BusinessCategoryItem[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Shop details
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Forms
  const [registerForm, setRegisterForm] = useState<ShopFormState | null>(null);
  const [settingsForm, setSettingsForm] = useState<ShopFormState | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Advanced Shop Tool Modals
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [showTablesModal, setShowTablesModal] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showKitchenModal, setShowKitchenModal] = useState<boolean>(false);
  const [showOrderingSettingsModal, setShowOrderingSettingsModal] = useState<boolean>(false);
  const [showCatalogImportModal, setShowCatalogImportModal] = useState<boolean>(false);
  const [showFinanceModal, setShowFinanceModal] = useState<boolean>(false);
  const [showArrivalsModal, setShowArrivalsModal] = useState<boolean>(false);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState<boolean>(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState<boolean>(false);
  const [showFlashSaleModal, setShowFlashSaleModal] = useState<boolean>(false);
  const [showBookingsModal, setShowBookingsModal] = useState<boolean>(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // New offer
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerPct, setOfferPct] = useState('15');
  const [offerCode, setOfferCode] = useState('');
  const [offerExpires, setOfferExpires] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const loadBusinesses = async () => {
    setIsLoading(true);
    try {
      const list = await api.getMyBusinesses();
      setMyBusinesses(list);
      if (list.length > 0) {
        setSelectedId((prev) => (prev && list.some((b) => b.id === prev) ? prev : list[0].id));
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not load your businesses.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadShopDetails = async (businessId: string) => {
    try {
      const [s, p, o, r, ord] = await Promise.all([
        api.getBusinessStats(businessId),
        api.getShopProducts(businessId),
        api.getOffers(businessId),
        api.getReviews(businessId),
        api.getBusinessOrders(businessId)
      ]);
      setStats(s);
      setProducts(p);
      setOffers(o);
      setReviews(r);
      setOrders(ord);
    } catch (err) {
      toast.error(errorText(err, 'Could not load shop details.'));
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadShopDetails(selectedId);
    }
  }, [selectedId]);

  const activeBusiness = myBusinesses.find((b) => b.id === selectedId) || null;

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm) return;
    setIsSaving(true);
    const input: ShopInput = {
      name: registerForm.name.trim(),
      categoryId: registerForm.categoryId,
      tagline: registerForm.tagline.trim(),
      description: registerForm.description.trim(),
      address: registerForm.address.trim(),
      latitude: registerForm.location.latitude,
      longitude: registerForm.location.longitude,
      phone: registerForm.phone.trim(),
      email: registerForm.email.trim(),
      website: registerForm.website.trim(),
      instagram: registerForm.instagram.trim(),
      twitter: registerForm.twitter.trim(),
      theme: registerForm.theme,
      openingHours: registerForm.openingHours,
      logo: registerForm.logo,
      coverImage: registerForm.coverImage
    };
    try {
      const created = await api.createBusiness(input);
      toast.success('Business registered! An admin will verify it before it becomes public.');
      setRegisterForm(null);
      await loadBusinesses();
      setSelectedId(created.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not register business.'));
    } finally {
      setIsSaving(false);
    }
  };

  const submitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm || !activeBusiness) return;
    setIsSaving(true);
    const input: ShopInput = {
      name: settingsForm.name.trim(),
      categoryId: settingsForm.categoryId,
      tagline: settingsForm.tagline.trim(),
      description: settingsForm.description.trim(),
      address: settingsForm.address.trim(),
      latitude: settingsForm.location.latitude,
      longitude: settingsForm.location.longitude,
      phone: settingsForm.phone.trim(),
      email: settingsForm.email.trim(),
      website: settingsForm.website.trim(),
      instagram: settingsForm.instagram.trim(),
      twitter: settingsForm.twitter.trim(),
      theme: settingsForm.theme,
      openingHours: settingsForm.openingHours,
      logo: settingsForm.logo,
      coverImage: settingsForm.coverImage
    };
    try {
      const updated = await api.updateBusiness(activeBusiness.id, input, {
        logo: settingsForm.originalLogo,
        coverImage: settingsForm.originalCover
      });
      toast.success('Shop details saved.');
      setSettingsForm(null);
      setMyBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      toast.error(errorText(err, 'Could not save shop details.'));
    } finally {
      setIsSaving(false);
    }
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm || !activeBusiness) return;
    const input: ProductInput = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      category: productForm.category.trim() || 'General',
      stock: Number(productForm.stock),
      isActive: productForm.isActive,
      image: productForm.image
    };
    setIsSaving(true);
    try {
      if (productForm.id) {
        await api.updateProduct(productForm.id, input, productForm.originalImage);
        toast.success('Product updated.');
      } else {
        await api.addProduct(activeBusiness.id, input);
        toast.success('Product added.');
      }
      setProductForm(null);
      loadShopDetails(activeBusiness.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not save product.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!(await confirmAction(`Delete "${p.name}"? This cannot be undone.`, 'Delete'))) return;
    try {
      await api.deleteProduct(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
      toast.success('Product deleted.');
    } catch (err) {
      toast.error(errorText(err, 'Could not delete product.'));
    }
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    try {
      await api.addOffer(activeBusiness.id, {
        title: offerTitle.trim(),
        description: offerDesc.trim(),
        discountPercent: Number(offerPct),
        promoCode: offerCode.trim().toUpperCase(),
        expiresOn: offerExpires || undefined
      });
      toast.success('Offer published. Followers have been notified.');
      setOfferTitle('');
      setOfferDesc('');
      setOfferCode('');
      setOfferExpires('');
      loadShopDetails(activeBusiness.id);
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not publish offer.'));
    }
  };

  const deleteOffer = async (o: BusinessOffer) => {
    if (!(await confirmAction(`Delete offer "${o.title}"?`, 'Delete'))) return;
    try {
      await api.deleteOffer(o.id);
      setOffers((list) => list.filter((x) => x.id !== o.id));
      toast.success('Offer deleted.');
    } catch (err) {
      toast.error(errorText(err, 'Could not delete offer.'));
    }
  };

  const updateOrderStatus = async (o: Order, status: OrderStatus) => {
    if (status === 'cancelled' && !(await confirmAction('Cancel this order? Items go back into stock and customer is notified.', 'Cancel order'))) {
      return;
    }
    try {
      const updated = await api.updateOrderStatus(o.id, status);
      setOrders((list) => list.map((item) => (item.id === o.id ? updated : item)));
      if (activeBusiness) api.getBusinessStats(activeBusiness.id).then(setStats);
      toast.success(`Order marked as ${status}.`);
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not update order status.'));
    }
  };

  if (isLoading) {
    return <Spinner label="Loading your business..." />;
  }

  // Registration modal
  if (registerForm) {
    return (
      <form onSubmit={submitRegister} className={`${cardClass} max-w-2xl mx-auto text-left`}>
        <h3 className="font-bold text-gray-800 text-lg">Register a business</h3>
        <p className="text-sm text-gray-500">New businesses are checked by an admin before they appear publicly.</p>
        <ShopFormFields
          form={registerForm}
          setForm={setRegisterForm}
          categories={categories}
          showBranding={false}
        />
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => setRegisterForm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm">
            {isSaving ? 'Submitting...' : 'Submit registration'}
          </button>
        </div>
      </form>
    );
  }

  if (myBusinesses.length === 0 || !activeBusiness) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm text-center space-y-3">
        <Building size={34} className="text-teal-500 mx-auto" />
        <h3 className="font-bold text-gray-800 text-lg">Have a local business?</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">Create a shop page to list products, receive orders and get reviews from people nearby.</p>
        <button
          onClick={() => setRegisterForm(emptyShopForm(currentUser, categories[0]?.id || '1'))}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm"
        >
          Register your business
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Business switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="biz-switch" className="text-xs font-bold text-gray-500 uppercase shrink-0">Business</label>
          <select
            id="biz-switch"
            value={activeBusiness.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white min-w-0 font-semibold"
          >
            {myBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.isVerified ? '' : ' (awaiting verification)'}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setRegisterForm(emptyShopForm(currentUser, categories[0]?.id || '1'))}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-1.5"
        >
          <Plus size={15} /> Register another business
        </button>
      </div>

      {!activeBusiness.isVerified && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>
            <strong>Awaiting verification.</strong> Only you can see this shop until an admin verifies it. You can already add products and offers.
          </span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Revenue (All time)</span>
              <p className="text-lg font-bold text-gray-800 mt-1">{money(stats.revenueAllTime)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{money(stats.revenueLast30Days)} last 30 days</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 text-teal-600">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Orders</span>
              <p className="text-lg font-bold text-gray-800 mt-1">{stats.orders.total}</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{stats.orders.needsAction} need action</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 text-sky-600">
              <ShoppingBag size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Reviews</span>
              <p className="text-lg font-bold text-gray-800 mt-1">{stats.reviewsCount}</p>
              <p className="text-[11px] text-amber-500 font-semibold mt-0.5">★ {stats.ratingAvg ? stats.ratingAvg.toFixed(1) : 'New'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500">
              <Star size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Followers</span>
              <p className="text-lg font-bold text-gray-800 mt-1">{stats.followersCount}</p>
              <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">{stats.activeOffers} active offers</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
              <Check size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Shop card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-teal-500 to-indigo-600">
          {activeBusiness.coverImage && (
            <SafeImage src={activeBusiness.coverImage} alt="" className="w-full h-full object-cover opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-3">
            <SafeImage
              src={activeBusiness.logo}
              alt=""
              className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-white shrink-0"
              fallback={<div className="w-12 h-12 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center">{activeBusiness.name.slice(0, 2)}</div>}
            />
            <div>
              <h3 className="text-white font-bold leading-none text-base">{activeBusiness.name}</h3>
              <span className="text-xs text-teal-100">{activeBusiness.category}</span>
            </div>
          </div>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600 space-y-1 min-w-0">
            <p className="flex items-center gap-1.5 truncate">
              <MapPin size={14} className="text-teal-600 shrink-0" /> {activeBusiness.address}
            </p>
            <p className="text-xs text-gray-500">
              {activeBusiness.phone} · {activeBusiness.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOrderingSettingsModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Settings size={13} className="text-teal-600" /> Ordering & Zones
            </button>
            <button
              type="button"
              onClick={() => setShowStaffModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Users size={13} className="text-sky-600" /> Staff & Roles
            </button>
            <button
              type="button"
              onClick={() => setShowTablesModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <QrCode size={13} className="text-amber-600" /> Tables & QR
            </button>
            <button
              type="button"
              onClick={() => setShowKitchenModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ChefHat size={13} className="text-orange-600" /> Kitchen KDS
            </button>
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Barcode size={13} className="text-purple-600" /> Scanner
            </button>
            <button
              type="button"
              onClick={() => setShowFinanceModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Landmark size={13} className="text-emerald-600" /> Finance & Payouts
            </button>
            <button
              type="button"
              onClick={() => setShowArrivalsModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Car size={13} className="text-blue-600" /> Curbside Arrivals
            </button>
            <button
              type="button"
              onClick={() => setShowReviewsModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <MessageSquare size={13} className="text-indigo-600" /> Reviews & AI
            </button>
            <button
              type="button"
              onClick={() => setShowLoyaltyModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Award size={13} className="text-amber-600" /> Loyalty & Stamps
            </button>
            <button
              type="button"
              onClick={() => setShowFlashSaleModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Flame size={13} className="text-orange-600" /> Flash Sales
            </button>
            <button
              type="button"
              onClick={() => setShowBookingsModal(true)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CalendarDays size={13} className="text-cyan-600" /> Appointments
            </button>
            <button
              onClick={() => setSettingsForm(shopFormFrom(activeBusiness))}
              className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Edit Shop
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: products + offers */}
        <div className="lg:col-span-2 space-y-6">
          <section className={cardClass}>
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-800">Products ({products.length})</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogImportModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Sparkles size={13} className="text-teal-700" /> Import & AI
                </button>
                <button
                  onClick={() =>
                    setProductForm({
                      name: '',
                      description: '',
                      price: '',
                      category: 'General',
                      stock: '10',
                      isActive: true,
                      image: '',
                      originalImage: ''
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus size={13} /> Add product
                </button>
              </div>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No products yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {products.map((p) => (
                  <div key={p.id} className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex gap-3">
                    <SafeImage
                      src={p.images[0]}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover bg-white shrink-0"
                      fallback={<ShoppingBag size={24} className="text-gray-300" />}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h5 className="font-semibold text-sm text-gray-800 truncate">{p.name}</h5>
                        {!p.isActive && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded">Hidden</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{money(p.price)} · {p.category}</p>
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
                              isActive: p.isActive,
                              image: p.images[0] || '',
                              originalImage: p.images[0] || ''
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
              <button type="submit" className="sm:col-span-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-xs">
                Publish offer
              </button>
            </form>
            {offers.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {offers.map((o) => {
                  const expired = new Date(o.expiresAt).getTime() <= Date.now();
                  return (
                    <li key={o.id} className="py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${expired ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {o.title} · {o.discountPercent}% off {o.promoCode && <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded">{o.promoCode}</code>}
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
                        {o.number} · {timeAgo(o.createdAt)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{o.customerName || 'Customer'}</p>
                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-teal-600" /> {o.address}
                    </p>
                    <div className="space-y-0.5 border-t border-gray-200 pt-1.5">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span>{it.productName} × {it.quantity}</span>
                          <span>{money(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total {o.promoCode ? `(code ${o.promoCode})` : ''}</span>
                      <span className="text-teal-700">{money(o.totalAmount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {o.nextStatuses && o.nextStatuses.length > 0 && o.nextStatuses.map((st) => (
                          <button
                            key={st}
                            onClick={() => updateOrderStatus(o, st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              st === 'cancelled' ? 'border-gray-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-white'
                            } bg-white shadow-2xs cursor-pointer`}
                          >
                            Mark {st}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTrackingOrderId(o.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 text-sky-800 hover:bg-sky-50 bg-sky-50/40 shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Truck size={12} className="text-sky-600" /> Track
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptOrderId(o.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 text-teal-800 hover:bg-teal-50 bg-teal-50/40 shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <ReceiptIcon size={12} className="text-teal-600" /> Receipt
                        </button>
                      </div>
                    </div>
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
                  <div key={r.id} className="text-sm space-y-1 p-2 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Avatar src={r.userPhoto} name={r.userName} className="w-5 h-5 rounded-full text-[9px]" />
                        <span className="font-semibold text-gray-800 text-xs">{r.userName}</span>
                      </div>
                      <span className="text-amber-500 text-xs font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600">{r.comment}</p>}
                    <p className="text-[10px] text-gray-400">{timeAgo(r.createdAt)}</p>
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
            <ShopFormFields
              form={settingsForm}
              setForm={setSettingsForm}
              categories={categories}
              showBranding
            />
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setSettingsForm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / edit product modal */}
      {productForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={submitProduct} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3 my-auto text-left">
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
              <MediaInput value={productForm.image} onChange={(url) => setProductForm({ ...productForm, image: url })} allowLinks={false} placeholder="Upload product image" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="product-active"
                checked={productForm.isActive}
                onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="product-active" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Visible in shop
              </label>
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

      {/* Advanced Shop Modals */}
      {showStaffModal && activeBusiness && (
        <StaffManagerModal
          businessId={activeBusiness.id}
          onClose={() => setShowStaffModal(false)}
        />
      )}

      {showTablesModal && activeBusiness && (
        <TablesManagerModal
          businessId={activeBusiness.id}
          onClose={() => setShowTablesModal(false)}
        />
      )}

      {showScannerModal && activeBusiness && (
        <ScannerModal
          businessId={activeBusiness.id}
          onClose={() => setShowScannerModal(false)}
          onOrderUpdated={() => loadShopDetails(activeBusiness.id)}
        />
      )}

      {showKitchenModal && activeBusiness && (
        <KitchenDisplayModal
          businessId={activeBusiness.id}
          onClose={() => setShowKitchenModal(false)}
        />
      )}

      {showOrderingSettingsModal && activeBusiness && (
        <OrderingSettingsModal
          businessId={activeBusiness.id}
          onClose={() => setShowOrderingSettingsModal(false)}
        />
      )}

      {showCatalogImportModal && activeBusiness && (
        <CatalogImportModal
          businessId={activeBusiness.id}
          onClose={() => setShowCatalogImportModal(false)}
          onCatalogUpdated={() => loadShopDetails(activeBusiness.id)}
        />
      )}

      {showFinanceModal && activeBusiness && (
        <FinanceModal
          businessId={activeBusiness.id}
          onClose={() => setShowFinanceModal(false)}
        />
      )}

      {showArrivalsModal && activeBusiness && (
        <ArrivalsModal
          businessId={activeBusiness.id}
          onClose={() => setShowArrivalsModal(false)}
        />
      )}

      {receiptOrderId && (
        <ReceiptModal
          orderId={receiptOrderId}
          onClose={() => setReceiptOrderId(null)}
        />
      )}

      {trackingOrderId && (
        <LiveTrackingModal
          orderId={trackingOrderId}
          isOpen={!!trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
          businessName={activeBusiness?.name}
        />
      )}

      {showReviewsModal && activeBusiness && (
        <ReviewsManagerModal
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
        />
      )}

      {showLoyaltyModal && activeBusiness && (
        <LoyaltyManagerModal
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
          isOpen={showLoyaltyModal}
          onClose={() => setShowLoyaltyModal(false)}
        />
      )}

      {showFlashSaleModal && activeBusiness && (
        <FlashSaleModal
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
          isOpen={showFlashSaleModal}
          onClose={() => setShowFlashSaleModal(false)}
        />
      )}

      {showBookingsModal && activeBusiness && (
        <BookingsManagerModal
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
          isOpen={showBookingsModal}
          onClose={() => setShowBookingsModal(false)}
        />
      )}
    </div>
  );
}

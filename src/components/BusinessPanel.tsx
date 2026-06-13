/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Business, Product, CartItem, Order, BusinessCategory } from '../types';
import {
  Store,
  ShoppingBag,
  Plus,
  Trash2,
  Check,
  Star,
  MapPin,
  Phone,
  MessageSquare,
  Globe,
  Settings,
  CreditCard,
  Building,
  DollarSign,
  Tag,
  Clock,
  Briefcase
} from 'lucide-react';

interface BusinessPanelProps {
  currentUser: any;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
}

export interface ThemeConfig {
  wrapper: string;
  card: string;
  badgeBg: string;
  badgeTextColor: string;
  accentText: string;
  primaryButton: string;
  bannerText: string;
  footerBorder: string;
  subTitleColor: string;
  accentColor: string;
  pillBg: string;
  checkoutBg: string;
  navTabActive: string;
  iconBg: string;
  iconColor: string;
  priceText: string;
  starColor: string;
  headerBorder: string;
  inputBg: string;
  secondaryButton: string;
}

export function getThemeClasses(vibe?: string): ThemeConfig {
  switch (vibe) {
    case 'vintage':
      return {
        wrapper: "bg-[#faf6ee] text-amber-950 font-serif p-4 md:p-6 rounded-3xl",
        card: "bg-[#fcfaf5] border border-amber-200/80 shadow-[2px_4px_12px_rgba(139,90,43,0.06)] rounded-3xl p-4",
        badgeBg: "bg-emerald-850",
        badgeTextColor: "text-amber-50",
        accentText: "text-amber-900 font-bold",
        primaryButton: "bg-emerald-800 hover:bg-emerald-950 text-amber-50 rounded-xl px-4 py-2 text-xs font-bold font-serif transition-colors shadow-sm cursor-pointer",
        bannerText: "text-amber-50 font-serif font-black",
        footerBorder: "border-amber-200/60",
        subTitleColor: "text-amber-800 font-serif",
        accentColor: "emerald-800",
        pillBg: "bg-amber-100/70 text-amber-900 border border-amber-200/45",
        checkoutBg: "bg-[#fdfbf7] border-amber-200/80 shadow-xl",
        navTabActive: "bg-emerald-800 text-[#fcfaf5] shadow-md font-serif font-bold",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-850",
        priceText: "text-amber-950 font-serif font-bold text-sm",
        starColor: "text-amber-600",
        headerBorder: "border-amber-250/50",
        inputBg: "bg-[#f6ebd9]/80 border-[#e8d7be] placeholder-amber-800/40 text-amber-950 focus:bg-white",
        secondaryButton: "bg-[#eedfc5] hover:bg-[#e4cead] text-amber-950 font-serif"
      };
    case 'neon':
      return {
        wrapper: "bg-[#030107] text-slate-100 font-mono p-4 md:p-6 rounded-3xl border border-fuchsia-950/40 shadow-[inset_0_0_80px_rgba(217,70,239,0.03)]",
        card: "bg-[#0b071a]/95 border border-fuchsia-900/35 shadow-[0_4px_20px_rgba(217,70,239,0.08)] rounded-3xl p-4",
        badgeBg: "bg-fuchsia-600",
        badgeTextColor: "text-white",
        accentText: "text-fuchsia-400 font-bold",
        primaryButton: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] rounded-xl px-4 py-2 text-xs font-bold font-mono transition-colors cursor-pointer",
        bannerText: "text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-rose-300 to-cyan-400 font-mono font-black",
        footerBorder: "border-fuchsia-950/40",
        subTitleColor: "text-rose-400 font-mono",
        accentColor: "fuchsia-500",
        pillBg: "bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-850/40",
        checkoutBg: "bg-[#070312]/95 border-fuchsia-900/50 shadow-2xl",
        navTabActive: "bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] font-mono font-bold",
        iconBg: "bg-fuchsia-950/40",
        iconColor: "text-fuchsia-400",
        priceText: "text-cyan-400 font-mono font-bold text-sm",
        starColor: "text-fuchsia-400",
        headerBorder: "border-fuchsia-950",
        inputBg: "bg-slate-900 border-fuchsia-950/80 placeholder-slate-500 text-slate-100 focus:border-fuchsia-600",
        secondaryButton: "bg-slate-900 hover:bg-slate-850 text-slate-300"
      };
    case 'organic':
      return {
        wrapper: "bg-[#f5f7f5] text-stone-900 font-sans p-4 md:p-6 rounded-3xl",
        card: "bg-white border border-emerald-900/10 shadow-[0_4px_15px_rgba(44,76,56,0.03)] rounded-3xl p-4",
        badgeBg: "bg-[#274833]",
        badgeTextColor: "text-white",
        accentText: "text-[#274833] font-bold",
        primaryButton: "bg-[#274833] hover:bg-[#1a3222] text-stone-105 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer",
        bannerText: "text-white font-sans font-black",
        footerBorder: "border-emerald-950/10",
        subTitleColor: "text-[#274833] font-semibold",
        accentColor: "[#274833]",
        pillBg: "bg-[#ebf3ed] text-[#1e3b28] border border-[#cee2d4]",
        checkoutBg: "bg-[#f8fbf9] border-emerald-900/10 shadow-xl",
        navTabActive: "bg-[#274833] text-[#ffffff] shadow-md font-bold",
        iconBg: "bg-[#ebf3ed]",
        iconColor: "text-[#274833]",
        priceText: "text-[#1a3222] font-semibold text-sm",
        starColor: "text-amber-500",
        headerBorder: "border-emerald-950/15",
        inputBg: "bg-[#eff1ef] border-stone-200 placeholder-stone-400 text-stone-900 focus:bg-white",
        secondaryButton: "bg-stone-100 hover:bg-stone-200 text-stone-700"
      };
    case 'minimal':
    default:
      return {
        wrapper: "bg-gray-50/50 text-gray-800 font-sans p-4 md:p-6 rounded-2xl",
        card: "bg-white border border-gray-150 rounded-2xl p-4 shadow-sm",
        badgeBg: "bg-teal-650",
        badgeTextColor: "text-white",
        accentText: "text-teal-600 font-bold",
        primaryButton: "bg-teal-600 hover:bg-teal-750 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer",
        bannerText: "text-white font-sans font-black",
        footerBorder: "border-gray-150",
        subTitleColor: "text-teal-650 font-semibold",
        accentColor: "teal-600",
        pillBg: "bg-teal-50 text-teal-600 border border-teal-100/50",
        checkoutBg: "bg-white border-gray-150 shadow-xl",
        navTabActive: "bg-teal-600 text-white shadow-sm font-bold",
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        priceText: "text-gray-905 font-bold text-sm",
        starColor: "text-amber-550",
        headerBorder: "border-gray-150",
        inputBg: "bg-gray-50 border-gray-150 placeholder-gray-400 text-gray-700 focus:bg-white",
        secondaryButton: "bg-gray-50 hover:bg-gray-100 text-gray-750"
      };
  }
}

export function BusinessPanel({ currentUser, setAppView, triggerNotificationRefresh }: BusinessPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'marketplace' | 'cart' | 'dashboard'>('directory');
  
  // Directory & Shop state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [range, setRange] = useState<string>('25');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<Business | null>(null);
  
  // Interactive reviews drawer
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [shopProducts, setShopProducts] = useState<Product[]>([]);

  // Marketplace listings state
  const [marketplaceProducts, setMarketplaceProducts] = useState<Product[]>([]);
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutAddress, setCheckoutAddress] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderMessage, setOrderMessage] = useState<string>('');

  // Active storefront coupon promo engine
  const [promoCode, setPromoCode] = useState<string>('');
  const [activeDiscountPct, setActiveDiscountPct] = useState<number>(0);
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');

  // Owners Business Dashboard state
  const [dashData, setDashData] = useState<any>(null);
  const [showRegForm, setShowRegForm] = useState<boolean>(false);
  const [showShopSettings, setShowShopSettings] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Custom standalone store inside directory states
  const [shopActiveTab, setShopActiveTab] = useState<'catalog' | 'offers' | 'reviews' | 'about'>('catalog');
  const [shopCategoryFilter, setShopCategoryFilter] = useState<string>('');
  const [shopSearchFilter, setShopSearchFilter] = useState<string>('');
  const [shopOffers, setShopOffers] = useState<any[]>([]);

  // Editing Shop Profile state fields
  const [editShopName, setEditShopName] = useState<string>('');
  const [editShopCat, setEditShopCat] = useState<BusinessCategory>('Cafe');
  const [editShopDesc, setEditShopDesc] = useState<string>('');
  const [editShopAddr, setEditShopAddr] = useState<string>('');
  const [editShopPhone, setEditShopPhone] = useState<string>('');
  const [editShopEmail, setEditShopEmail] = useState<string>('');
  const [editShopWeb, setEditShopWeb] = useState<string>('');
  const [editShopCover, setEditShopCover] = useState<string>('');
  const [editShopLogo, setEditShopLogo] = useState<string>('');
  const [editShopThemeVibe, setEditShopThemeVibe] = useState<string>('minimal');
  const [editShopTagline, setEditShopTagline] = useState<string>('');
  const [editShopInstagram, setEditShopInstagram] = useState<string>('');
  const [editShopTwitter, setEditShopTwitter] = useState<string>('');

  // Editing Product fields
  const [editProdName, setEditProdName] = useState<string>('');
  const [editProdDesc, setEditProdDesc] = useState<string>('');
  const [editProdPrice, setEditProdPrice] = useState<number>(0);
  const [editProdCat, setEditProdCat] = useState<string>('General');
  const [editProdStock, setEditProdStock] = useState<number>(0);
  const [editProdImg, setEditProdImg] = useState<string>('');

  // New Business registration payloads
  const [regName, setRegName] = useState<string>('');
  const [regCat, setRegCat] = useState<BusinessCategory>('Cafe');
  const [regDesc, setRegDesc] = useState<string>('');
  const [regAddr, setRegAddr] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regWeb, setRegWeb] = useState<string>('');

  // New product payload
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<number>(10);
  const [newProdCat, setNewProdCat] = useState<string>('General');
  const [newProdStock, setNewProdStock] = useState<number>(10);
  const [newProdImg, setNewProdImg] = useState<string>('');

  // New Offer Coupon template code
  const [newOfferTitle, setNewOfferTitle] = useState<string>('');
  const [newOfferDesc, setNewOfferDesc] = useState<string>('');
  const [newOfferPct, setNewOfferPct] = useState<number>(15);
  const [newOfferCode, setNewOfferCode] = useState<string>('');

  const fetchBusinesses = async () => {
    try {
      const data = await api.getBusinesses({ range, category, search });
      setBusinesses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarketplace = async () => {
    try {
      const data = await api.getMarketplaceProducts({
        search: marketSearch,
        category: marketCategory
      });
      setMarketplaceProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const list = await api.getOrders();
      setOrders(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const info = await api.getBusinessDashboard();
      setDashData(info);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'directory') fetchBusinesses();
    if (activeSubTab === 'marketplace') fetchMarketplace();
    if (activeSubTab === 'cart') fetchOrders();
    if (activeSubTab === 'dashboard') fetchDashboard();
  }, [activeSubTab, range, category, search, marketSearch, marketCategory]);

  const handleOpenShop = async (biz: Business) => {
    setSelectedShop(biz);
    // Reset internal tab and filters
    setShopActiveTab('catalog');
    setShopCategoryFilter('');
    setShopSearchFilter('');
    setPromoCode('');
    setActiveDiscountPct(0);
    setAppliedPromo('');
    setPromoError('');
    try {
      const comments = await api.getReviews(biz.id);
      setReviews(comments);

      // Load products belonging to this shop
      const prods = await api.getMarketplaceProducts({});
      setShopProducts(prods.filter((p: Product) => p.businessId === biz.id));

      // Load offers belonging to this shop
      const offrs = await api.getBusinessOffers(biz.id);
      setShopOffers(offrs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyPromo = () => {
    setPromoError('');
    if (!promoCode.trim()) {
      setPromoError('Please enter a coupon code.');
      return;
    }
    const matchingOffer = shopOffers.find(
      (o) => o.promoCode && o.promoCode.toLowerCase() === promoCode.trim().toLowerCase()
    );
    if (matchingOffer) {
      setActiveDiscountPct(matchingOffer.discountPercent || 10);
      setAppliedPromo(matchingOffer.promoCode.toUpperCase());
      setPromoError('');
      alert(`Success! "${matchingOffer.promoCode.toUpperCase()}" applied. You saved ${matchingOffer.discountPercent}%!`);
    } else {
      const codeUpper = promoCode.trim().toUpperCase();
      if (codeUpper === 'WELCOME10') {
        setActiveDiscountPct(10);
        setAppliedPromo('WELCOME10');
        alert('Promo code "WELCOME10" applied successfully! 10% saved!');
      } else if (codeUpper === 'LOCAL20') {
        setActiveDiscountPct(20);
        setAppliedPromo('LOCAL20');
        alert('Promo code "LOCAL20" applied successfully! 20% saved!');
      } else {
        setPromoError('Invalid coupon code for this storefront.');
      }
    }
  };

  const handleFollowShop = async (shopId: string) => {
    try {
      const res = await api.toggleFollow(shopId, 'business');
      if (selectedShop && selectedShop.id === shopId) {
        setSelectedShop({
          ...selectedShop,
          followersCount: (selectedShop.followersCount || 0) + (res.following ? 1 : -1)
        });
      }
      fetchBusinesses();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (userId: string) => {
    try {
      await api.startPrivateChat(userId);
      setAppView('chat');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !newReviewText.trim()) return;

    try {
      const data = await api.submitReview(selectedShop.id, newRating, newReviewText);
      setReviews([...reviews, data]);
      setNewReviewText('');
      
      // Reload matching list
      const updatedBizs = await api.getBusinesses({ range, category, search });
      setBusinesses(updatedBizs);
      const findMe = updatedBizs.find((b: Business) => b.id === selectedShop.id);
      if (findMe) setSelectedShop(findMe);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      setCart(
        cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, product }]);
    }
    alert(`${product.name} added to shopping bag!`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const items = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const discountNote = appliedPromo ? ` [Coupon: ${appliedPromo} (-${activeDiscountPct}%)]` : '';
      await api.checkoutCart(items, (checkoutAddress || '10 Main Boulevard Hub Address') + discountNote);
      setCart([]);
      setCheckoutAddress('');
      setPromoCode('');
      setActiveDiscountPct(0);
      setAppliedPromo('');
      setOrderMessage('Checkout successful! Orders created and merchants notified.');
      setActiveSubTab('cart');
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regAddr || !regPhone || !regEmail) return;

    try {
      await api.createBusiness({
        name: regName,
        category: regCat,
        description: regDesc,
        address: regAddr,
        phone: regPhone,
        email: regEmail,
        website: regWeb
      });
      setShowRegForm(false);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !dashData?.business?.id) return;

    try {
      await api.addBusinessProduct({
        businessId: dashData.business.id,
        name: newProdName,
        description: newProdDesc,
        price: newProdPrice,
        category: newProdCat,
        stock: newProdStock,
        images: newProdImg ? [newProdImg] : undefined
      });
      setNewProdName('');
      setNewProdDesc('');
      setNewProdPrice(10);
      setNewProdImg('');
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle || !newOfferPct || !dashData?.business?.id) return;

    try {
      await api.addBusinessOffer({
        businessId: dashData.business.id,
        title: newOfferTitle,
        description: newOfferDesc,
        discountPercent: newOfferPct,
        promoCode: newOfferCode
      });
      setNewOfferTitle('');
      setNewOfferDesc('');
      setNewOfferCode('');
      fetchDashboard();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      fetchDashboard();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditShop = () => {
    if (!dashData?.business) return;
    const b = dashData.business;
    setEditShopName(b.name || '');
    setEditShopCat(b.category || 'Cafe');
    setEditShopDesc(b.description || '');
    setEditShopAddr(b.address || '');
    setEditShopPhone(b.phone || '');
    setEditShopEmail(b.email || '');
    setEditShopWeb(b.website || '');
    setEditShopCover(b.coverImage || '');
    setEditShopLogo(b.logo || '');
    setEditShopThemeVibe(b.themeVibe || 'minimal');
    setEditShopTagline(b.tagline || '');
    setEditShopInstagram(b.instagramUrl || '');
    setEditShopTwitter(b.twitterUrl || '');
    setShowShopSettings(true);
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashData?.business?.id) return;
    try {
      await api.updateBusiness(dashData.business.id, {
        name: editShopName,
        category: editShopCat,
        description: editShopDesc,
        address: editShopAddr,
        phone: editShopPhone,
        email: editShopEmail,
        website: editShopWeb,
        coverImage: editShopCover,
        logo: editShopLogo,
        themeVibe: editShopThemeVibe,
        tagline: editShopTagline,
        instagramUrl: editShopInstagram,
        twitterUrl: editShopTwitter
      });
      setShowShopSettings(false);
      fetchDashboard();
      alert('Shop Profile Updated Successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProdName(prod.name || '');
    setEditProdDesc(prod.description || '');
    setEditProdPrice(prod.price || 0);
    setEditProdCat(prod.category || 'General');
    setEditProdStock(prod.stock !== undefined ? prod.stock : 10);
    setEditProdImg(prod.images?.[0] || '');
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.updateBusinessProduct(editingProduct.id, {
        name: editProdName,
        description: editProdDesc,
        price: editProdPrice,
        category: editProdCat,
        stock: editProdStock,
        images: editProdImg ? [editProdImg] : undefined
      });
      setEditingProduct(null);
      fetchDashboard();
      alert('Product & Inventory Updated Successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteBusinessProduct(id);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const bizCategories: BusinessCategory[] = [
    'Restaurant',
    'Grocery',
    'Fashion',
    'Electronics',
    'Pharmacy',
    'Hotel',
    'Cafe',
    'Service Provider',
    'Local Vendor'
  ];

  const theme = selectedShop ? getThemeClasses((selectedShop as any).themeVibe) : getThemeClasses('minimal');

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Store size={22} />
            Hub Shops & Local Services Engine
          </h2>
          <p className="text-xs text-teal-100 mt-1">Discover, order, and support merchants nearby.</p>
        </div>

        {/* Sub navigation Tabs switcher */}
        <div className="flex gap-1.5 bg-black/15 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'directory' as const, label: 'Nearby Shops', icon: <Store size={14} /> },
            { id: 'marketplace' as const, label: 'Marketplace', icon: <ShoppingBag size={14} /> },
            { id: 'cart' as const, label: `My Orders (${cart.length})`, icon: <CreditCard size={14} /> },
            { id: 'dashboard' as const, label: 'Business Owner Desk', icon: <Briefcase size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSelectedShop(null);
                setOrderMessage('');
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === tab.id ? 'bg-white text-teal-800' : 'text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ACTIVE SUB PANEL TAB */}

      {/* --- BUSINESS DIRECTORY --- */}
      {activeSubTab === 'directory' && !selectedShop && (
        <div className="space-y-5">
          {/* Query Filters */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search shop names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="md:w-56 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-600"
            >
              <option value="">All Categories</option>
              {bizCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="md:w-36 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-600"
            >
              <option value="5">Within 5 KM</option>
              <option value="15">Within 15 KM</option>
              <option value="50">Within 50 KM</option>
              <option value="global">Global Scope</option>
            </select>
          </div>

          {/* Directory Listings Grid */}
          {businesses.length === 0 ? (
            <div className="text-center bg-white py-16 rounded-3xl border border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
              No matching local businesses located here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => handleOpenShop(biz)}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:ring-1 hover:ring-teal-100 hover:shadow-md transition-all flex flex-col h-full"
                >
                  {/* Banner Image with category */}
                  <div className="relative h-40 bg-gray-200">
                    <img
                      src={biz.coverImage}
                      alt={biz.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[10px] font-bold text-gray-700 shadow-sm uppercase tracking-wider">
                      {biz.category}
                    </span>
                    {biz.isVerified && (
                      <span className="absolute top-3 right-3 bg-teal-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-sm">
                        Verified Business
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col space-y-2">
                    <div className="flex items-start gap-2 justify-between">
                      <h4 className="font-bold text-gray-800 text-sm hover:text-teal-600 transition-colors">
                        {biz.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded-lg shrink-0">
                        <Star size={12} className="fill-amber-500" />
                        <span>{biz.averageRating || '0.0'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{biz.description}</p>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium pt-2">
                      <MapPin size={12} className="text-teal-600 shrink-0" />
                      <span className="truncate">{biz.address}</span>
                    </div>

                    {/* Footer Distance Badge */}
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-mono font-bold">
                      <span className="text-teal-600">{biz.distanceKm} km away</span>
                      <span>{biz.followersCount || 0} Followers</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SELECTED SHOP PROFILE VIEWER --- */}
      {activeSubTab === 'directory' && selectedShop && (
        <div className={`${theme.wrapper} shadow-lg border border-gray-150/40 relative space-y-6 transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={() => setSelectedShop(null)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-150 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              ← Return to Directory
            </button>
            <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider pl-1">Store Front Context Mode: <strong className="text-teal-600">{(selectedShop as any).themeVibe || 'minimal'}</strong></span>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
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
                        <span className="bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                          Verified Local Brand
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-teal-300 font-medium">#{selectedShop.category} • {selectedShop.distanceKm ? `${selectedShop.distanceKm} km away` : 'Nearby'}</p>
                    
                    {/* Brand customizable slogan tagline */}
                    {(selectedShop as any).tagline && (
                      <p className="text-[11px] md:text-xs italic text-slate-200 mt-1 font-medium bg-black/45 px-3 py-1.5 rounded-xl border border-white/10 max-w-sm md:max-w-md">
                        "{(selectedShop as any).tagline}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-white/90 text-xs pt-1">
                      <div className="flex items-center font-bold text-amber-400">
                        <Star size={13} className="fill-amber-400 mr-0.5" />
                        <span>{selectedShop.averageRating ? Number(selectedShop.averageRating).toFixed(1) : "5.0"}</span>
                      </div>
                      <span>•</span>
                      <span className="font-semibold text-white/80">{selectedShop.followersCount || 0} Followers</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleFollowShop(selectedShop.id)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/25 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md"
                  >
                    Follow Brand Updates
                  </button>
                  <button
                    onClick={() => handleSendMessage(selectedShop.ownerId)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <MessageSquare size={14} />
                    Consult Dealer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Tab navigation representing their own domain */}
          <div className="border-b border-gray-150 flex gap-2 overflow-x-auto pb-px bg-white p-2 rounded-2xl">
            {[
              { id: 'catalog', label: 'Store Catalog Products' },
              { id: 'offers', label: `Promotional Deals & Coupons (${shopOffers.length})` },
              { id: 'reviews', label: `Ratings Feed (${reviews.length})` },
              { id: 'about', label: 'Company Profile & Info' }
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
                      placeholder="Search this business catalog..."
                      value={shopSearchFilter}
                      onChange={(e) => setShopSearchFilter(e.target.value)}
                      className={`flex-1 text-xs rounded-xl px-3.5 py-2 outline-none border transition-all ${theme.inputBg}`}
                    />
                    <select
                      value={shopCategoryFilter}
                      onChange={(e) => setShopCategoryFilter(e.target.value)}
                      className={`text-xs rounded-xl px-3 py-2 outline-none border font-bold transition-all ${theme.inputBg}`}
                    >
                      <option value="">All Shop Aisle Categories</option>
                      {Array.from(new Set(shopProducts.map(p => p.category || 'General'))).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Render catalog products */}
                  {shopProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                      <Store className="mx-auto text-gray-300 mb-2" size={32} />
                      <p className="text-xs text-gray-500 italic">This store does not currently have catalog items for sale.</p>
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
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.pillBg} ${theme.accentText}`}>{p.category || 'General'}</span>
                                    {/* Inventory Indicator Badges */}
                                    {isOutOfStock ? (
                                      <span className="text-[8px] font-extrabold text-red-650 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md uppercase">Sold Out</span>
                                    ) : isLowStock ? (
                                      <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase animate-pulse">Only {p.stock} left!</span>
                                    ) : (
                                      <span className="text-[8px] font-extrabold text-teal-650 bg-teal-50/50 px-1.5 py-0.5 rounded-md uppercase">{p.stock} Available</span>
                                    )}
                                  </div>
                                  <h4 className="font-extrabold text-xs text-gray-800 tracking-tight truncate mt-1">{p.name}</h4>
                                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed line-clamp-2">{p.description}</p>
                                </div>
                                <div className="flex items-center justify-between mt-3 bg-gray-50 p-1.5 px-2.5 rounded-xl">
                                  <span className={`text-sm font-black font-mono ${theme.priceText}`}>${p.price}</span>
                                  <button
                                    onClick={() => handleAddToCart(p)}
                                    disabled={isOutOfStock}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                      isOutOfStock
                                        ? 'bg-gray-150 text-gray-450 cursor-not-allowed'
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
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">Claim coupons published by the business owners. Copy and paste during your checkout order process!</p>
                  
                  {shopOffers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                      <Tag className="mx-auto text-gray-300 mb-2" size={32} />
                      <p className="text-xs text-gray-500 italic">No coupons currently published by this vendor.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shopOffers.map((o) => (
                        <div key={o.id} className="relative bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-dashed border-teal-200 p-5 rounded-2xl flex justify-between items-center overflow-hidden shadow-sm">
                          {/* Circle notches for ticket/coupon style */}
                          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-r border-teal-200"></div>
                          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-l border-teal-200"></div>
                          
                          <div className="pl-4 pr-1.5 space-y-1">
                            <span className="bg-teal-600 text-white text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md shadow-sm">{o.discountPercent}% OFF DISCOUNT</span>
                            <h5 className="font-extrabold text-xs text-gray-800 mt-1">{o.title}</h5>
                            <p className="text-[9px] text-gray-400 font-medium leading-relaxed">{o.description}</p>
                            <span className="block text-[8px] text-gray-300 italic font-mono mt-0.5">Expires soon</span>
                          </div>
                          <div className="text-right pr-4 shrink-0 border-l border-teal-200/40 pl-4">
                            <span className="block text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1">PROMO CODE</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(o.promoCode || '');
                                alert(`Coupon code "${o.promoCode}" copied! Paste code at checkout.`);
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-mono font-bold text-teal-600 shadow-sm transition-all"
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
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Average Score</span>
                      <h2 className="text-4xl font-black text-teal-600 font-mono">
                        {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0"}
                      </h2>
                      <div className="flex justify-center text-amber-500">
                        <Star size={16} className="fill-current" />
                        <Star size={16} className="fill-current" />
                        <Star size={16} className="fill-current" />
                        <Star size={16} className="fill-current" />
                        <Star size={16} className="fill-current" />
                      </div>
                      <span className="text-[10px] text-gray-400 block">{reviews.length} neighborhood orders reviews</span>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Rating Frequency Matrix</span>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter(r => r.rating === star).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : star === 5 ? 100 : 0;
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
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
                    <h4 className="font-extrabold text-xs uppercase tracking-widest text-teal-600">Have you purchased here? Share feedback</h4>
                    
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-150 inline-flex">
                        <span className="text-xs font-semibold text-gray-500 pl-1">Star Score Rating:</span>
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
                          placeholder="What did you buy? Share review notes on delivery, catalog accuracy, etc..."
                          value={newReviewText}
                          onChange={(e) => setNewReviewText(e.target.value)}
                          className="flex-1 text-xs bg-gray-5 ri-50 border border-gray-150 rounded-xl px-3.5 py-2.5 text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-teal-500"
                          required
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                        >
                          Send Review
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Review lists view */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {reviews.length === 0 ? (
                      <p className="text-xs text-gray-450 italic py-6 text-center">No review logs available yet. Be the first to leave order reviews!</p>
                    ) : (
                      reviews.map((rev) => (
                        <div key={rev.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-gray-800">{rev.userName}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-2.0 py-0.5 rounded-lg text-[10px] font-bold">
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
                    <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider text-teal-600">Company Bio / Mission Structure</h3>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">{selectedShop.description || 'No corporate description details provided yet.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-100 p-4 rounded-2xl space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-black block">Operating Status</span>
                      <p className="text-xs text-gray-700 font-extrabold flex items-center gap-1.5"><Clock size={14} className="text-emerald-500" /> Opened Daily Online 8:00 AM - 10:00 PM</p>
                    </div>
                    <div className="border border-gray-100 p-4 rounded-2xl space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-black block">Supervised Location Coordinates</span>
                      <p className="text-xs text-gray-700 font-semibold font-mono flex items-center gap-1.5">Lat: {Number(selectedShop.latitude).toFixed(4)}, Lng: {Number(selectedShop.longitude).toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Information & Local Store Checkout drawer */}
            <div className="space-y-6">
              {/* Standalone Quick Contacts */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest text-teal-600">Shop Contact Coordinates</h4>
                
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
                  {((selectedShop as any).instagramUrl || (selectedShop as any).twitterUrl) && (
                    <div className="flex gap-2.5 pt-2 border-t border-gray-100/50">
                      {(selectedShop as any).instagramUrl && (
                        <a
                          href={(selectedShop as any).instagramUrl.startsWith('http') ? (selectedShop as any).instagramUrl : `https://instagram.com/${(selectedShop as any).instagramUrl.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-pink-600 font-bold bg-pink-50 hover:bg-pink-100 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          <span>Instagram</span>
                        </a>
                      )}
                      {(selectedShop as any).twitterUrl && (
                        <a
                          href={(selectedShop as any).twitterUrl.startsWith('http') ? (selectedShop as any).twitterUrl : `https://twitter.com/${(selectedShop as any).twitterUrl.replace('@', '')}`}
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
                  <h4 className={`font-extrabold text-xs uppercase tracking-widest ${theme.subTitleColor}`}>Local Store Cart</h4>
                  <span className="bg-teal-50 text-teal-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">{cart.length} items</span>
                </div>

                {cart.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-5 leading-relaxed text-center">Your shopping bag for this store visit is currently empty.</p>
                ) : (
                  <div className="space-y-4.5">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 border border-gray-150 rounded-xl">
                          <div className="min-w-0 pr-1.5 flex-1">
                            <p className="font-extrabold text-gray-700 truncate text-[11px]">{item.product?.name}</p>
                            <p className="text-[9px] text-gray-400 font-mono">Qty: {item.quantity} • ${item.product?.price} ea</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-xs font-mono truncate ${theme.priceText}`}>${(item.product?.price || 0) * item.quantity}</span>
                            <button
                              onClick={() => {
                                setCart(cart.filter(i => i.productId !== item.productId));
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
                        <label className="text-[9.5px] text-gray-400 font-bold uppercase block">Enter Coupon Voucher:</label>
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
                            className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-[10px] font-black cursor-pointer hover:bg-slate-700 transition-colors shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                        {promoError && (
                          <span className="text-[9px] text-rose-500 font-bold block">{promoError}</span>
                        )}
                        {appliedPromo && (
                          <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 pb-1">
                            ✔ Code "<strong>{appliedPromo}</strong>" Applied!
                          </span>
                        )}
                      </div>

                      {appliedPromo && (
                        <div className="flex justify-between text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-1 rounded-lg">
                          <span>Applied Promo Discount (-{activeDiscountPct}%):</span>
                          <span>-${(cart.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0) * activeDiscountPct / 100).toFixed(1)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs font-extrabold pb-1">
                        <span className="text-gray-500">Billed Total:</span>
                        <span className={`font-mono text-sm ${theme.priceText}`}>
                          ${(
                            cart.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0) * 
                            (1 - activeDiscountPct / 100)
                          ).toFixed(1)}
                        </span>
                      </div>

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
                          className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-extrabold shadow-md transform active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard size={13} />
                          Confirm & Book Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}


      {/* --- MARKETPLACE CATALOG --- */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-5">
          {/* Query Filter bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search product listings..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
            />
            <input
              type="text"
              placeholder="Category (e.g. Apparel, Food, Produce...)"
              value={marketCategory}
              onChange={(e) => setMarketCategory(e.target.value)}
              className="md:w-56 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Product Listings grid */}
          {marketplaceProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs font-semibold uppercase">
              No products found in marketplace.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {marketplaceProducts.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full hover:ring-1 hover:ring-teal-100 transition-all">
                  <div className="h-44 bg-gray-100 relative">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2 left-2 bg-teal-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                      {p.category}
                    </span>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs truncate" title={p.name}>{p.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Seller: {p.businessName}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-55 mt-2">
                      <span className="text-[13px] font-bold text-teal-600 font-mono">${p.price}</span>
                      <button
                        onClick={() => handleAddToCart(p)}
                        className="px-2.5 py-1.5 bg-teal-605 text-white font-bold text-[10px] rounded-xl flex items-center gap-1 bg-teal-600 hover:bg-teal-700 shadow-xs"
                      >
                        <Plus size={10} /> Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* --- CART & ORDERS CHECKOUTS --- */}
      {activeSubTab === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active shopping bag drawer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider text-teal-600">Shopping Bag</h3>

              {cart.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8 font-semibold uppercase">Bag is currently empty.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex gap-3 bg-gray-50 p-3 rounded-2xl items-center border border-gray-100">
                      <img
                        src={item.product?.images[0]}
                        className="w-12 h-12 rounded-xl object-cover bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-gray-700 truncate">{item.product?.name}</h4>
                        <span className="text-[10px] text-gray-400 font-bold block">Qty: {item.quantity}</span>
                      </div>
                      <span className="text-xs font-bold text-teal-600 font-mono">${(item.product?.price || 0) * item.quantity}</span>
                      <button
                        onClick={() => setCart(cart.filter((c) => c.productId !== item.productId))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Summary math */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-650 font-bold">
                      <span>Total Checkouts Price:</span>
                      <span className="font-mono text-teal-600 text-sm">
                        ${cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] text-gray-400 font-bold uppercase block">Fulfillment Delivery Address</label>
                      <input
                        type="text"
                        placeholder="Enter delivery address..."
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-200 p-3 outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Process Checkout & notify Shops
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Order tracking status list */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider text-teal-600">Order Tracker Lines</h3>
              {orderMessage && <p className="text-xs bg-teal-50 text-teal-700 p-2.5 rounded-xl font-medium">{orderMessage}</p>}

              {orders.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-4 italic">No orders tracked yet.</p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto">
                  {orders.map((o) => (
                    <div key={o.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold font-mono text-gray-400">ID: {o.id.substring(0, 8)}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          o.status === 'delivered' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-750">Store: {o.businessName}</p>
                      
                      <div className="space-y-1">
                        {o.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-gray-500 font-medium">
                            <span>{it.productName} (x{it.quantity})</span>
                            <span className="font-mono">${it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 pt-1.5 flex justify-between items-center font-bold">
                        <span>Paid amount:</span>
                        <span className="text-teal-600 font-mono">${o.totalAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* --- BUSINESS OWNERS PANEL DASHBOARD --- */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {dashData && !dashData.owned && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center space-y-3">
              <Building size={34} className="text-teal-500 mx-auto" />
              <h3 className="font-bold text-gray-800 text-sm">Ready to Register Your Local Business?</h3>
              <p className="text-xs text-gray-400">Launch a customized shop portal directly. Display items, manage buyer orders, and provide reviews feedback to close neighbors!</p>
              
              {!showRegForm ? (
                <button
                  onClick={() => setShowRegForm(true)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                >
                  Register Business Portal
                </button>
              ) : (
                <form onSubmit={handleRegisterBusiness} className="max-w-md mx-auto text-left bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Shop Name</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Business Category</label>
                      <select
                        value={regCat}
                        onChange={(e) => setRegCat(e.target.value as BusinessCategory)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:ring-1 focus:ring-teal-500 text-gray-600"
                      >
                        {bizCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Address (Map target)</label>
                    <input
                      type="text"
                      value={regAddr}
                      onChange={(e) => setRegAddr(e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Phone Contact</label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Business Email</label>
                      <input
                        type="text"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Description / Details</label>
                    <textarea
                      value={regDesc}
                      onChange={(e) => setRegDesc(e.target.value)}
                      rows={2}
                      className="w-full text-xs rounded-lg border border-gray-200 bg-white p-2.5 outline-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setShowRegForm(false)}
                      type="button"
                      className="text-xs text-gray-500 hover:bg-gray-150 px-3 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs"
                    >
                      Submit Registration
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {dashData && dashData.owned && (
            <div className="space-y-6">
              {/* --- EDIT SHOP IDENTITY MODAL OVERLAY --- */}
              {showShopSettings && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                  <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-gray-100 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest text-teal-600">Modify Store Brand settings</h4>
                      <button onClick={() => setShowShopSettings(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold font-mono">✕</button>
                    </div>

                    <form onSubmit={handleUpdateBusiness} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Company Name</label>
                          <input
                            type="text"
                            value={editShopName}
                            onChange={(e) => setEditShopName(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Store Category</label>
                          <select
                            value={editShopCat}
                            onChange={(e) => setEditShopCat(e.target.value as any)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white text-gray-600 font-bold"
                          >
                            {bizCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Brand Logo Photo URL</label>
                          <input
                            type="text"
                            value={editShopLogo}
                            onChange={(e) => setEditShopLogo(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Store Banner Cover URL</label>
                          <input
                            type="text"
                            value={editShopCover}
                            onChange={(e) => setEditShopCover(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Corporate Phone Line</label>
                          <input
                            type="text"
                            value={editShopPhone}
                            onChange={(e) => setEditShopPhone(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Corporate Support Email</label>
                          <input
                            type="text"
                            value={editShopEmail}
                            onChange={(e) => setEditShopEmail(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Operating Website URL</label>
                        <input
                          type="text"
                          value={editShopWeb}
                          onChange={(e) => setEditShopWeb(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Operating Street Address</label>
                        <input
                          type="text"
                          value={editShopAddr}
                          onChange={(e) => setEditShopAddr(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Company Description</label>
                        <textarea
                          value={editShopDesc}
                          onChange={(e) => setEditShopDesc(e.target.value)}
                          rows={2}
                          className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white font-medium"
                        ></textarea>
                      </div>

                      {/* Brand Identity / Storefront customization */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3 text-left">
                        <span className="text-[10px] text-teal-600 font-extrabold uppercase tracking-wider block">🎨 Dynamic Virtual Storefront Theme Vibe:</span>
                        
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { value: 'minimal', label: 'Tech Minimalist', desc: 'Teal & Slate defaults', colors: 'bg-teal-500' },
                            { value: 'vintage', label: 'Vintage Warmth', desc: 'Wood, Amber & Serif', colors: 'bg-amber-600' },
                            { value: 'neon', label: 'Midnight Neon', desc: 'Purple & Monospace', colors: 'bg-fuchsia-500' },
                            { value: 'organic', label: 'Organic Eco', desc: 'Sage Green & botanical', colors: 'bg-emerald-800' }
                          ].map((v) => (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => setEditShopThemeVibe(v.value)}
                              className={`p-2 rounded-xl text-left border flex flex-col items-center justify-center text-center transition-all ${
                                editShopThemeVibe === v.value
                                  ? 'border-teal-550 bg-white shadow-sm ring-1 ring-teal-500'
                                  : 'border-slate-200 hover:border-slate-300 bg-white/60'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full ${v.colors} mb-1`} />
                              <span className="text-[9px] font-black block text-slate-800 truncate leading-none mb-0.5">{v.label}</span>
                              <span className="text-[7.5px] text-slate-400 font-medium scale-90 tracking-tighter leading-none">{v.desc}</span>
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Brand Tagline / Slogan (Displayed on Hero Banner)</label>
                          <input
                            type="text"
                            value={editShopTagline}
                            onChange={(e) => setEditShopTagline(e.target.value)}
                            placeholder="e.g. Crafted in small batches, poured with love."
                            className="w-full text-xs rounded-xl border border-gray-200 p-2 outline-none bg-white font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Instagram Account Link/Handle</label>
                            <input
                              type="text"
                              value={editShopInstagram}
                              onChange={(e) => setEditShopInstagram(e.target.value)}
                              placeholder="@username or link"
                              className="w-full text-xs rounded-xl border border-gray-200 p-2 outline-none bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Twitter Handle</label>
                            <input
                              type="text"
                              value={editShopTwitter}
                              onChange={(e) => setEditShopTwitter(e.target.value)}
                              placeholder="@username"
                              className="w-full text-xs rounded-xl border border-gray-200 p-2 outline-none bg-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowShopSettings(false)}
                          className="text-xs text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                        >
                          Save Brand Configuration
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* --- EDIT CATALOG ITEM MODAL OVERLAY --- */}
              {editingProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest text-teal-600">Adjust Catalog Item Specifications</h4>
                      <button onClick={() => setEditingProduct(null)} className="text-gray-450 hover:text-gray-750 text-xs font-bold font-mono">✕</button>
                    </div>

                    <form onSubmit={handleUpdateProduct} className="space-y-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Product Title</label>
                        <input
                          type="text"
                          value={editProdName}
                          onChange={(e) => setEditProdName(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Item Description</label>
                        <textarea
                          value={editProdDesc}
                          onChange={(e) => setEditProdDesc(e.target.value)}
                          rows={2}
                          className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white font-medium"
                        ></textarea>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Pricing ($)</label>
                          <input
                            type="number"
                            value={editProdPrice}
                            onChange={(e) => setEditProdPrice(Number(e.target.value))}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">General Category</label>
                          <input
                            type="text"
                            value={editProdCat}
                            onChange={(e) => setEditProdCat(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Inventory stock Level</label>
                          <input
                            type="number"
                            value={editProdStock}
                            onChange={(e) => setEditProdStock(Number(e.target.value))}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Display Image URL</label>
                          <input
                            type="text"
                            value={editProdImg}
                            onChange={(e) => setEditProdImg(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="text-xs text-gray-500 hover:bg-gray-100 px-4 py-2 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm"
                        >
                          Update Product & Inventory
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Analytics Header Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Sales</span>
                    <h3 className="text-lg font-bold text-teal-600 font-mono mt-1">${dashData.analytics.totalSales}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Fulfill Orders</span>
                    <h3 className="text-lg font-bold text-gray-800 font-mono mt-1">{dashData.analytics.ordersCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <ShoppingBag size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Comments Reviews</span>
                    <h3 className="text-lg font-bold text-gray-800 font-mono mt-1">{dashData.analytics.reviewsCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Star size={20} className="fill-amber-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Followers Hub</span>
                    <h3 className="text-lg font-bold text-gray-800 font-mono mt-1">{dashData.analytics.followersCount} Followers</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Check size={20} />
                  </div>
                </div>
              </div>

              {/* Main controls columns layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload product & offer coupons form */}
                <div className="space-y-6">
                  {/* Upload Products */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600">Product Showcase Manager</h4>
                    
                    <form onSubmit={handleAddProduct} className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 focus:bg-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Description..."
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 bg-gray-50 focus:bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Price ($)"
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(Number(e.target.value))}
                          className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 bg-gray-50 focus:bg-white"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Category (Food, Apparel...)"
                          value={newProdCat}
                          onChange={(e) => setNewProdCat(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 bg-gray-50 focus:bg-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Insert beautiful product Photo URL"
                        value={newProdImg}
                        onChange={(e) => setNewProdImg(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 bg-gray-50 focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                      >
                        Publish Showcase Item
                      </button>
                    </form>
                  </div>

                  {/* Create offer coupon */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600 font-display">Create Promotion Offer</h4>
                    <p className="text-[10px] text-gray-400 leading-relaxed">Publishing offers automatically pushes live notifications directly to your shop followers!</p>
                    
                    <form onSubmit={handleAddOffer} className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="Offer Title (e.g. Happy Hour Special)"
                        value={newOfferTitle}
                        onChange={(e) => setNewOfferTitle(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 focus:bg-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Offer description"
                        value={newOfferDesc}
                        onChange={(e) => setNewOfferDesc(e.target.value)}
                        className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50 focus:bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Percent discount (e.g. 20)"
                          value={newOfferPct}
                          onChange={(e) => setNewOfferPct(Number(e.target.value))}
                          className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Promo code (e.g. HAPPY20)"
                          value={newOfferCode}
                          onChange={(e) => setNewOfferCode(e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                      >
                        Publish Promo Code
                      </button>
                    </form>
                  </div>
                </div>

                {/* Orders fulfillment tracking, Branded Site Settings, and Product Inventory */}
                <div className="lg:col-span-2 space-y-6">
                  {/* BRAND STYLE IDENTITY CARD */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
                    {/* Visual miniature site preview of their banner cover */}
                    <div className="relative h-28 bg-gradient-to-r from-teal-500 to-indigo-600">
                      {dashData.owned.coverImage && (
                        <img 
                          src={dashData.owned.coverImage} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute bottom-3 left-4 flex items-center gap-3">
                        <img
                          src={dashData.owned.logo || "https://images.unsplash.com/photo-1472851294608-062f824d296e?w=150"}
                          alt="Logo preview"
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-white shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h3 className="text-white font-extrabold text-sm tracking-tight leading-none drop-shadow-sm">{dashData.owned.name}</h3>
                          <span className="text-[9px] text-teal-200 font-bold bg-teal-900/50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block uppercase">{dashData.owned.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-1 space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100/70 pb-3">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Site Customization</p>
                          <h4 className="text-xs font-extrabold text-gray-700">Configure Independent Storefront Appearance</h4>
                        </div>
                        <button
                          onClick={handleStartEditShop}
                          className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Building size={11} />
                          Modify Storefront Settings
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] text-gray-500 font-semibold">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
                          <span className="text-[8px] text-gray-400 uppercase font-black block">Street Address</span>
                          <p className="truncate text-gray-700 font-bold" title={dashData.owned.address}>{dashData.owned.address}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
                          <span className="text-[8px] text-gray-400 uppercase font-black block">Telephone Support</span>
                          <p className="truncate text-gray-700 font-bold">{dashData.owned.phone || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
                          <span className="text-[8px] text-gray-400 uppercase font-black block">Company Email</span>
                          <p className="truncate text-gray-700 font-bold">{dashData.owned.email || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-0.5">
                          <span className="text-[8px] text-gray-400 uppercase font-black block">Official Website</span>
                          <p className="truncate text-teal-600 font-bold font-mono">{dashData.owned.website || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE PRODUCTS INVENTORY CONTROL LIST */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100/70 pb-3">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600 font-display">Active Store Inventory List</h4>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-0.5">Adjust price tags, description details, and keep track of live inventory levels.</p>
                      </div>
                      <span className="bg-teal-50 text-teal-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">{dashData.products.length} Products</span>
                    </div>

                    {dashData.products.length === 0 ? (
                      <div className="text-center py-6">
                        <Store size={28} className="text-gray-350 mx-auto mb-1.5" />
                        <p className="text-[10px] text-gray-400 italic">No products currently listed for this store. Add products on the left side panel.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-1">
                        {dashData.products.map((p: any) => {
                          const isOutOfStock = p.stock === 0;
                          const isLowStock = p.stock > 0 && p.stock <= 5;
                          
                          return (
                            <div key={p.id} className="bg-gray-50/70 border border-gray-150 p-3 rounded-2xl flex gap-3 hover:shadow-sm transition-all">
                              <img
                                src={p.images[0] || "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200"}
                                alt={p.name}
                                className="w-16 h-16 rounded-xl object-cover bg-white shrink-0 border border-gray-150"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="text-[8px] font-bold text-teal-600 uppercase bg-teal-50 px-1.5 py-0.2 rounded">{p.category || 'General'}</span>
                                    {isOutOfStock ? (
                                      <span className="text-[8px] font-extrabold text-red-650 bg-red-50 px-1 py-0.2 rounded">Sold Out</span>
                                    ) : isLowStock ? (
                                      <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-1 py-0.2 rounded animate-pulse">Low Stock ({p.stock})</span>
                                    ) : (
                                      <span className="text-[8px] font-semibold text-gray-400">Stock: <strong className="text-gray-700">{p.stock}</strong></span>
                                    )}
                                  </div>
                                  <h5 className="font-extrabold text-xs text-gray-800 truncate mt-0.5">{p.name}</h5>
                                  <p className="text-[10px] text-gray-500 font-extrabold font-mono">${p.price}</p>
                                </div>

                                <div className="flex justify-end gap-1.5 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditProduct(p)}
                                    className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[9px] font-extrabold text-gray-600 transition-all uppercase cursor-pointer"
                                  >
                                    Adjust / Refill
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 border border-red-100 rounded-lg text-[9px] font-extrabold transition-all uppercase cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Orders fulfillment tracking */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600 mb-2">Incoming Purchase Orders Fulfillments</h4>
                    
                    {dashData.orders.length === 0 ? (
                      <p className="text-xs text-gray-450 italic py-6">Your brand directory currently has no active purchase order lines.</p>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {dashData.orders.map((o: any) => (
                          <div key={o.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs space-y-3">
                            <div className="flex justify-between items-center bg-white p-2 rounded-xl">
                              <span className="font-bold font-mono text-[9px] text-gray-400">ORDER CRID: {o.id.substring(0, 10)}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white ${
                                o.status === 'delivered' ? 'bg-teal-500' : 'bg-amber-600'
                              }`}>{o.status}</span>
                            </div>

                            <p className="font-bold text-gray-700">Buyer: {o.customerName}</p>
                            <div className="border-t border-gray-100/60 pt-2 space-y-1">
                              {o.items.map((it: any, ind: number) => (
                                <div key={ind} className="flex justify-between text-gray-600 font-medium text-[11px]">
                                  <span>{it.productName} (Qty: {it.quantity})</span>
                                  <span className="font-mono">${it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-xs font-bold border-t border-gray-100/65 pt-2">
                              <span>Total checkouts paid:</span>
                              <span className="text-teal-600 font-mono">${o.totalAmount}</span>
                            </div>

                            {/* Control action status hooks */}
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-100/65">
                              {['processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleUpdateOrderStatus(o.id, st)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex-1 transition-all ${
                                    o.status === st
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-white hover:bg-gray-150 border border-gray-200 text-gray-500'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

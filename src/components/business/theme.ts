/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessCategory } from '../../types';

export const BIZ_CATEGORIES: BusinessCategory[] = [
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

// Storefront "vibes" a business owner can pick for their shop page
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
        badgeBg: "bg-emerald-800",
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
        iconColor: "text-emerald-800",
        priceText: "text-amber-950 font-serif font-bold text-sm",
        starColor: "text-amber-600",
        headerBorder: "border-amber-200/50",
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
        pillBg: "bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-800/40",
        checkoutBg: "bg-[#070312]/95 border-fuchsia-900/50 shadow-2xl",
        navTabActive: "bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] font-mono font-bold",
        iconBg: "bg-fuchsia-950/40",
        iconColor: "text-fuchsia-400",
        priceText: "text-cyan-400 font-mono font-bold text-sm",
        starColor: "text-fuchsia-400",
        headerBorder: "border-fuchsia-950",
        inputBg: "bg-slate-900 border-fuchsia-950/80 placeholder-slate-500 text-slate-100 focus:border-fuchsia-600",
        secondaryButton: "bg-slate-900 hover:bg-slate-800 text-slate-300"
      };
    case 'organic':
      return {
        wrapper: "bg-[#f5f7f5] text-stone-900 font-sans p-4 md:p-6 rounded-3xl",
        card: "bg-white border border-emerald-900/10 shadow-[0_4px_15px_rgba(44,76,56,0.03)] rounded-3xl p-4",
        badgeBg: "bg-[#274833]",
        badgeTextColor: "text-white",
        accentText: "text-[#274833] font-bold",
        primaryButton: "bg-[#274833] hover:bg-[#1a3222] text-stone-100 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer",
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
        card: "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm",
        badgeBg: "bg-teal-700",
        badgeTextColor: "text-white",
        accentText: "text-teal-600 font-bold",
        primaryButton: "bg-teal-600 hover:bg-teal-800 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer",
        bannerText: "text-white font-sans font-black",
        footerBorder: "border-gray-200",
        subTitleColor: "text-teal-700 font-semibold",
        accentColor: "teal-600",
        pillBg: "bg-teal-50 text-teal-600 border border-teal-100/50",
        checkoutBg: "bg-white border-gray-200 shadow-xl",
        navTabActive: "bg-teal-600 text-white shadow-sm font-bold",
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        priceText: "text-gray-900 font-bold text-sm",
        starColor: "text-amber-500",
        headerBorder: "border-gray-200",
        inputBg: "bg-gray-50 border-gray-200 placeholder-gray-400 text-gray-700 focus:bg-white",
        secondaryButton: "bg-gray-50 hover:bg-gray-100 text-gray-700"
      };
  }
}

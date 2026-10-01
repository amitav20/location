/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Small building blocks shared by every page, so loading, empty and error screens look the same everywhere.

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

const AVATAR_COLORS = ['bg-teal-600', 'bg-sky-600', 'bg-indigo-600', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-600', 'bg-fuchsia-600'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** A person's photo, or their initials on a colour when there is no photo (or it fails to load). */
export function Avatar({ src, name, className = 'w-10 h-10 rounded-full', title }: { src?: string; name: string; className?: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        title={title}
        className={`${className} object-cover bg-gray-100 shrink-0`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  const color = AVATAR_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span title={title || name} aria-label={name} className={`${className} ${color} text-white font-bold flex items-center justify-center shrink-0 select-none text-[0.7em]`}>
      <span className="text-xs leading-none">{initials(name)}</span>
    </span>
  );
}

/** An image that shows a neutral placeholder instead of a broken-image icon. */
export function SafeImage({ src, alt = '', className = '', fallback }: { src?: string; alt?: string; className?: string; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400`}>{fallback}</div>;
  }
  return <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} />;
}

export function Spinner({ label, tone = 'border-teal-500' }: { label?: string; tone?: string }) {
  return (
    <div className="text-center py-12" role="status">
      <div className={`w-8 h-8 border-4 ${tone} border-t-transparent rounded-full animate-spin mx-auto`} />
      {label && <p className="text-xs text-gray-500 font-semibold mt-3">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center bg-white border border-gray-200 py-14 px-6 rounded-3xl space-y-2">
      {icon && <div className="flex justify-center text-gray-300 mb-1">{icon}</div>}
      <h4 className="font-bold text-gray-700 text-sm">{title}</h4>
      {text && <p className="text-xs text-gray-500 max-w-sm mx-auto">{text}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-3">
      <AlertCircle size={30} className="text-rose-500 mx-auto" />
      <p className="text-sm text-rose-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-100 text-xs font-bold text-rose-700">
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadMore({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
  return (
    <div className="text-center pt-2">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-xs font-bold text-gray-700 shadow-sm"
      >
        {isLoading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  );
}

/** Field-level error text under an input. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-rose-500 font-semibold mt-1">{message}</p>;
}

/** "$12.50" */
export const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

/** "Under 1 km" / "3.2 km" */
export const distanceLabel = (km?: number) => (km === undefined ? '' : km < 1 ? 'Under 1 km' : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);

export const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

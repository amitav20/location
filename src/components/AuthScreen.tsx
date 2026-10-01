/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api, ApiError, Place } from '../api';
import { User } from '../types';
import { toast } from './Toaster';
import { LocationSearch } from './common/LocationSearch';
import { Avatar, FieldError, errorText } from './common/ui';
import { ArrowLeft, Compass, MapPin, MessageSquare, Shield, Store } from 'lucide-react';

interface AuthScreenProps {
  onSignedIn: (user: User) => void;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const DEMO_PASSWORD = 'password';

const DEMO_ACCOUNTS = [
  { username: 'sarah_j', name: 'Sarah', note: 'Friends, chats, events', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop' },
  { username: 'marcus_b', name: 'Marcus', note: 'Owns a café shop', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop' },
  { username: 'alex_rivera', name: 'Alex', note: 'Has an order', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop' },
  { username: 'admin', name: 'Admin', note: 'Moderation', photo: '' }
];

const AVATARS = [
  { label: 'Creative', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { label: 'Engineer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { label: 'Artist', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { label: 'Founder', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
];

const FEATURES = [
  { icon: <Compass size={18} />, title: 'Nearby Map', text: 'See neighbors, shops and events around you on a live map.' },
  { icon: <MessageSquare size={18} />, title: 'Direct Messaging', text: 'Chat one-to-one or in groups with people nearby.' },
  { icon: <Store size={18} />, title: 'Storefronts', text: 'Publish your shop, list products and take local orders.' },
  { icon: <Shield size={18} />, title: 'Safe Community', text: 'Reporting, blocking, moderation and verified businesses.' }
];

const inputClass =
  'w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold placeholder-slate-500';
const labelClass = 'text-xs text-slate-400 font-extrabold uppercase tracking-wider block mb-1';
const primaryButton =
  'w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-900/30';

/** The page opened from a password-reset email: /reset-password?token=...&email=... */
function readResetLink(): { token: string; email: string } | null {
  if (window.location.pathname !== '/reset-password') return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  return token ? { token, email: params.get('email') || '' } : null;
}

// Sign in / sign up / forgot password, shown when nobody is signed in
export function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const resetLink = readResetLink();
  const [mode, setMode] = useState<Mode>(resetLink ? 'reset' : 'login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [regPhoto, setRegPhoto] = useState('');
  const [startPlace, setStartPlace] = useState<Place>({
    name: 'San Francisco',
    displayName: 'San Francisco, California, United States',
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    state: 'California',
    country: 'United States'
  });

  const [resetEmail, setResetEmail] = useState(resetLink?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [forgotSent, setForgotSent] = useState('');

  const switchMode = (m: Mode) => {
    setErrors({});
    setForgotSent('');
    setMode(m);
  };

  /** Runs a form action; validation errors from the API are shown under their fields. */
  const submit = async (action: () => Promise<void>, fallback: string) => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      toast.error(errorText(err, fallback));
    } finally {
      setIsSubmitting(false);
    }
  };

  const signIn = (user: string, pass: string) =>
    submit(async () => {
      onSignedIn(await api.login(user, pass));
    }, 'Sign in failed.');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    submit(async () => {
      onSignedIn(
        await api.register({
          name: regName,
          username: regUsername,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          dob: regDob,
          gender: regGender,
          avatar: regPhoto,
          latitude: startPlace.latitude,
          longitude: startPlace.longitude,
          city: startPlace.city || startPlace.name,
          state: startPlace.state,
          country: startPlace.country
        })
      );
    }, 'Sign up failed.');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    submit(async () => {
      setForgotSent(await api.forgotPassword(resetEmail));
    }, 'Could not send the email.');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetLink) return;
    submit(async () => {
      const message = await api.resetPassword(resetLink.token, resetEmail, newPassword);
      toast.success(`${message} Please sign in.`);
      window.history.replaceState(null, '', '/');
      setPassword('');
      switchMode('login');
    }, 'Could not reset the password.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-gray-200 overflow-hidden relative selection:bg-teal-500 selection:text-white">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Left: intro (hidden on phones) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-950/70 p-12 lg:p-16 flex-col justify-between h-screen border-r border-slate-800/80 relative z-10 backdrop-blur-3xl overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg shadow-lg shadow-teal-600/20">G</div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white leading-none">GeoConnect</h2>
            <span className="text-xs text-teal-400 font-bold uppercase tracking-widest mt-1 block">Local Social Network</span>
          </div>
        </div>

        <div className="my-auto max-w-xl py-8">
          <span className="text-teal-400 text-xs uppercase font-extrabold tracking-widest bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800/50 inline-block mb-4">
            Meet your neighborhood
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-6">
            Connect with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">Neighbors & Partners</span> Nearby.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed font-medium mb-10">
            GeoConnect shows you the people, shops and events around you. Share posts with your neighborhood, chat, join local events and order from nearby stores.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">{f.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">{f.title}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Connect with people near you</span>
          <span>© 2026 GeoConnect</span>
        </div>
      </div>

      {/* Right: forms */}
      <div className="flex-1 p-4 sm:p-12 lg:p-16 flex flex-col justify-center items-center min-h-screen md:h-screen overflow-y-auto relative z-10 bg-slate-900/45 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-6 md:hidden">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">G</div>
          <h1 className="text-base font-black text-white font-display">GeoConnect</h1>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-6 sm:p-10 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest font-display text-teal-400">
              {{ login: 'Welcome back', register: 'Create your account', forgot: 'Forgot password', reset: 'Choose a new password' }[mode]}
            </h3>
            <p className="text-slate-400 text-xs font-medium mt-1">
              {{
                login: 'Sign in to see what is happening near you.',
                register: 'It only takes a minute.',
                forgot: "Enter your email and we'll send you a link to reset your password.",
                reset: 'Enter your email and a new password.'
              }[mode]}
            </p>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800/50">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-widest transition-all rounded-xl ${
                    mode === m ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'login' && (
            <>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-teal-400 font-extrabold uppercase tracking-wider block">Try a demo account:</span>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setLogin(demo.username);
                        setPassword(DEMO_PASSWORD);
                        signIn(demo.username, DEMO_PASSWORD);
                      }}
                      className="p-2 bg-slate-950/80 border border-slate-800 hover:border-teal-500 disabled:opacity-60 rounded-xl text-xs text-slate-300 hover:text-white transition-all text-left flex items-center gap-2"
                    >
                      <Avatar src={demo.photo} name={demo.name} className="w-7 h-7 rounded-full" />
                      <span className="min-w-0">
                        <span className="font-bold block truncate">{demo.name}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{demo.note}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Demo accounts use the password <code className="text-slate-300">{DEMO_PASSWORD}</code>.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  signIn(login, password);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className={labelClass} htmlFor="login">Email or username</label>
                  <input id="login" type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g. sarah_j" autoComplete="username" className={`${inputClass} p-3`} required />
                  <FieldError message={errors.login} />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <label className={labelClass} htmlFor="password">Password</label>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-[11px] text-teal-400 hover:text-teal-300 font-bold mb-1">
                      Forgot password?
                    </button>
                  </div>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className={`${inputClass} p-3`} required />
                  <FieldError message={errors.password} />
                </div>
                <button type="submit" disabled={isSubmitting} className={primaryButton}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass} htmlFor="reg-name">Full name</label>
                  <input id="reg-name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Jordan River" className={inputClass} maxLength={60} required />
                  <FieldError message={errors.name} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-username">Username</label>
                  <input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. jordan_r"
                    pattern="[A-Za-z0-9_.]{3,30}"
                    title="3-30 letters, numbers, dots or underscores"
                    autoComplete="username"
                    className={inputClass}
                    required
                  />
                  <FieldError message={errors.username} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-email">Email</label>
                  <input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="jordan@domain.com" autoComplete="email" className={inputClass} required />
                  <FieldError message={errors.email} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-password">Password</label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                    required
                  />
                  <FieldError message={errors.password} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-phone">Mobile (optional)</label>
                  <input id="reg-phone" type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+1 555 123 4567" className={inputClass} maxLength={20} />
                  <FieldError message={errors.phone} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-dob">Date of birth (optional)</label>
                  <input id="reg-dob" type="date" value={regDob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setRegDob(e.target.value)} className={inputClass} />
                  <FieldError message={errors.date_of_birth} />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="reg-gender">Gender (optional)</label>
                <select id="reg-gender" value={regGender} onChange={(e) => setRegGender(e.target.value as typeof regGender)} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <span className={labelClass}>Profile photo</span>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.url}
                      type="button"
                      onClick={() => setRegPhoto(regPhoto === av.url ? '' : av.url)}
                      className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 bg-slate-900/40 ${
                        regPhoto === av.url ? 'border-teal-400 bg-teal-950/20' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-[11px] font-bold text-slate-400 truncate w-full text-center">{av.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={regPhoto}
                  onChange={(e) => setRegPhoto(e.target.value)}
                  placeholder="Or paste an image link (you can upload one after signing up)"
                  className={`${inputClass} font-mono text-[11px]`}
                />
                <FieldError message={errors.avatar} />
              </div>

              <div className="bg-teal-950/40 p-3 rounded-2xl border border-teal-900/50 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-teal-400 text-xs">
                  <MapPin size={12} /> Starting location
                </div>
                <p className="text-[11px] text-teal-200">
                  <strong className="text-white">{[startPlace.city || startPlace.name, startPlace.state].filter(Boolean).join(', ')}</strong>{' '}
                  <span className="text-teal-400/70 font-mono">
                    ({startPlace.latitude.toFixed(3)}, {startPlace.longitude.toFixed(3)})
                  </span>
                </p>
                <LocationSearch dark onSelect={setStartPlace} />
              </div>

              <button type="submit" disabled={isSubmitting} className={primaryButton}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4 text-xs">
              {forgotSent ? (
                <p className="bg-teal-950/50 border border-teal-800/60 text-teal-200 rounded-xl p-3 leading-relaxed">{forgotSent}</p>
              ) : (
                <>
                  <div>
                    <label className={labelClass} htmlFor="forgot-email">Email</label>
                    <input id="forgot-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" className={`${inputClass} p-3`} required />
                    <FieldError message={errors.email} />
                  </div>
                  <button type="submit" disabled={isSubmitting} className={primaryButton}>
                    {isSubmitting ? 'Sending...' : 'Send reset link'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => switchMode('login')} className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1">
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4 text-xs">
              <div>
                <label className={labelClass} htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" className={`${inputClass} p-3`} required />
                <FieldError message={errors.email} />
              </div>
              <div>
                <label className={labelClass} htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`${inputClass} p-3`}
                  required
                />
                <FieldError message={errors.password} />
              </div>
              <button type="submit" disabled={isSubmitting} className={primaryButton}>
                {isSubmitting ? 'Saving...' : 'Set new password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState(null, '', '/');
                  switchMode('login');
                }}
                className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-[11px] font-mono text-slate-500 text-center max-w-sm">Your location is used to show people, shops and events near you.</p>
      </div>
    </div>
  );
}

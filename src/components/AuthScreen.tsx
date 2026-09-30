/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api, Place } from '../api';
import { User } from '../types';
import { toast } from './Toaster';
import { LocationSearch } from './common/LocationSearch';
import { Compass, MapPin, MessageSquare, Shield, Store } from 'lucide-react';

interface AuthScreenProps {
  onSignedIn: (user: User) => void;
}

const DEMO_PASSWORD = 'password';

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
  'w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold';
const labelClass = 'text-xs text-slate-400 font-extrabold uppercase tracking-wider block mb-1';

// Sign in / sign up page shown when nobody is logged in
export function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other'>('Other');
  const [regPhoto, setRegPhoto] = useState('');
  const [startPlace, setStartPlace] = useState<Place>({
    name: 'New York',
    displayName: 'New York, United States',
    latitude: 40.7128,
    longitude: -74.006,
    city: 'New York',
    state: 'New York',
    country: 'United States'
  });

  const signIn = async (user: string, pass: string) => {
    setIsSubmitting(true);
    try {
      const data = await api.login(user, pass);
      onSignedIn(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await api.register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        mobile: regPhone,
        dob: regDob || undefined,
        gender: regGender,
        profilePhoto: regPhoto,
        latitude: startPlace.latitude,
        longitude: startPlace.longitude,
        city: startPlace.city || startPlace.name,
        state: startPlace.state,
        country: startPlace.country
      });
      onSignedIn(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed.');
    } finally {
      setIsSubmitting(false);
    }
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
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h3>
            <p className="text-slate-400 text-xs font-medium mt-1">
              {mode === 'login' ? 'Sign in to see what is happening near you.' : 'It only takes a minute.'}
            </p>
          </div>

          <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800/50">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-widest transition-all rounded-xl ${
                  mode === m ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-teal-400 font-extrabold uppercase tracking-wider block">Try a demo account:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { username: 'sarah_j', name: 'Sarah J.', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50' },
                    { username: 'admin', name: 'Admin', photo: '' }
                  ].map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setUsername(demo.username);
                        setPassword(DEMO_PASSWORD);
                        signIn(demo.username, DEMO_PASSWORD);
                      }}
                      className="p-2 bg-slate-950/80 border border-slate-800 hover:border-teal-500 rounded-xl text-xs text-slate-300 hover:text-white transition-all text-left flex items-center gap-2"
                    >
                      {demo.photo ? (
                        <img src={demo.photo} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-400 shrink-0 flex items-center justify-center font-black text-[11px]">A</span>
                      )}
                      <span className="min-w-0">
                        <span className="font-bold block truncate">{demo.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{demo.username}</span>
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
                  signIn(username, password);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className={labelClass}>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. sarah_j" autoComplete="username" className={`${inputClass} p-3`} required />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className={`${inputClass} p-3`} required />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-900/30"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Jordan River" className={inputClass} maxLength={60} required />
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. jordan_r"
                    pattern="[A-Za-z0-9_.]{3,20}"
                    title="3-20 letters, numbers, dots or underscores"
                    autoComplete="username"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="jordan@domain.com" autoComplete="email" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Mobile (optional)</label>
                  <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+1 555 123 4567" className={inputClass} maxLength={20} />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth (optional)</label>
                  <input type="date" value={regDob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setRegDob(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select value={regGender} onChange={(e) => setRegGender(e.target.value as 'Male' | 'Female' | 'Other')} className={inputClass}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / prefer not to say</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Profile Photo</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.url}
                      type="button"
                      onClick={() => setRegPhoto(av.url)}
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-900/30"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-[11px] font-mono text-slate-500 text-center max-w-sm">
          Your location is used to show people, shops and events near you.
        </p>
      </div>
    </div>
  );
}

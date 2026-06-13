/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './api';
import { User, Notification } from './types';
import { motion, AnimatePresence } from 'motion/react';

// Sub panels imports
import { InteractiveMap } from './components/InteractiveMap';
import { FeedPanel } from './components/FeedPanel';
import { PeoplePanel } from './components/PeoplePanel';
import { BusinessPanel } from './components/BusinessPanel';
import { EventsPanel } from './components/EventsPanel';
import { ChatPanel } from './components/ChatPanel';
import { AdminPanel } from './components/AdminPanel';

import {
  Compass,
  Rss,
  Users,
  Store,
  Calendar,
  MessageSquare,
  Shield,
  MapPin,
  Bell,
  User as UserIcon,
  LogOut,
  Edit2,
  ChevronDown,
  Navigation,
  Globe,
  Star,
  Settings,
  Heart,
  CalendarDays,
  Briefcase
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [loading, setLoading] = useState<boolean>(true);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Authentications modal triggers
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // Register Fields
  const [regName, setRegName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regDob, setRegDob] = useState<string>('');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [regPhoto, setRegPhoto] = useState<string>('');

  // GPS Teleporter setup
  const [showGpsTeleporter, setShowGpsTeleporter] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<string>('40.7128');
  const [customLng, setCustomLng] = useState<string>('-74.0060');
  const [customCity, setCustomCity] = useState<string>('New York');
  const [customState, setCustomState] = useState<string>('NY');

  // Edit profile states
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editBio, setEditBio] = useState<string>('');
  const [editInterests, setEditInterests] = useState<string>('');
  const [editProfession, setEditProfession] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editPhoto, setEditPhoto] = useState<string>('');

  const fetchSessionUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      
      // Seed original editing fields
      if (user) {
        setEditBio(user.bio || '');
        setEditInterests((user.interests || []).join(', '));
        setEditProfession(user.profession || '');
        setEditWebsite(user.website || '');
        setEditPhoto(user.profilePhoto || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessionUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const notifLoop = setInterval(fetchNotifications, 5000);
      return () => clearInterval(notifLoop);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;
    try {
      const data = await api.login(usernameInput, passwordInput);
      setCurrentUser(data.user);
      setShowAuthModal(false);
      setUsernameInput('');
      setPasswordInput('');
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regEmail || !regName) return;
    try {
      const data = await api.register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        mobileNumber: regPhone,
        dateOfBirth: regDob || '1995-10-10',
        gender: regGender,
        profilePhoto: regPhoto,
        latitude: parseFloat(customLat),
        longitude: parseFloat(customLng),
        city: customCity,
        state: customState,
        country: 'USA'
      });
      setCurrentUser(data.user);
      setShowAuthModal(false);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Registration failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setActiveTab('map');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTeleport = async (lat: number, lng: number, city: string, state: string) => {
    setLoading(true);
    try {
      const updated = await api.updateLocation(lat, lng, city, state);
      setCurrentUser(updated.user);
      setShowGpsTeleporter(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const list = editInterests.split(',').map((i) => i.trim()).filter(Boolean);
      const updated = await api.updateProfile({
        bio: editBio,
        interests: list,
        profession: editProfession,
        website: editWebsite,
        profilePhoto: editPhoto
      });
      setCurrentUser(updated.user);
      setShowProfileModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissNotification = async (notifId: string) => {
    setNotifications(notifications.filter((n) => n.id !== notifId));
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const quickGPSPresets = [
    { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060, label: '🇺🇸 NY' },
    { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194, label: '🇺🇸 SF' },
    { city: 'London', state: 'ENG', lat: 51.5074, lng: -0.1278, label: '🇬🇧 LDN' },
    { city: 'Paris', state: 'IDF', lat: 48.8566, lng: 2.3522, label: '🇫🇷 PAR' },
    { city: 'Tokyo', state: 'TYO', lat: 35.6762, lng: 139.6503, label: '🇯🇵 TKY' }
  ];

  const sidebarTabs = [
    { id: 'map', label: 'Spatial Map', icon: <Compass size={17} /> },
    { id: 'feed', label: 'News Feed', icon: <Rss size={17} /> },
    { id: 'people', label: 'Peers Discovery', icon: <Users size={17} /> },
    { id: 'business', label: 'Local Shops', icon: <Store size={17} /> },
    { id: 'events', label: 'Gather Events', icon: <Calendar size={17} /> },
    { id: 'chat', label: 'Messages', icon: <MessageSquare size={17} /> },
    ...(currentUser?.role === 'admin' ? [{ id: 'admin', label: 'Moderator Board', icon: <Shield size={17} /> }] : [])
  ];

  const triggerDemoLogin = async (username: string) => {
    try {
      setLoading(true);
      const data = await api.login(username, 'password');
      setCurrentUser(data.user);
      
      // Seed original editing fields
      if (data.user) {
        setEditBio(data.user.bio || '');
        setEditInterests((data.user.interests || []).join(', '));
        setEditProfession(data.user.profession || '');
        setEditWebsite(data.user.website || '');
        setEditPhoto(data.user.profilePhoto || '');
      }
      
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans antialiased text-white">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
          <div className="absolute text-xs text-teal-400 font-bold font-mono">G</div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-400 font-mono mt-4 animate-pulse">Initializing Spatial Nodes...</p>
      </div>
    );
  }

  if (!currentUser) {
    // Show Full-Screen Login & Registration Gateway Page
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-gray-200 overflow-hidden relative selection:bg-teal-500 selection:text-white">
        
        {/* Soft background decor blur bubbles */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* LEFT COLUMN: HERO SPECS PANEL (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-950/70 p-12 lg:p-16 flex-col justify-between h-screen border-r border-slate-800/80 relative z-10 backdrop-blur-3xl overflow-y-auto">
          
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-lg tracking-tight shadow-lg shadow-teal-600/20 animate-pulse">
              G
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white leading-none">GeoConnect</h2>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mt-1 block">Spatial Peer Networking</span>
            </div>
          </div>

          {/* Core Feature Text Blocks */}
          <div className="my-auto max-w-xl py-8">
            <span className="text-teal-400 text-xs uppercase font-extrabold tracking-widest bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800/50 inline-block mb-4">
              Version 1.4-Global Node
            </span>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-6">
              Connect with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">Neighbors & Partners</span> Nearby.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed font-medium mb-10">
              GeoConnect indexes real-world coordinates and translates physical distance into digital proximity. Explore social threads, nearby local stores, secure peer-to-peer discussions, and neighborhood-scoped gatherings instantly.
            </p>

            {/* Quick feature grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Spatial Proximity</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">Interactive GPS map of surrounding peer residents and active stores.</p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Direct Messaging</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">Real-time localized chat channels and private groups with neighboring nodes.</p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Storefronts</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">Publish your shop catalog, list inventory items, and coordinate nearby customer orders.</p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Verified Nodes</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">Built-in moderator audits, user report resolutions, and business verification rules.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Spatial Status Indicators footer */}
          <div className="pt-6 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Spatial Node: Standard Secure Gateway</span>
            </div>
            <span>© 2026 GeoConnect System</span>
          </div>
        </div>

        {/* RIGHT COLUMN: REVERSIBLE FORM BODY */}
        <div className="flex-1 p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center h-screen overflow-y-auto relative z-10 bg-slate-900/45 backdrop-blur-md">
          
          {/* Logo on small devices */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">G</div>
            <h1 className="text-base font-black text-white font-display">GeoConnect</h1>
          </div>

          {/* Main Glass Form Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-8 sm:p-10 rounded-3xl w-full max-w-sm shadow-2xl space-y-6">
            
            {/* Headers titles switch mode tabs */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-black text-white uppercase tracking-widest font-display text-teal-400">
                  {authMode === 'login' ? 'Gateway Authorization' : 'Deploy Digital Node'}
                </h3>
              </div>
              <p className="text-slate-400 text-xs font-medium">
                {authMode === 'login' 
                  ? 'Sign in to access local proximity alerts, map filters, and chat.' 
                  : 'Create an independent map profile and register your coordinates.'}
              </p>
            </div>

            {/* Slider Switch Tab Buttons */}
            <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800/50">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-widest transition-all rounded-xl ${
                  authMode === 'login' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-550 hover:text-slate-350'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-extrabold uppercase tracking-widest transition-all rounded-xl ${
                  authMode === 'register' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-550 hover:text-slate-355'
                }`}
              >
                Create Node
              </button>
            </div>

            {/* QUICK DEMO SEED USERS - EXTREMELY HELPFUL & POLISHED */}
            {authMode === 'login' && (
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-wider block">⚡ Quick Demo Single-Click Entry:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUsernameInput('sarah_j');
                      setPasswordInput('password');
                      // Auto trigger submit
                      triggerDemoLogin('sarah_j');
                    }}
                    className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-teal-500 rounded-xl text-[11px] text-slate-300 hover:text-white transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-750">
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50" alt="Sarah" className="w-full h-full object-cover"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate leading-none">Sarah J.</p>
                      <p className="text-[8px] text-slate-500 mt-0.5 font-mono">sarah_j</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsernameInput('admin');
                      setPasswordInput('admin');
                      // Auto trigger submit
                      triggerDemoLogin('admin');
                    }}
                    className="p-1.5 bg-slate-950/80 border border-slate-800 hover:border-teal-500 rounded-xl text-[11px] text-slate-300 hover:text-white transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-400 shrink-0 flex items-center justify-center font-black text-[9px] border border-teal-800/50">
                      SA
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate leading-none">Admin Node</p>
                      <p className="text-[8px] text-slate-400 mt-0.5 font-mono">admin</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* AUTH ACTIONS FORM */}
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4 text-xs text-slate-200">
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1.5">Username</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. sarah_j"
                    className="w-full text-xs rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 outline-none text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1.5">Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 outline-none text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 active:translate-y-[0.5px] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-900/30 font-display cursor-pointer"
                >
                  Authorize Profile Gateway
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5 text-xs text-slate-300 max-h-[440px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jordan River"
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Username</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. jordan_r"
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Email Account</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jordan@domain.com"
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Password</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+155512398"
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-white focus:ring-1 focus:ring-teal-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 outline-none text-slate-350 focus:ring-1 focus:ring-teal-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Avatar Portrait with Interactive Seeds! */}
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Avatar Visual Identity</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { label: 'Creative', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
                      { label: 'Engineer', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
                      { label: 'Artist', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
                      { label: 'Founder', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
                    ].map((av, avIdx) => {
                      const isSelected = regPhoto === av.url;
                      return (
                        <button
                          key={avIdx}
                          type="button"
                          onClick={() => setRegPhoto(av.url)}
                          className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer bg-slate-900/40 relative ${
                            isSelected ? 'border-teal-400 bg-teal-950/20 shadow' : 'border-slate-850 hover:border-slate-705'
                          }`}
                        >
                          <img src={av.url} alt={av.label} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700" />
                          <span className="text-[8.5px] font-bold text-slate-400 leading-none truncate w-full">{av.label}</span>
                          {isSelected && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-teal-400 border border-slate-900"></span>}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={regPhoto}
                    onChange={(e) => setRegPhoto(e.target.value)}
                    placeholder="Or paste custom Portrait URL..."
                    className="w-full text-[11px] rounded-xl border border-slate-800 bg-slate-900/60 p-2 outline-none text-slate-300 focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                {/* Simulated Geolocation Anchor Info */}
                <div className="bg-teal-950/40 p-3 rounded-2xl border border-teal-900/50 text-[11px] text-teal-300 leading-relaxed font-semibold">
                  <div className="flex items-center gap-1.5 font-bold text-teal-400 text-xs mb-1">
                    <MapPin size={12} />
                    <span>Spatial GPS Position Defined</span>
                  </div>
                  Pinned to simulated GPS: <strong className="text-white font-bold">{customCity}, {customState}</strong> ({customLat}, {customLng}) set during teleportation control.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-900/30 cursor-pointer mt-2"
                >
                  Create & Deploy Live Node
                </button>
              </form>
            )}

          </div>

          {/* Toggle Info message */}
          <div className="mt-6 text-[11px] font-mono text-slate-500 text-center max-w-sm">
            Deploying a node establishes a geographical anchor point in our system index, enabling real-time distance calculations for surrounding records.
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
      
      {/* GLOBAL TOP NAV BAR */}
      <header className="bg-white border-b border-gray-150 py-3.5 px-4 sm:px-6 sticky top-0 z-40 shadow-xs flex items-center justify-between gap-4">
        
        {/* Brand details logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold tracking-tight font-display shadow-sm">
            G
          </div>
          <div>
            <h1 className="text-sm font-bold font-display tracking-tight text-gray-900 leading-none">GeoConnect</h1>
            <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider mt-1 block">Spatial Peer Networking</span>
          </div>
        </div>

        {/* GPS location telemetry controller bar */}
        <div className="hidden md:flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-2xl border border-gray-150 max-w-sm">
          <MapPin size={14} className="text-teal-600 animate-pulse" />
          <div className="text-left">
            <span className="text-[9.5px] text-gray-400 font-bold block leading-none uppercase">Geo GPS Anchor:</span>
            <span className="text-xs font-bold text-gray-700 leading-none mt-1 block">
              {currentUser?.city || 'Simulating Coordinates'}, {currentUser?.state || 'NY'}
            </span>
          </div>

          <button
            onClick={() => setShowGpsTeleporter(!showGpsTeleporter)}
            className="ml-3 p-1 rounded-lg hover:bg-gray-200 text-teal-600"
            title="Teleport coordinates GPS"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* System Toolbar Actions (Notification panel + Account avatar modal controller) */}
        <div className="flex items-center gap-3">
          
          {/* Notifications Dropdown trigger */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-600 text-gray-550 border border-gray-150 flex items-center justify-center transition-all relative"
              >
                <Bell size={18} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 font-bold font-mono text-[9.5px] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-gray-150 shadow-xl overflow-hidden z-50 text-xs"
                  >
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center font-bold">
                      <span className="text-gray-700 font-display">Spatial Alerts ({notifications.length})</span>
                      <button
                        onClick={handleMarkNotificationsRead}
                        className="text-[10px] text-teal-600 hover:text-teal-800"
                      >
                        Clear All Unreads
                      </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-gray-400 font-medium">Notification inbox is clear.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-3 flex gap-2.5 items-start transition-colors ${notif.isRead ? 'bg-white' : 'bg-teal-50/20'}`}>
                            <div className="flex-1">
                              <p className="text-xs text-gray-650 leading-relaxed font-semibold">{notif.title}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">{notif.message}</p>
                              <span className="text-[9px] text-gray-300 font-mono block mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDismissNotification(notif.id)}
                              className="text-gray-300 hover:text-red-500 text-[10px] p-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Account profile menu bubble */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 cursor-pointer bg-gray-50 px-2 sm:px-3 py-1.5 rounded-2xl border border-gray-150 hover:border-teal-200 transition-all"
              >
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-xl object-cover bg-gray-200 shrink-0 border border-white"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-gray-800 block leading-none">{currentUser.name}</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5 block font-bold">
                    {currentUser.role || 'Member'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-150 text-gray-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-all"
                title="Log Out Session"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserIcon size={14} /> Join Gateway
            </button>
          )}

        </div>
      </header>

      {/* --- TELEPATH GPS TELEPORTER TOOLBAR DRAWER --- */}
      <AnimatePresence>
        {showGpsTeleporter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 shadow-sm overflow-hidden z-20"
          >
            <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left w-full md:w-auto">
                <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600">Location Teleporter Sim</h4>
                <p className="text-[11px] text-gray-400 mt-1">Simulate movement coordinates globally. The workspace re-calculates all proximity listings instantly.</p>
              </div>

              {/* Presets lists */}
              <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                {quickGPSPresets.map((pr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTeleport(pr.lat, pr.lng, pr.city, pr.state)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-150 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-xs font-bold transition-all text-gray-650"
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              {/* Exact customized values selector input */}
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="City"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  className="w-24 text-xs rounded-xl border border-gray-150 bg-gray-50 p-2 text-gray-700"
                />
                <input
                  type="text"
                  placeholder="Lat"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-20 text-xs rounded-xl border border-gray-150 bg-gray-50 p-2 text-gray-700 font-mono"
                />
                <input
                  type="text"
                  placeholder="Lng"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="w-20 text-xs rounded-xl border border-gray-150 bg-gray-50 p-2 text-gray-700 font-mono"
                />
                <button
                  onClick={() => handleTeleport(parseFloat(customLat), parseFloat(customLng), customCity, customState)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-700"
                >
                  Teleport
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN APPLICATION FRAME LAYOUT --- */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* RESPONSIVE NAVIGATION LEFTPANEL SIDEBAR */}
        <nav className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-150 p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto shrink-0 md:h-[calc(100vh-61px)] sticky top-[61px] z-10 md:z-auto">
          {sidebarTabs.map((tab) => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 md:w-full ${
                  isAct
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ACTIVE MAIN CANVAS COMPONENT PORT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-x-hidden min-h-[calc(100vh-140px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'map' && (
                <InteractiveMap
                  currentUser={currentUser}
                  onRelocate={handleTeleport}
                  setAppView={(view, targetId) => {
                    setActiveTab(view);
                  }}
                />
              )}

              {activeTab === 'feed' && (
                <FeedPanel
                  currentUser={currentUser}
                  setAppView={(view, targetId) => {
                    setActiveTab(view);
                  }}
                  triggerNotificationRefresh={fetchNotifications}
                />
              )}

              {activeTab === 'people' && (
                <PeoplePanel
                  currentUser={currentUser}
                  setAppView={(view, targetId) => {
                    setActiveTab(view);
                  }}
                  triggerNotificationRefresh={fetchNotifications}
                />
              )}

              {activeTab === 'business' && (
                <BusinessPanel
                  currentUser={currentUser}
                  setAppView={(view, targetId) => {
                    setActiveTab(view);
                  }}
                  triggerNotificationRefresh={fetchNotifications}
                />
              )}

              {activeTab === 'events' && (
                <EventsPanel
                  currentUser={currentUser}
                  triggerNotificationRefresh={fetchNotifications}
                />
              )}

              {activeTab === 'chat' && (
                <ChatPanel
                  currentUser={currentUser}
                  triggerNotificationRefresh={fetchNotifications}
                />
              )}

              {activeTab === 'admin' && currentUser?.role === 'admin' && (
                <AdminPanel />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>


      {/* ACCOUNT & COMPASS CREDENTIALS SIGN-IN GATEWAY MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1 bg-gray-50 rounded"
            >
              ✕
            </button>

            {/* Selection modes */}
            <div className="flex gap-2 border-b border-gray-100 pb-3 mb-4">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 text-xs font-bold uppercase transition-all ${
                  authMode === 'login' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'
                }`}
              >
                Sign In / Login
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-1.5 text-xs font-bold uppercase transition-all ${
                  authMode === 'register' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3 text-xs text-gray-700">
                <div>
                  <p className="text-[10px] text-teal-600 font-semibold mb-2 bg-teal-50 p-2 rounded-lg leading-relaxed">
                    🌟 Admin login badge seed: Use username &ldquo;admin&rdquo; and password &ldquo;admin&rdquo; to test spatial super-admin moderator dashboards!
                  </p>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Username</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. jason_l"
                    className="w-full text-xs rounded-xl border border-gray-150 bg-gray-50 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Secret Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs rounded-xl border border-gray-150 bg-gray-50 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md mt-4"
                >
                  Authorize Profile
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-2 text-xs text-gray-600 overflow-y-auto max-h-[460px] p-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Full Name</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jordan Cooper"
                      className="w-full text-xs rounded-lg border border-gray-150 bg-gray-50 p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Username</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="j_cooper"
                      className="w-full text-xs rounded-lg border border-gray-150 bg-gray-50 p-2"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Email Account</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Secret Password</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Mobile Number</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Date of Birth</label>
                    <input
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5 text-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Gender Preference</label>
                    <select
                      value={regGender}
                      onChange={(e: any) => setRegGender(e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5 text-gray-650"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Profile Picture URL</label>
                    <input
                      type="text"
                      value={regPhoto}
                      onChange={(e) => setRegPhoto(e.target.value)}
                      placeholder="Paste portrait photo URL..."
                      className="w-full text-[11px] rounded-lg border border-gray-150 bg-gray-50 p-1.5"
                    />
                  </div>
                </div>

                {/* Simulated Geolocation verification message */}
                <div className="bg-teal-50 p-2.5 rounded-2xl border border-teal-150 text-[10.5px] text-teal-800 leading-snug">
                  📌 Registration auto-pins your spatial GPS coordinates inside {customCity}, {customState} ({customLat}, {customLng}) set during teleportation!
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md mt-3"
                >
                  Create Live GPS Account
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE CONFIGURATION MODAL */}
      {showProfileModal && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800 font-display">Configure Spatial Profile</h3>
            <p className="text-xs text-gray-400">Enhance your surrounding bio to attract fellow peers nearby.</p>
            
            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Avatar Portrait Photo URL</label>
                <input
                  type="text"
                  value={editPhoto}
                  onChange={(e) => setEditPhoto(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Profession / Status</label>
                <input
                  type="text"
                  placeholder="e.g. Fullstack Developer"
                  value={editProfession}
                  onChange={(e) => setEditProfession(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Interests tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. coffee, hiking, yoga"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">About Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FOOTER STRIP */}
      <footer className="bg-white border-t border-gray-150 py-3 py-4 text-center text-[10px] text-gray-400 font-mono select-none">
        <div>GeoConnect Spatial Node Map © 2026. All simulated components live on-chain.</div>
      </footer>
    </div>
  );
}

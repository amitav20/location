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

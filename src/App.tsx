/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, Place, setUnauthorizedHandler } from './api';
import { timeAgo } from './utils/time';
import { toast } from './components/Toaster';
import { AuthScreen } from './components/AuthScreen';
import { MediaInput } from './components/common/MediaInput';
import { LocationSearch } from './components/common/LocationSearch';
import { User, Notification } from './types';
import { Bell, Calendar, ChevronDown, Compass, LogOut, MapPin, MessageSquare, Rss, Settings, Shield, Store, Users, X } from 'lucide-react';

// Pages are loaded on first visit to keep the initial download small
const InteractiveMap = lazy(() => import('./components/InteractiveMap').then((m) => ({ default: m.InteractiveMap })));
const FeedPanel = lazy(() => import('./components/FeedPanel').then((m) => ({ default: m.FeedPanel })));
const PeoplePanel = lazy(() => import('./components/PeoplePanel').then((m) => ({ default: m.PeoplePanel })));
const BusinessPanel = lazy(() => import('./components/BusinessPanel').then((m) => ({ default: m.BusinessPanel })));
const EventsPanel = lazy(() => import('./components/EventsPanel').then((m) => ({ default: m.EventsPanel })));
const ChatPanel = lazy(() => import('./components/ChatPanel').then((m) => ({ default: m.ChatPanel })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const ProfilePanel = lazy(() => import('./components/ProfilePanel').then((m) => ({ default: m.ProfilePanel })));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then((m) => ({ default: m.SettingsPanel })));

const LOCATION_PRESETS = [
  { city: 'New York', state: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, label: '🇺🇸 New York' },
  { city: 'San Francisco', state: 'California', country: 'United States', lat: 37.7749, lng: -122.4194, label: '🇺🇸 San Francisco' },
  { city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, label: '🇬🇧 London' },
  { city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8566, lng: 2.3522, label: '🇫🇷 Paris' },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, label: '🇯🇵 Tokyo' }
];

function PageLoader() {
  return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

/** Turns a notification's link ("chat:<id>", "profile:<id>", "events", ...) into a page + target. */
function notificationTarget(n: Notification): { view: string; target?: string } {
  const link = n.link || '';
  if (link.startsWith('/chat/')) return { view: 'chat', target: link.slice(6) }; // older notifications
  if (link === '/events') return { view: 'events' };
  const sep = link.indexOf(':');
  const view = sep === -1 ? link : link.slice(0, sep);
  const target = sep === -1 ? undefined : link.slice(sep + 1);
  if (view === 'post') return { view: 'feed', target };
  if (view) return { view, target };

  // Fallback by type for notifications without a link
  switch (n.type) {
    case 'message':
      return { view: 'chat' };
    case 'friend_request':
    case 'friend_accept':
    case 'follow':
      return { view: 'profile', target: n.senderId };
    case 'event_invite':
      return { view: 'events' };
    case 'business_update':
      return { view: 'business' };
    default:
      return { view: 'feed' };
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRelocating, setIsRelocating] = useState<boolean>(false);

  // Navigation: the active page plus an optional target (a user, chat thread, shop, post...)
  const [activeTab, setActiveTab] = useState<string>('map');
  const [viewTarget, setViewTarget] = useState<string | undefined>();
  const [tabBeforeProfile, setTabBeforeProfile] = useState<string>('feed');

  const setAppView = useCallback(
    (view: string, targetId?: string) => {
      if (view === 'profile') {
        if (!targetId) return;
        if (activeTab !== 'profile') setTabBeforeProfile(activeTab);
      }
      setViewTarget(targetId);
      setActiveTab(view);
    },
    [activeTab]
  );

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Location drawer
  const [showLocationDrawer, setShowLocationDrawer] = useState<boolean>(false);

  // Edit profile modal
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editBio, setEditBio] = useState<string>('');
  const [editInterests, setEditInterests] = useState<string>('');
  const [editProfession, setEditProfession] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editPhoto, setEditPhoto] = useState<string>('');
  const [editCover, setEditCover] = useState<string>('');

  // A revoked/expired session (e.g. banned, password changed elsewhere) returns to the sign-in page
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
      toast.info('Your session has ended. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setCurrentUser(await api.getMe());
      } catch {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!api.hasSession()) return;
    try {
      setNotifications(await api.getNotifications());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
    const loop = setInterval(fetchNotifications, 10000);
    return () => clearInterval(loop);
  }, [currentUser?.id, fetchNotifications]);

  // Close the notifications dropdown when clicking elsewhere
  useEffect(() => {
    if (!showNotifications) return;
    const onDown = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showNotifications]);

  const handleSignedIn = (user: User) => {
    setCurrentUser(user);
    setActiveTab('map');
    setViewTarget(undefined);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setNotifications([]);
    setActiveTab('map');
  };

  const handleRelocate = async (lat: number, lng: number, city: string, state: string, country?: string) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Please enter a valid latitude and longitude.');
      return;
    }
    setIsRelocating(true);
    try {
      const updated = await api.updateLocation(lat, lng, city, state, country);
      setCurrentUser(updated.user);
      setShowLocationDrawer(false);
      toast.success(`Location set to ${[updated.user.location.city, updated.user.location.state].filter(Boolean).join(', ') || 'the new spot'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update location.');
    } finally {
      setIsRelocating(false);
    }
  };

  const relocateToPlace = (p: Place) => handleRelocate(p.latitude, p.longitude, p.city || p.name, p.state, p.country);

  const openProfileModal = () => {
    if (!currentUser) return;
    setEditBio(currentUser.bio || '');
    setEditInterests((currentUser.interests || []).join(', '));
    setEditProfession(currentUser.profession || '');
    setEditWebsite(currentUser.website || '');
    setEditPhoto(currentUser.profilePhoto || '');
    setEditCover(currentUser.coverImage || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        bio: editBio,
        interests: editInterests.split(',').map((i) => i.trim()).filter(Boolean),
        profession: editProfession,
        website: editWebsite,
        profilePhoto: editPhoto,
        coverImage: editCover
      });
      setCurrentUser(updated.user);
      setShowProfileModal(false);
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleDismissNotification = async (id: string) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
    try {
      await api.dismissNotification(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not dismiss notification.');
      fetchNotifications();
    }
  };

  const handleOpenNotification = (n: Notification) => {
    setShowNotifications(false);
    if (!n.isRead) {
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      api.markNotificationRead(n.id).catch(() => undefined);
    }
    const { view, target } = notificationTarget(n);
    if (view === 'admin' && !currentUser?.isAdmin) return;
    setAppView(view, target);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mt-4">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  const sidebarTabs = [
    { id: 'map', label: 'Map', icon: <Compass size={17} /> },
    { id: 'feed', label: 'Feed', icon: <Rss size={17} /> },
    { id: 'people', label: 'People', icon: <Users size={17} /> },
    { id: 'business', label: 'Shops', icon: <Store size={17} /> },
    { id: 'events', label: 'Events', icon: <Calendar size={17} /> },
    { id: 'chat', label: 'Messages', icon: <MessageSquare size={17} /> },
    ...(currentUser.isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Shield size={17} /> }] : [])
  ];

  const placeName = [currentUser.location?.city, currentUser.location?.state].filter(Boolean).join(', ') || 'Set location';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 py-3 px-3 sm:px-6 sticky top-0 z-40 shadow-xs flex items-center justify-between gap-2 sm:gap-4 h-[61px]">
        <button onClick={() => setAppView('map')} className="flex items-center gap-2 shrink-0" title="Home">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold font-display shadow-sm">G</div>
          <div className="hidden sm:block text-left">
            <h1 className="text-sm font-bold font-display tracking-tight text-gray-900 leading-none">GeoConnect</h1>
            <span className="text-xs text-teal-600 font-bold uppercase tracking-wider mt-1 block">Local Social Network</span>
          </div>
        </button>

        {/* Location pill (all screen sizes) */}
        <button
          onClick={() => setShowLocationDrawer(!showLocationDrawer)}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-2xl border border-gray-200 min-w-0 max-w-[45vw] sm:max-w-sm"
          title="Change location"
        >
          {isRelocating ? (
            <span className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" aria-label="Updating location" />
          ) : (
            <MapPin size={14} className="text-teal-600 shrink-0" />
          )}
          <span className="text-left min-w-0">
            <span className="text-[11px] text-gray-400 font-bold leading-none uppercase hidden sm:block">Your location</span>
            <span className="text-xs font-bold text-gray-700 leading-tight block truncate">{placeName}</span>
          </span>
          <ChevronDown size={14} className="text-teal-600 shrink-0" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-600 text-gray-500 border border-gray-200 flex items-center justify-center relative"
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 font-bold text-[11px] text-white min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2.5 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50 text-xs"
                >
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center font-bold">
                    <span className="text-gray-700 font-display">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-teal-600 hover:text-teal-800">
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-gray-400 font-medium">You're all caught up.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`flex items-start ${n.isRead ? 'bg-white' : 'bg-teal-50/60'}`}>
                          <button onClick={() => handleOpenNotification(n)} className="flex-1 min-w-0 p-3 flex gap-2.5 text-left hover:bg-gray-50">
                            <img src={n.senderPhoto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100" referrerPolicy="no-referrer" />
                            <span className="min-w-0">
                              <span className="text-xs text-gray-800 font-semibold block">{n.title}</span>
                              <span className="text-xs text-gray-500 mt-0.5 block leading-snug break-words">{n.message}</span>
                              <span className="text-[11px] text-gray-400 block mt-1">{timeAgo(n.createdAt)}</span>
                            </span>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" aria-label="Unread" />}
                          </button>
                          <button
                            onClick={() => handleDismissNotification(n.id)}
                            className="text-gray-300 hover:text-red-500 p-3"
                            aria-label="Dismiss notification"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Account */}
          <button
            onClick={() => setAppView('profile', currentUser.id)}
            title="View my profile"
            className="flex items-center gap-2 bg-gray-50 px-1.5 sm:px-3 py-1.5 rounded-2xl border border-gray-200 hover:border-teal-200"
          >
            <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-7 h-7 rounded-xl object-cover bg-gray-200 shrink-0" referrerPolicy="no-referrer" />
            <span className="text-left hidden lg:block">
              <span className="text-xs font-bold text-gray-800 block leading-none">{currentUser.name}</span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5 block font-bold">{currentUser.isAdmin ? 'Admin' : 'Member'}</span>
            </span>
          </button>
          <button
            onClick={() => setAppView('settings')}
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hidden sm:flex items-center justify-center"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Change-location drawer */}
      <AnimatePresence>
        {showLocationDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 shadow-sm z-30"
          >
            <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600">Change your location</h4>
                  <p className="text-xs text-gray-500 mt-1">Use your GPS, search for a place, or pick a city. Everything nearby updates right away.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATION_PRESETS.map((p) => (
                    <button
                      key={p.city}
                      onClick={() => handleRelocate(p.lat, p.lng, p.city, p.state, p.country)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-xs font-bold text-gray-600"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <LocationSearch onSelect={relocateToPlace} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Navigation (a scrollable row on phones, a sidebar on larger screens) */}
        <nav className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-2 md:p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto shrink-0 md:h-[calc(100vh-61px)] sticky top-[61px] z-20">
          {[...sidebarTabs, { id: 'settings', label: 'Settings', icon: <Settings size={17} /> }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAppView(tab.id)}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 md:py-3 rounded-2xl text-xs font-bold transition-all shrink-0 md:w-full ${
                activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              } ${tab.id === 'settings' ? 'md:mt-auto' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-x-hidden min-h-[calc(100vh-140px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}:${viewTarget || ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <Suspense fallback={<PageLoader />}>
                {activeTab === 'map' && <InteractiveMap currentUser={currentUser} onRelocate={handleRelocate} setAppView={setAppView} />}

                {activeTab === 'feed' && (
                  <FeedPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} focusPostId={viewTarget} />
                )}

                {activeTab === 'people' && (
                  <PeoplePanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} />
                )}

                {activeTab === 'business' && (
                  <BusinessPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} initialTarget={viewTarget} />
                )}

                {activeTab === 'events' && (
                  <EventsPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} focusEventId={viewTarget} />
                )}

                {activeTab === 'chat' && (
                  <ChatPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} initialThreadId={viewTarget} />
                )}

                {activeTab === 'admin' && currentUser.isAdmin && <AdminPanel currentUser={currentUser} />}

                {activeTab === 'settings' && (
                  <SettingsPanel currentUser={currentUser} onUserUpdated={setCurrentUser} onAccountDeleted={handleLogout} onEditProfile={openProfileModal} />
                )}

                {activeTab === 'profile' && viewTarget && (
                  <ProfilePanel
                    currentUser={currentUser}
                    userId={viewTarget}
                    setAppView={setAppView}
                    onBack={() => setAppView(tabBeforeProfile)}
                    onEditProfile={openProfileModal}
                    triggerNotificationRefresh={fetchNotifications}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Edit profile modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div>
              <h3 className="font-bold text-lg text-gray-800 font-display">Edit Profile</h3>
              <p className="text-xs text-gray-500">Tell people nearby a little about yourself.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Profile photo</label>
                <MediaInput value={editPhoto} onChange={(url) => setEditPhoto(url)} placeholder="Image link or upload" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Cover image</label>
                <MediaInput value={editCover} onChange={(url) => setEditCover(url)} placeholder="Image link or upload" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Profession</label>
                <input
                  type="text"
                  placeholder="e.g. Fullstack Developer"
                  value={editProfession}
                  maxLength={60}
                  onChange={(e) => setEditProfession(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Interests (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. coffee, hiking, yoga"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Website</label>
                <input
                  type="text"
                  placeholder="e.g. mysite.com"
                  value={editWebsite}
                  maxLength={200}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">About</label>
                <textarea
                  value={editBio}
                  maxLength={500}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowProfileModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 select-none">© 2026 GeoConnect</footer>
    </div>
  );
}

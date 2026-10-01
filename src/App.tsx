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
import { Avatar, errorText } from './components/common/ui';
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
  { city: 'San Francisco', state: 'California', country: 'United States', lat: 37.7749, lng: -122.4194, label: '🇺🇸 San Francisco' },
  { city: 'New York', state: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, label: '🇺🇸 New York' },
  { city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, label: '🇬🇧 London' },
  { city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8566, lng: 2.3522, label: '🇫🇷 Paris' },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, label: '🇯🇵 Tokyo' }
];

const NOTIFICATION_POLL_MS = 30000;

function PageLoader() {
  return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

/**
 * Turns a notification's link into a page + target. Links are shared with the mobile app:
 * "conversations/12", "users/sarah_j", "posts/88", "events/3", "businesses/<slug>", "orders/5",
 * "business/orders/5", "admin/reports", "stories".
 */
function notificationTarget(n: Notification): { view: string; target?: string } {
  const [first, second] = n.link.split('/');
  switch (first) {
    case 'conversations':
      return { view: 'chat', target: second };
    case 'users':
      return { view: 'profile', target: second };
    case 'posts':
      return { view: 'feed', target: second };
    case 'stories':
      return { view: 'feed' };
    case 'events':
      return { view: 'events', target: second };
    case 'businesses':
      return { view: 'business', target: second };
    case 'orders':
      return { view: 'business', target: 'orders' };
    case 'business': // "business/orders/5": an order at your shop
      return { view: 'business', target: 'dashboard' };
    case 'admin':
      return { view: 'admin' };
  }
  // Notifications without a link
  if (n.type === 'message') return { view: 'chat' };
  if (n.senderId && ['friend_request', 'friend_accept', 'follow'].includes(n.type)) return { view: 'profile', target: n.senderId };
  return { view: 'feed' };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [isRelocating, setIsRelocating] = useState<boolean>(false);

  // Navigation: the active page plus an optional target (a user, chat, shop, post...)
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
      window.scrollTo({ top: 0 });
    },
    [activeTab]
  );

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // An ended session (signed out elsewhere, banned...) returns to the sign-in page
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(null);
      toast.info('Your session has ended. Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setCurrentUser(await api.getMe());
    } catch (err) {
      setLoadError(errorText(err, 'Could not reach GeoConnect.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const fetchNotifications = useCallback(async () => {
    if (!api.isSignedIn()) return;
    try {
      const res = await api.getNotifications();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
    const loop = setInterval(fetchNotifications, NOTIFICATION_POLL_MS);
    return () => clearInterval(loop);
  }, [currentUser?.id, fetchNotifications]);

  // Without a location nothing "nearby" can be shown, so ask for one first
  const hasLocation = !!currentUser && Number.isFinite(currentUser.location.latitude) && Number.isFinite(currentUser.location.longitude);
  useEffect(() => {
    if (currentUser && !hasLocation) setShowLocationDrawer(true);
  }, [currentUser?.id, hasLocation]);

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
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
    setCurrentUser(user);
    setActiveTab('map');
    setViewTarget(undefined);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Already signed out on the server
    }
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setActiveTab('map');
  };

  const handleRelocate = async (lat: number, lng: number, city: string, state: string, country?: string) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Please choose a valid location.');
      return;
    }
    setIsRelocating(true);
    try {
      const user = await api.updateLocation(lat, lng, city, state, country);
      setCurrentUser(user);
      setShowLocationDrawer(false);
      toast.success(`Location set to ${[user.location.city, user.location.state].filter(Boolean).join(', ') || 'the new spot'}.`);
    } catch (err) {
      toast.error(errorText(err, 'Could not update location.'));
    } finally {
      setIsRelocating(false);
    }
  };

  const relocateToPlace = (p: Place) => handleRelocate(p.latitude, p.longitude, p.city || p.name, p.state, p.country);

  const openProfileModal = () => {
    if (!currentUser) return;
    setEditBio(currentUser.bio);
    setEditInterests(currentUser.interests.join(', '));
    setEditProfession(currentUser.profession);
    setEditWebsite(currentUser.website);
    setEditPhoto(currentUser.profilePhoto);
    setEditCover(currentUser.coverImage);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      const user = await api.updateProfile({
        bio: editBio,
        interests: editInterests.split(',').map((i) => i.trim()).filter(Boolean),
        profession: editProfession,
        website: editWebsite,
        // Only send photos that changed (an unchanged one is already saved)
        profilePhoto: editPhoto !== currentUser.profilePhoto ? editPhoto : undefined,
        coverImage: editCover !== currentUser.coverImage ? editCover : undefined
      });
      setCurrentUser(user);
      setShowProfileModal(false);
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(errorText(err, 'Could not save profile.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong.'));
    }
  };

  const handleDismissNotification = async (n: Notification) => {
    setNotifications((list) => list.filter((x) => x.id !== n.id));
    if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.dismissNotification(n.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not dismiss notification.'));
      fetchNotifications();
    }
  };

  const handleOpenNotification = (n: Notification) => {
    setShowNotifications(false);
    if (!n.isRead) {
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      api.markNotificationRead(n.id).catch(() => undefined);
    }
    const { view, target } = notificationTarget(n);
    if (view === 'admin' && !currentUser?.isAdmin) return;
    setAppView(view, target);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mt-4">Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white p-6 text-center space-y-4">
        <p className="text-sm text-slate-300 max-w-sm">{loadError}</p>
        <button onClick={loadMe} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold uppercase tracking-widest">
          Try again
        </button>
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

  const placeName = [currentUser.location.city, currentUser.location.state].filter(Boolean).join(', ') || (hasLocation ? 'Pinned location' : 'Set your location');

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

        {/* Location pill */}
        <button
          onClick={() => setShowLocationDrawer(!showLocationDrawer)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border min-w-0 max-w-[45vw] sm:max-w-sm ${
            hasLocation ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-amber-50 border-amber-300 animate-pulse'
          }`}
          title="Change location"
          aria-expanded={showLocationDrawer}
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
              aria-expanded={showNotifications}
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
                            {n.senderName ? (
                              <Avatar src={n.senderPhoto} name={n.senderName} className="w-8 h-8 rounded-full" />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                <Bell size={14} />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="text-xs text-gray-800 font-semibold block">{n.title}</span>
                              <span className="text-xs text-gray-500 mt-0.5 block leading-snug break-words">{n.message}</span>
                              <span className="text-[11px] text-gray-400 block mt-1">{timeAgo(n.createdAt)}</span>
                            </span>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1.5" aria-label="Unread" />}
                          </button>
                          <button onClick={() => handleDismissNotification(n)} className="text-gray-300 hover:text-red-500 p-3" aria-label="Dismiss notification">
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
            <Avatar src={currentUser.profilePhoto} name={currentUser.name} className="w-7 h-7 rounded-xl" />
            <span className="text-left hidden lg:block">
              <span className="text-xs font-bold text-gray-800 block leading-none">{currentUser.name}</span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5 block font-bold">{currentUser.isAdmin ? 'Admin' : 'Member'}</span>
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Change-location drawer */}
      <AnimatePresence>
        {showLocationDrawer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white border-b border-gray-200 shadow-sm z-30">
            <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-teal-600">{hasLocation ? 'Change your location' : 'Where are you?'}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {hasLocation
                      ? 'Use your GPS, search for a place, or pick a city. Everything nearby updates right away.'
                      : 'GeoConnect shows people, shops and events near you. Set your location to get started.'}
                  </p>
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
              aria-current={activeTab === tab.id ? 'page' : undefined}
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
          {!hasLocation && activeTab !== 'settings' && activeTab !== 'profile' ? (
            <div className="bg-white rounded-3xl border border-amber-200 p-8 text-center space-y-3">
              <MapPin size={34} className="text-amber-500 mx-auto" />
              <h3 className="font-bold text-gray-800">Set your location first</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">Choose a city above, search for a place, or use your GPS. Then you'll see what's around you.</p>
            </div>
          ) : (
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

                  {activeTab === 'feed' && <FeedPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} focusPostId={viewTarget} />}

                  {activeTab === 'people' && <PeoplePanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} />}

                  {activeTab === 'business' && (
                    <BusinessPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} initialTarget={viewTarget} />
                  )}

                  {activeTab === 'events' && <EventsPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} focusEventId={viewTarget} />}

                  {activeTab === 'chat' && <ChatPanel currentUser={currentUser} setAppView={setAppView} triggerNotificationRefresh={fetchNotifications} initialThreadId={viewTarget} />}

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
          )}
        </main>
      </div>

      {/* Edit profile modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-auto">
            <div>
              <h3 className="font-bold text-lg text-gray-800 font-display">Edit Profile</h3>
              <p className="text-xs text-gray-500">Tell people nearby a little about yourself.</p>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Profile photo</label>
                <MediaInput value={editPhoto} onChange={(url) => setEditPhoto(url)} allowLinks placeholder="Image link, or upload" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Cover image</label>
                <MediaInput value={editCover} onChange={(url) => setEditCover(url)} allowLinks placeholder="Image link, or upload" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1" htmlFor="edit-profession">Profession</label>
                <input
                  id="edit-profession"
                  type="text"
                  placeholder="e.g. Fullstack Developer"
                  value={editProfession}
                  maxLength={60}
                  onChange={(e) => setEditProfession(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1" htmlFor="edit-interests">Interests (comma separated)</label>
                <input
                  id="edit-interests"
                  type="text"
                  placeholder="e.g. coffee, hiking, yoga"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1" htmlFor="edit-website">Website</label>
                <input
                  id="edit-website"
                  type="text"
                  placeholder="e.g. mysite.com"
                  value={editWebsite}
                  maxLength={200}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1" htmlFor="edit-bio">About</label>
                <textarea
                  id="edit-bio"
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
              <button type="submit" disabled={isSavingProfile} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold">
                {isSavingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 select-none">© 2026 GeoConnect</footer>
    </div>
  );
}

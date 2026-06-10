/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User } from '../types';
import { Users, Search, MapPin, MessageSquare, UserPlus, Heart, Briefcase, Check } from 'lucide-react';

interface PeoplePanelProps {
  currentUser: any;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
}

export function PeoplePanel({ currentUser, setAppView, triggerNotificationRefresh }: PeoplePanelProps) {
  const [people, setPeople] = useState<User[]>([]);
  const [range, setRange] = useState<string>('50');
  const [interest, setInterest] = useState<string>('');
  const [profession, setProfession] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Social states
  const [socialState, setSocialState] = useState<any>({
    friendRequests: [],
    following: [],
    blocked: []
  });

  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      const data = await api.discoverPeople({
        range,
        interest,
        profession,
        gender,
        search
      });
      setPeople(data);

      const relations = await api.getSocialRelations();
      setSocialState(relations);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [range, interest, profession, gender, search, currentUser]);

  const handleStartChat = async (recipientId: string) => {
    try {
      await api.startPrivateChat(recipientId);
      setAppView('chat');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    try {
      await api.sendFriendRequest(receiverId);
      fetchPeople();
      triggerNotificationRefresh();
      alert('Friend request sent!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    try {
      await api.toggleFollow(targetId, 'user');
      fetchPeople();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondRequest = async (requestId: string, respond: 'accepted' | 'declined') => {
    try {
      await api.respondFriendRequest(requestId, respond);
      fetchPeople();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const isFriendRequested = (nId: string) => {
    return socialState.friendRequests.some(
      (r: any) =>
        (r.senderId === currentUser?.id && r.receiverId === nId && r.status === 'pending') ||
        (r.senderId === nId && r.receiverId === currentUser?.id && r.status === 'pending')
    );
  };

  const isFriendAccepted = (nId: string) => {
    return socialState.friendRequests.some(
      (r: any) =>
        ((r.senderId === currentUser?.id && r.receiverId === nId) ||
          (r.senderId === nId && r.receiverId === currentUser?.id)) &&
        r.status === 'accepted'
    );
  };

  const isFollowing = (nId: string) => {
    return socialState.following.some((f: any) => f.followingId === nId && f.targetType === 'user');
  };

  const incomingPendingRequest = (nId: string) => {
    return socialState.friendRequests.find(
      (r: any) => r.senderId === nId && r.receiverId === currentUser?.id && r.status === 'pending'
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Head banner */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Users size={22} className="shrink-0" />
            Discover Surrounding Neighbors
          </h2>
          <p className="text-xs text-indigo-100 mt-1">Locate and network with nearby neighbors featuring shared interests.</p>
        </div>
      </div>

      {/* Query Filter Matrix settings */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search names or usernames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <input
          type="text"
          placeholder="Interests (e.g. Yoga, Cafe)"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
        />

        <input
          type="text"
          placeholder="Profession (e.g. Barista)"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
        />

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-xs text-gray-650 outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="5">Within 5 KM</option>
          <option value="15">Within 15 KM</option>
          <option value="50">Within 50 KM</option>
          <option value="global">Global Discovery</option>
        </select>
      </div>

      {/* Neighbor people directory listings */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Pinpointing close neighbor coordinates...</p>
        </div>
      ) : people.length === 0 ? (
        <div className="text-center bg-white border border-gray-100 py-16 rounded-3xl space-y-3">
          <Users size={34} className="text-sky-400 mx-auto" />
          <h4 className="font-bold text-gray-750 text-sm">No neighboring members matched.</h4>
          <p className="text-xs text-gray-450 max-w-xs mx-auto leading-relaxed">Try loosening your search terms or expanding your discovery radius to see regional social lines!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map((p) => {
            const hasSentFriend = isFriendRequested(p.id);
            const isFriend = isFriendAccepted(p.id);
            const isFoll = isFollowing(p.id);
            const pendingIncoming = incomingPendingRequest(p.id);

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:ring-1 hover:ring-indigo-100 transition-all flex flex-col justify-between h-full space-y-4"
              >
                {/* Meta details */}
                <div className="flex items-start gap-3.5 relative">
                  <div className="relative shrink-0">
                    <img
                      src={p.profilePhoto}
                      alt={p.name}
                      className="w-13 h-13 rounded-2xl object-cover bg-gray-50 border border-gray-100"
                      referrerPolicy="no-referrer"
                    />
                    {/* Active locator beacon */}
                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white w-3.5 h-3.5 rounded-full" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className="font-bold text-gray-800 text-sm hover:text-sky-600 transition-colors cursor-pointer truncate"
                      onClick={() => setAppView('profile', p.id)}
                    >
                      {p.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-semibold block">@{p.username}</span>

                    {p.profession && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1 font-medium">
                        <Briefcase size={11} className="text-sky-500 shrink-0" />
                        <span className="truncate">{p.profession}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coordinates distances */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 min-h-[32px]">{p.bio || 'Local enthusiast. Interested in meeting neighborhood peers and discovering neat spots!'}</p>

                  {/* Interests tags list */}
                  {p.interests && p.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.interests.map((it) => (
                        <span
                          key={it}
                          className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        >
                          #{it}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer GPS ranges & fast social action panels hooks */}
                <div className="pt-3 border-t border-gray-50 mt-auto space-y-3.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono font-bold">
                    <span className="text-sky-600 flex items-center gap-1">
                      <MapPin size={11} />
                      {(p as any).distanceKm ? `${(p as any).distanceKm} km away` : 'Within 1km'}
                    </span>
                    <span>{p.gender}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Message Button */}
                    <button
                      onClick={() => handleStartChat(p.id)}
                      className="py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>

                    {/* Friend Request Toggles */}
                    {isFriend ? (
                      <div className="py-2 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center gap-1 border border-teal-200">
                        <Check size={13} />
                        <span>Friend</span>
                      </div>
                    ) : pendingIncoming ? (
                      <div className="flex gap-1 col-span-2">
                        <button
                          onClick={() => handleRespondRequest(pendingIncoming.id, 'accepted')}
                          className="flex-1 py-1 px-2.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                        >
                          Accept request
                        </button>
                        <button
                          onClick={() => handleRespondRequest(pendingIncoming.id, 'declined')}
                          className="py-1 px-2.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(p.id)}
                        disabled={hasSentFriend}
                        className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          hasSentFriend
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-white hover:bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        <UserPlus size={13} />
                        <span>{hasSentFriend ? 'Pending' : 'Add Friend'}</span>
                      </button>
                    )}

                    {/* Follow Toggle buttons */}
                    <button
                      onClick={() => handleToggleFollow(p.id)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold uppercase col-span-2 tracking-wider ${
                        isFoll
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-gray-50 hover:bg-sky-50 text-gray-400 hover:text-sky-600 border border-transparent hover:border-sky-100'
                      }`}
                    >
                      {isFoll ? 'Following Updates' : 'Follow Feeds'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

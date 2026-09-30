/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { FriendsOverview, SocialRelations, User } from '../types';
import { Briefcase, Check, MapPin, MessageSquare, Search, UserMinus, UserPlus, Users } from 'lucide-react';

interface PeoplePanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
}

type PersonWithDistance = User & { distanceKm?: number };
type Tab = 'discover' | 'friends' | 'requests';

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function PeoplePanel({ currentUser, setAppView, triggerNotificationRefresh }: PeoplePanelProps) {
  const [tab, setTab] = useState<Tab>('discover');

  // Discover filters
  const [people, setPeople] = useState<PersonWithDistance[]>([]);
  const [range, setRange] = useState<string>('50');
  const [interest, setInterest] = useState<string>('');
  const [profession, setProfession] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debounced, setDebounced] = useState({ interest: '', profession: '', search: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [relations, setRelations] = useState<SocialRelations>({ friendRequests: [], following: [], blocked: [] });
  const [friends, setFriends] = useState<FriendsOverview>({ friends: [], incoming: [], outgoing: [] });

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced({ interest, profession, search }), 350);
    return () => window.clearTimeout(t);
  }, [interest, profession, search]);

  const fetchRelations = async () => {
    try {
      const [rel, fr] = await Promise.all([api.getSocialRelations(), api.getFriends()]);
      setRelations(rel);
      setFriends(fr);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      setPeople(await api.discoverPeople({ range, gender, ...debounced }));
    } catch (err) {
      toast.error(errorText(err, 'Could not load people.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [range, gender, debounced, currentUser.location.latitude, currentUser.location.longitude]);

  useEffect(() => {
    fetchRelations();
  }, []);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
      await fetchRelations();
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong.'));
    }
  };

  const startChat = async (userId: string) => {
    try {
      const thread = await api.startPrivateChat(userId);
      setAppView('chat', thread.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not start chat.'));
    }
  };

  const unfriend = async (u: User) => {
    if (!(await confirmAction(`Remove ${u.name} from your friends?`, 'Remove'))) return;
    run(() => api.removeFriend(u.id), `${u.name} was removed from your friends.`);
  };

  const requestWith = (id: string) =>
    relations.friendRequests.find(
      (r) => (r.senderId === currentUser.id && r.receiverId === id) || (r.senderId === id && r.receiverId === currentUser.id)
    );
  const isFollowing = (id: string) => relations.following.some((f) => f.followingId === id && f.targetType === 'user');

  const incomingCount = friends.incoming.length;

  const Avatar = ({ u, size = 'w-12 h-12' }: { u: User; size?: string }) => (
    <button onClick={() => setAppView('profile', u.id)} className="shrink-0">
      <img src={u.profilePhoto} alt={u.name} className={`${size} rounded-2xl object-cover bg-gray-100`} referrerPolicy="no-referrer" />
    </button>
  );

  const NameBlock = ({ u }: { u: PersonWithDistance }) => (
    <div className="min-w-0 flex-1">
      <button onClick={() => setAppView('profile', u.id)} className="font-bold text-gray-800 text-sm hover:text-sky-700 block truncate text-left">
        {u.name}
      </button>
      <span className="text-xs text-gray-500 block">@{u.username}</span>
      {u.distanceKm !== undefined && (
        <span className="text-xs text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
          <MapPin size={11} /> {u.distanceKm < 1 ? 'Under 1 km away' : `${u.distanceKm} km away`}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Users size={22} /> People Near You
          </h2>
          <p className="text-xs text-indigo-100 mt-1">Find and connect with neighbors who share your interests.</p>
        </div>
        <div className="flex gap-1.5 bg-black/15 p-1 rounded-xl">
          {(
            [
              ['discover', 'Discover'],
              ['friends', `Friends (${friends.friends.length})`],
              ['requests', `Requests${incomingCount ? ` (${incomingCount})` : ''}`]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold ${tab === id ? 'bg-white text-indigo-800' : 'text-white hover:bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'discover' && (
        <>
          <div className="bg-white p-4 rounded-3xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search names or usernames..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <input
              type="text"
              placeholder="Interest (e.g. Yoga)"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
            />
            <input
              type="text"
              placeholder="Profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
              aria-label="Gender"
            >
              <option value="">Any gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-sky-500"
              aria-label="Distance"
            >
              <option value="5">Within 5 km</option>
              <option value="15">Within 15 km</option>
              <option value="50">Within 50 km</option>
              <option value="global">Anywhere</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-gray-500 font-semibold">Finding people nearby...</p>
            </div>
          ) : people.length === 0 ? (
            <div className="text-center bg-white border border-gray-200 py-16 rounded-3xl space-y-2">
              <Users size={34} className="text-sky-400 mx-auto" />
              <h4 className="font-bold text-gray-700 text-sm">No one found.</h4>
              <p className="text-xs text-gray-500">Try a different search or a wider distance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {people.map((p) => {
                const req = requestWith(p.id);
                const isFriend = req?.status === 'accepted';
                const pendingOut = req?.status === 'pending' && req.senderId === currentUser.id;
                const pendingIn = req?.status === 'pending' && req.receiverId === currentUser.id ? req : undefined;
                const following = isFollowing(p.id);

                return (
                  <div key={p.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar u={p} size="w-14 h-14" />
                      <div className="min-w-0 flex-1">
                        <NameBlock u={p} />
                        {p.profession && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Briefcase size={11} className="text-sky-500 shrink-0" /> <span className="truncate">{p.profession}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {p.bio && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{p.bio}</p>}
                    {p.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.interests.slice(0, 5).map((it) => (
                          <span key={it} className="bg-sky-50 text-sky-700 text-xs font-semibold px-2 py-0.5 rounded-lg">#{it}</span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-100">
                      <button onClick={() => startChat(p.id)} className="py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs flex items-center justify-center gap-1.5">
                        <MessageSquare size={13} /> Chat
                      </button>
                      {isFriend ? (
                        <span className="py-2 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center gap-1 border border-teal-200">
                          <Check size={13} /> Friends
                        </span>
                      ) : pendingIn ? (
                        <button
                          onClick={() => run(() => api.respondFriendRequest(pendingIn.id, 'accepted'), `You and ${p.name} are now friends.`)}
                          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          Accept request
                        </button>
                      ) : (
                        <button
                          onClick={() => run(() => api.sendFriendRequest(p.id), 'Friend request sent.')}
                          disabled={pendingOut}
                          className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 bg-white hover:bg-sky-50 text-sky-700 border-sky-200"
                        >
                          <UserPlus size={13} /> {pendingOut ? 'Request sent' : 'Add friend'}
                        </button>
                      )}
                      <button
                        onClick={() => run(() => api.toggleFollow(p.id, 'user'))}
                        className={`col-span-2 py-1.5 rounded-lg text-xs font-bold ${
                          following ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 hover:bg-sky-50 text-gray-600 hover:text-sky-700'
                        }`}
                      >
                        {following ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'friends' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {friends.friends.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No friends yet. Find people on the Discover tab.</p>
          ) : (
            friends.friends.map((f) => (
              <div key={f.id} className="p-4 flex items-center gap-3">
                <Avatar u={f} />
                <NameBlock u={f} />
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startChat(f.id)} className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-1.5">
                    <MessageSquare size={13} /> <span className="hidden sm:inline">Chat</span>
                  </button>
                  <button onClick={() => unfriend(f)} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 text-gray-600 text-xs font-bold flex items-center gap-1.5">
                    <UserMinus size={13} /> <span className="hidden sm:inline">Unfriend</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-6">
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="px-5 pt-4 pb-2 text-sm font-bold text-gray-800">Received</h3>
            {friends.incoming.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-500">No pending requests.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {friends.incoming.map(({ request, user }) => (
                  <div key={request.id} className="p-4 flex items-center gap-3">
                    <Avatar u={user} />
                    <NameBlock u={user} />
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => run(() => api.respondFriendRequest(request.id, 'accepted'), `You and ${user.name} are now friends.`)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Accept
                      </button>
                      <button onClick={() => run(() => api.respondFriendRequest(request.id, 'declined'))} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="px-5 pt-4 pb-2 text-sm font-bold text-gray-800">Sent</h3>
            {friends.outgoing.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-500">No requests waiting for an answer.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {friends.outgoing.map(({ request, user }) => (
                  <div key={request.id} className="p-4 flex items-center gap-3">
                    <Avatar u={user} />
                    <NameBlock u={user} />
                    <button onClick={() => run(() => api.removeFriend(user.id), 'Request cancelled.')} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold shrink-0">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

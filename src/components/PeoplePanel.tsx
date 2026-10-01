/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { Avatar, EmptyState, LoadMore, Spinner, distanceLabel, errorText } from './common/ui';
import { FriendRequestItem, FriendsOverview, SocialRelations, User } from '../types';
import { Briefcase, Check, MapPin, MessageSquare, Search, UserMinus, UserPlus, Users } from 'lucide-react';

interface PeoplePanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
}

type Tab = 'discover' | 'friends' | 'requests';

export function PeoplePanel({ currentUser, setAppView, triggerNotificationRefresh }: PeoplePanelProps) {
  const [tab, setTab] = useState<Tab>('discover');

  // Discover filters
  const [people, setPeople] = useState<User[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [range, setRange] = useState<string>('50');
  const [interest, setInterest] = useState<string>('');
  const [profession, setProfession] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debounced, setDebounced] = useState({ interest: '', profession: '', search: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [relations, setRelations] = useState<SocialRelations>({
    friendIds: [],
    incoming: [],
    outgoing: [],
    followingUserIds: [],
    followingBusinessIds: [],
    blockedIds: []
  });
  const [friends, setFriends] = useState<FriendsOverview>({ friends: [], incoming: [], outgoing: [] });

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced({ interest, profession, search }), 350);
    return () => window.clearTimeout(t);
  }, [interest, profession, search]);

  const fetchRelations = async () => {
    try {
      const [rel, fr] = await Promise.all([api.getRelations(), api.getFriends()]);
      setRelations(rel);
      setFriends(fr);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      const res = await api.discoverPeople({
        range,
        gender: gender ? (gender.toLowerCase() as 'male' | 'female' | 'other') : undefined,
        ...debounced
      });
      setPeople(res.items);
      setNextPage(res.next);
    } catch (err) {
      toast.error(errorText(err, 'Could not load people.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await api.discoverPeople({
        range,
        gender: gender ? (gender.toLowerCase() as 'male' | 'female' | 'other') : undefined,
        page: nextPage,
        ...debounced
      });
      setPeople((prev) => [...prev, ...res.items]);
      setNextPage(res.next);
    } catch (err) {
      toast.error(errorText(err, 'Could not load more people.'));
    } finally {
      setIsLoadingMore(false);
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

  const toggleFollow = async (userId: string, currentlyFollowing: boolean) => {
    try {
      await api.setFollowUser(userId, !currentlyFollowing);
      toast.success(currentlyFollowing ? 'Unfollowed.' : 'Following.');
      await fetchRelations();
    } catch (err) {
      toast.error(errorText(err, 'Could not update follow status.'));
    }
  };

  const isFriend = (id: string) => relations.friendIds.includes(id);
  const outgoingReq = (id: string) => relations.outgoing.find((o) => o.userId === id);
  const incomingReq = (id: string) => relations.incoming.find((i) => i.userId === id);
  const isFollowing = (id: string) => relations.followingUserIds.includes(id);

  const incomingCount = friends.incoming.length;

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
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
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
            <Spinner label="Finding people nearby..." tone="border-sky-500" />
          ) : people.length === 0 ? (
            <EmptyState
              icon={<Users size={34} className="text-sky-400" />}
              title="No one found."
              text="Try a different search or a wider distance."
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {people.map((p) => {
                  const friend = isFriend(p.id);
                  const outReq = outgoingReq(p.id);
                  const inReq = incomingReq(p.id);
                  const following = isFollowing(p.id);

                  return (
                    <div key={p.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <button onClick={() => setAppView('profile', p.id)} className="shrink-0">
                          <Avatar src={p.profilePhoto} name={p.name} className="w-14 h-14 rounded-2xl text-base" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button onClick={() => setAppView('profile', p.id)} className="font-bold text-gray-800 text-sm hover:text-sky-700 block truncate text-left">
                            {p.name}
                          </button>
                          <span className="text-xs text-gray-500 block">@{p.username}</span>
                          {p.distanceKm !== undefined && (
                            <span className="text-xs text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
                              <MapPin size={11} /> {distanceLabel(p.distanceKm)} away
                            </span>
                          )}
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
                        {friend ? (
                          <span className="py-2 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center gap-1 border border-teal-200">
                            <Check size={13} /> Friends
                          </span>
                        ) : inReq ? (
                          <button
                            onClick={() => run(() => api.respondFriendRequest(inReq.requestId, 'accepted'), `You and ${p.name} are now friends.`)}
                            className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Accept request
                          </button>
                        ) : (
                          <button
                            onClick={() => run(() => api.sendFriendRequest(p.id), 'Friend request sent.')}
                            disabled={!!outReq}
                            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 bg-white hover:bg-sky-50 text-sky-700 border-sky-200"
                          >
                            <UserPlus size={13} /> {outReq ? 'Request sent' : 'Add friend'}
                          </button>
                        )}
                        <button
                          onClick={() => toggleFollow(p.id, following)}
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

              {nextPage && <LoadMore onClick={handleLoadMore} isLoading={isLoadingMore} />}
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
                <button onClick={() => setAppView('profile', f.id)} className="shrink-0">
                  <Avatar src={f.profilePhoto} name={f.name} className="w-12 h-12 rounded-2xl" />
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setAppView('profile', f.id)} className="font-bold text-gray-800 text-sm hover:text-sky-700 block truncate text-left">
                    {f.name}
                  </button>
                  <span className="text-xs text-gray-500 block">@{f.username}</span>
                  {f.distanceKm !== undefined && (
                    <span className="text-xs text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {distanceLabel(f.distanceKm)} away
                    </span>
                  )}
                </div>
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
                {friends.incoming.map((item: FriendRequestItem) => (
                  <div key={item.requestId} className="p-4 flex items-center gap-3">
                    <button onClick={() => setAppView('profile', item.user.id)} className="shrink-0">
                      <Avatar src={item.user.profilePhoto} name={item.user.name} className="w-12 h-12 rounded-2xl" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setAppView('profile', item.user.id)} className="font-bold text-gray-800 text-sm hover:text-sky-700 block truncate text-left">
                        {item.user.name}
                      </button>
                      <span className="text-xs text-gray-500 block">@{item.user.username}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => run(() => api.respondFriendRequest(item.requestId, 'accepted'), `You and ${item.user.name} are now friends.`)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => run(() => api.respondFriendRequest(item.requestId, 'declined'))}
                        className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold"
                      >
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
                {friends.outgoing.map((item: FriendRequestItem) => (
                  <div key={item.requestId} className="p-4 flex items-center gap-3">
                    <button onClick={() => setAppView('profile', item.user.id)} className="shrink-0">
                      <Avatar src={item.user.profilePhoto} name={item.user.name} className="w-12 h-12 rounded-2xl" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setAppView('profile', item.user.id)} className="font-bold text-gray-800 text-sm hover:text-sky-700 block truncate text-left">
                        {item.user.name}
                      </button>
                      <span className="text-xs text-gray-500 block">@{item.user.username}</span>
                    </div>
                    <button
                      onClick={() => run(() => api.removeFriend(item.user.id), 'Request cancelled.')}
                      className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold shrink-0"
                    >
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

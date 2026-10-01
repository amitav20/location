/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { ReportDialog } from './common/ReportDialog';
import { Avatar, SafeImage, Spinner, distanceLabel, errorText } from './common/ui';
import { ProfileData, User } from '../types';
import { AlertTriangle, ArrowLeft, Ban, Briefcase, Check, Edit2, Globe, Heart, MapPin, MessageSquare, UserPlus } from 'lucide-react';

interface ProfilePanelProps {
  currentUser: User;
  userId: string;
  setAppView: (view: string, targetId?: string) => void;
  onBack: () => void;
  onEditProfile: () => void;
  triggerNotificationRefresh: () => void;
}

export function ProfilePanel({ currentUser, userId, setAppView, onBack, onEditProfile, triggerNotificationRefresh }: ProfilePanelProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showReport, setShowReport] = useState<boolean>(false);

  const fetchProfile = async () => {
    setError('');
    try {
      const data = await api.getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(errorText(err, 'Could not load this profile.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchProfile();
  }, [userId, currentUser.id]);

  const runAction = async (action: () => Promise<unknown>, successMsg?: string) => {
    try {
      await action();
      if (successMsg) toast.success(successMsg);
      await fetchProfile();
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Action failed.'));
    }
  };

  const handleChat = async () => {
    if (!profile) return;
    try {
      const thread = await api.startPrivateChat(profile.user.id);
      setAppView('chat', thread.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not start chat.'));
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    const name = profile.user.name || 'this person';
    const ok = await confirmAction(
      `Block ${name}? You won't see each other's posts, stories or profiles, and they can't message you. Any friendship or follow between you is removed.`,
      'Block'
    );
    if (!ok) return;
    try {
      await api.blockUser(profile.user.id);
      toast.success(`${name} is blocked. You can unblock them in Settings.`);
      onBack();
    } catch (err) {
      toast.error(errorText(err, 'Could not block.'));
    }
  };

  if (isLoading) {
    return <Spinner label="Loading profile..." tone="border-teal-500" />;
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-4">
        <p className="text-sm text-gray-600">{error || 'Profile not found.'}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700">
          Go back
        </button>
      </div>
    );
  }

  const { user, counts, relationship, posts } = profile;
  const isMe = user.id === currentUser.id;
  const websiteHref = user.website ? (user.website.startsWith('http') ? user.website : `https://${user.website}`) : '';

  const isFriend = !!relationship?.isFriend;
  const friendship = relationship?.friendship;
  const isPendingIncoming = friendship?.status === 'pending' && friendship.direction === 'incoming';
  const isPendingOutgoing = friendship?.status === 'pending' && friendship.direction === 'outgoing';
  const isFollowing = !!relationship?.isFollowing;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-36 sm:h-44 bg-gradient-to-r from-teal-500 to-sky-600 relative">
          {user.coverImage && (
            <SafeImage src={user.coverImage} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-5 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar
              src={user.profilePhoto}
              name={user.name}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md text-2xl"
            />
            <div className="flex-1 min-w-0 sm:pb-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:pb-1">
              {isMe ? (
                <button
                  onClick={onEditProfile}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  <Edit2 size={15} /> Edit profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleChat}
                    className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold flex items-center gap-1.5"
                  >
                    <MessageSquare size={15} /> Chat
                  </button>

                  {isFriend ? (
                    <span className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-sm font-semibold flex items-center gap-1.5">
                      <Check size={15} /> Friends
                    </span>
                  ) : isPendingIncoming && friendship ? (
                    <>
                      <button
                        onClick={() => runAction(() => api.respondFriendRequest(friendship.id, 'accepted'), `You and ${user.name} are now friends.`)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                      >
                        Accept request
                      </button>
                      <button
                        onClick={() => runAction(() => api.respondFriendRequest(friendship.id, 'declined'))}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (isPendingOutgoing) {
                          runAction(() => api.removeFriend(user.id), 'Request cancelled.');
                        } else {
                          runAction(() => api.sendFriendRequest(user.id), 'Friend request sent.');
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-sm font-semibold flex items-center gap-1.5"
                    >
                      <UserPlus size={15} /> {isPendingOutgoing ? 'Cancel request' : 'Add friend'}
                    </button>
                  )}

                  <button
                    onClick={() => setShowReport(true)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                    title="Report"
                  >
                    <AlertTriangle size={15} /> <span className="hidden sm:inline">Report</span>
                  </button>
                  <button
                    onClick={handleBlock}
                    className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-1.5"
                    title="Block"
                  >
                    <Ban size={15} /> <span className="hidden sm:inline">Block</span>
                  </button>
                  <button
                    onClick={() => runAction(() => api.setFollowUser(user.id, !isFollowing), isFollowing ? 'Unfollowed.' : 'Following.')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                      isFollowing
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="mt-5 space-y-3">
            {user.bio && <p className="text-sm text-gray-700 leading-relaxed">{user.bio}</p>}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              {user.profession && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={15} className="text-sky-600" /> {user.profession}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="text-teal-600" />
                {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || 'Unknown location'}
                {!isMe && user.distanceKm !== undefined && (
                  <span className="text-gray-400">· {distanceLabel(user.distanceKm)} away</span>
                )}
              </span>
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-teal-700 hover:underline"
                >
                  <Globe size={15} /> {user.website}
                </a>
              )}
            </div>

            {user.interests?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((it) => (
                  <span key={it} className="bg-sky-50 text-sky-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                    #{it}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-6 pt-2 text-sm">
              <span><strong className="text-gray-900">{counts?.posts || posts.length}</strong> <span className="text-gray-500">posts</span></span>
              <span><strong className="text-gray-900">{counts?.friends || 0}</strong> <span className="text-gray-500">friends</span></span>
              <span><strong className="text-gray-900">{counts?.followers || 0}</strong> <span className="text-gray-500">followers</span></span>
              <span><strong className="text-gray-900">{counts?.following || 0}</strong> <span className="text-gray-500">following</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Posts</h3>
        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 py-10 text-center text-sm text-gray-500">
            No posts yet.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(post.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {post.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {post.city}
                  </span>
                )}
              </div>
              {post.content && <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-line">{post.content}</p>}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="rounded-2xl overflow-hidden bg-gray-50">
                  {post.type === 'video' ? (
                    <video src={post.mediaUrls[0]} controls className="w-full max-h-[360px] object-cover" />
                  ) : (
                    <SafeImage src={post.mediaUrls[0]} alt="" className="w-full max-h-[420px] object-cover" />
                  )}
                </div>
              )}
              {post.type === 'poll' && post.pollOptions && (
                <ul className="space-y-1.5">
                  {post.pollOptions.map((opt) => (
                    <li key={opt.id} className="flex justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-gray-700">{opt.text}</span>
                      <span className="text-gray-500 font-semibold">{opt.percent}% ({opt.votes})</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1"><Heart size={13} className="text-teal-600" /> {post.likesCount} likes</span>
                <span className="flex items-center gap-1"><Heart size={13} className="fill-rose-400 stroke-rose-400" /> {post.lovesCount} loves</span>
                <button onClick={() => setAppView('feed', post.id)} className="flex items-center gap-1 hover:text-teal-700 font-semibold">
                  <MessageSquare size={13} /> {post.commentCount || 0} comments
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showReport && <ReportDialog target={{ type: 'user', id: user.id }} onClose={() => setShowReport(false)} />}
    </div>
  );
}

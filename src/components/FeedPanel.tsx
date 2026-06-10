/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Post, Comment, Story } from '../types';
import { Heart, MessageSquare, Share2, Plus, Smile, Image, Video, BarChart2, CheckCircle2, Clock, MapPin, Send, AlertTriangle } from 'lucide-react';

interface FeedPanelProps {
  currentUser: any;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
}

export function FeedPanel({ currentUser, setAppView, triggerNotificationRefresh }: FeedPanelProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [range, setRange] = useState<string>('25');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New post states
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'poll'>('text');
  const [newContent, setNewContent] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Comments states map: { postId: commentsArray }
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: Comment[] }>({});
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');

  // Active Story modal
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [newStoryMedia, setNewStoryMedia] = useState<string>('');
  const [showStoryWizard, setShowStoryWizard] = useState<boolean>(false);

  // Share post modal
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  
  // Content Report Modal
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState<string>('');

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFeed(range);
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchStories();
    const interval = setInterval(() => {
      fetchStories();
    }, 15000); // Poll stories
    return () => clearInterval(interval);
  }, [range, currentUser]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !mediaUrl.trim() && postType !== 'poll') return;

    setIsPosting(true);
    try {
      const payload: any = {
        type: postType,
        content: newContent
      };

      if (postType === 'image' || postType === 'video') {
        payload.mediaUrls = [mediaUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=450&fit=crop'];
      } else if (postType === 'poll') {
        payload.pollOptions = pollOptions.filter((o) => o.trim() !== '');
      }

      await api.createPost(payload);
      setNewContent('');
      setMediaUrl('');
      setPollOptions(['', '']);
      setPostType('text');
      fetchFeed();
    } catch (err) {
      alert('Post failed');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReact = async (id: string, flag: 'like' | 'love') => {
    try {
      const res = await api.togglePostReact(id, flag);
      setPosts(
        posts.map((p) => {
          if (p.id === id) {
            return { ...p, likes: res.likes, loves: res.loves };
          }
          return p;
        })
      );
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    try {
      const res = await api.votePoll(postId, optionId);
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return { ...p, pollOptions: res.pollOptions };
          }
          return p;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenComments = async (postId: string) => {
    if (activeCommentId === postId) {
      setActiveCommentId(null);
      return;
    }
    setActiveCommentId(postId);
    try {
      const data = await api.getComments(postId);
      setCommentsMap({ ...commentsMap, [postId]: data });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!newCommentText.trim()) return;
    try {
      const data = await api.submitComment(postId, newCommentText);
      const postComments = commentsMap[postId] || [];
      setCommentsMap({
        ...commentsMap,
        [postId]: [...postComments, data]
      });
      setNewCommentText('');
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStory = async () => {
    if (!newStoryMedia.trim()) return;
    try {
      await api.createStory({ mediaUrl: newStoryMedia, mediaType: 'image' });
      setNewStoryMedia('');
      setShowStoryWizard(false);
      fetchStories();
    } catch (err) {
      alert('Story upload failed');
    }
  };

  const handleViewStory = async (story: Story) => {
    setActiveStory(story);
    try {
      await api.viewStory(story.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSharePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingPost) return;
    try {
      await api.createPost({
        type: 'shared',
        content: newContent || `Shared post from ${sharingPost.authorName}`,
        sharedPostId: sharingPost.id
      });
      setSharingPost(null);
      setNewContent('');
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportPost = async () => {
    if (!reportingPost || !reportReason.trim()) return;
    try {
      await api.submitReport(reportingPost.id, 'post', reportReason);
      setReportingPost(null);
      setReportReason('');
      alert('Content reported. Administrators will evaluate soon.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Instagram Stories reel section */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-3xl border border-gray-100 overflow-x-auto">
        {/* Your Story button */}
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" onClick={() => setShowStoryWizard(true)}>
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-teal-500/50 flex items-center justify-center bg-teal-50 hover:bg-teal-100 transition-all">
            <Plus size={24} className="text-teal-600" />
          </div>
          <span className="text-[11px] font-semibold text-gray-400 mt-1.5">New Story</span>
        </div>

        {/* Stories bar list */}
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => handleViewStory(story)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-teal-500 via-emerald-400 to-amber-400">
              <img
                src={story.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'}
                alt={story.userName}
                className="w-full h-full rounded-full object-cover border border-white"
                referrerPolicy="no-referrer"
              />
              {/* Distance badge */}
              <span className="absolute -bottom-1 -right-1 bg-gray-900 border border-white text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full font-mono">
                {(story as any).distanceKm ? `${(story as any).distanceKm.toFixed(0)}k` : 'me'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-gray-700 mt-1.5 max-w-[70px] truncate">
              {story.userName?.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* 2. Create Post Section */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-4">
            <img
              src={currentUser?.profilePhoto}
              alt="Me"
              className="w-12 h-12 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={`What's happening in your local neighborhood right now, ${currentUser?.name.split(' ')[0]}?`}
                rows={3}
                className="w-full border-none focus:outline-none resize-none text-[14px] text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Conditional Media URL or Poll input templates */}
          {(postType === 'image' || postType === 'video') && (
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                {postType} Link / URL
              </label>
              <input
                type="text"
                placeholder={`Paste ${postType} link (e.g. Unsplash / Picsum)`}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full text-xs bg-white rounded-xl border border-gray-100 p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {postType === 'poll' && (
            <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Poll Options Selection
              </span>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const copy = [...pollOptions];
                      copy[i] = e.target.value;
                      setPollOptions(copy);
                    }}
                    className="flex-1 text-xs bg-white rounded-xl border border-gray-100 p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-500 font-semibold px-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-[11px] text-teal-600 font-bold flex items-center gap-1"
              >
                <Plus size={12} /> Add Choice Option
              </button>
            </div>
          )}

          {/* Post Footer tools selector */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPostType('image')}
                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold select-none ${
                  postType === 'image' ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Image size={15} />
                <span className="hidden sm:inline">Image</span>
              </button>
              <button
                type="button"
                onClick={() => setPostType('video')}
                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold select-none ${
                  postType === 'video' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Video size={15} />
                <span className="hidden sm:inline">Video</span>
              </button>
              <button
                type="button"
                onClick={() => setPostType('poll')}
                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold select-none ${
                  postType === 'poll' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <BarChart2 size={15} />
                <span className="hidden sm:inline">Poll</span>
              </button>
              {postType !== 'text' && (
                <button
                  type="button"
                  onClick={() => {
                    setPostType('text');
                    setMediaUrl('');
                  }}
                  className="p-2 rounded-xl text-xs font-bold text-gray-400 px-3"
                >
                  Clear Type
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <span>{isPosting ? 'Publishing...' : 'Share Post'}</span>
              <Send size={12} />
            </button>
          </div>
        </form>
      </div>

      {/* 3. Distance Radius Filters */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-teal-600 animate-pulse" />
          <h3 className="font-bold text-sm text-gray-800">Geographic Feed Range Filter</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['1', '5', '10', '25', '50', '100', 'global'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                range === r
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {r === 'global' ? 'Global' : `${r} KM`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Posts Feed List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Locating surrounding neighborhood events...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl py-14 px-6 border border-gray-100 text-center space-y-3">
          <p className="text-sm font-semibold text-gray-400">There are no posts inside this range yet.</p>
          <p className="text-xs text-gray-400">Try creating a post of your own, or switch to a wider distance radius filter (like 50km or Global) to inspect regional active neighbor lines!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:ring-1 hover:ring-teal-100/50 transition-all space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setAppView('profile', post.userId)}
                >
                  <img
                    src={post.authorPhoto}
                    alt={post.authorName}
                    className="w-10.5 h-10.5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-gray-800 text-xs sm:text-sm hover:text-teal-600 transition-colors">
                      {post.authorName}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 font-semibold">
                      <span>@{post.authorUsername}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-teal-600 font-mono">
                        <MapPin size={9} />
                        {post.distanceKm === 0 ? 'Here' : `${post.distanceKm} km`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => setReportingPost(post)}
                    className="text-gray-300 hover:text-red-500 p-1"
                    title="Report Content"
                  >
                    <AlertTriangle size={13} />
                  </button>
                </div>
              </div>

              {/* Content text */}
              <p className="text-[14px] text-gray-700 leading-relaxed break-words">{post.content}</p>

              {/* Render Media */}
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-gray-50 bg-gray-50">
                  {post.type === 'video' ? (
                    <video
                      src={post.mediaUrls[0]}
                      controls
                      className="w-full max-h-[360px] object-cover"
                    />
                  ) : (
                    <img
                      src={post.mediaUrls[0]}
                      alt="Post media"
                      className="w-full max-h-[440px] object-cover hover:scale-101 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              )}

              {/* Shared Post Container preview */}
              {post.type === 'shared' && post.sharedPost && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={post.sharedPost.authorPhoto}
                      className="w-6.5 h-6.5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[11px] font-bold text-gray-700">
                      @{post.sharedPost.authorUsername}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{post.sharedPost.content}</p>
                </div>
              )}

              {/* Poll Render Options */}
              {post.type === 'poll' && post.pollOptions && (
                <div className="space-y-2 p-3 bg-teal-50/20 rounded-2xl border border-teal-100/40">
                  {post.pollOptions.map((opt) => {
                    const totalVotes = post.pollOptions!.reduce((sum, o) => sum + o.votes.length, 0);
                    const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                    const hasVoted = opt.votes.includes(currentUser?.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleVote(post.id, opt.id)}
                        className="relative w-full text-left p-3.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-100 hover:bg-gray-50 transition-all overflow-hidden flex justify-between items-center"
                      >
                        {/* Vote Percent background bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-teal-100/40 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative z-10 flex items-center gap-2">
                          {hasVoted && <CheckCircle2 size={13} className="text-teal-600" />}
                          {opt.text}
                        </span>
                        <span className="relative z-10 text-[10px] font-mono font-bold text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded">
                          {pct}% ({opt.votes.length})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleReact(post.id, 'like')}
                    className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                      post.likes.includes(currentUser?.id) ? 'bg-teal-50 text-teal-600' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <Heart size={14} className={post.likes.includes(currentUser?.id) ? 'fill-teal-600' : ''} />
                    <span>{post.likes.length} Likes</span>
                  </button>

                  <button
                    onClick={() => handleReact(post.id, 'love')}
                    className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                      post.loves.includes(currentUser?.id) ? 'bg-rose-50 text-rose-600' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <Heart size={14} className="fill-rose-500 stroke-rose-500" />
                    <span>{post.loves.length} Loves</span>
                  </button>

                  <button
                    onClick={() => handleOpenComments(post.id)}
                    className="p-2 rounded-xl flex items-center gap-1.5 text-xs text-gray-400 hover:bg-gray-50 font-bold transition-all"
                  >
                    <MessageSquare size={14} />
                    <span>Comments</span>
                  </button>
                </div>

                <button
                  onClick={() => setSharingPost(post)}
                  className="p-2 rounded-xl flex items-center gap-1.5 text-xs text-gray-400 hover:bg-gray-50 font-bold"
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">Repose</span>
                </button>
              </div>

              {/* Comments Fold Drawer */}
              {activeCommentId === post.id && (
                <div className="bg-gray-50 rounded-2xl p-4 border-t border-gray-100 space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write your comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-white rounded-xl border border-gray-100 px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700"
                    />
                    <button
                      onClick={() => handleSubmitComment(post.id)}
                      className="p-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-white block"
                    >
                      <Send size={14} />
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                    {(commentsMap[post.id] || []).length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-2">No comments yet. Write yours above!</p>
                    ) : (
                      commentsMap[post.id].map((cmt) => (
                        <div key={cmt.id} className="bg-white p-2.5 rounded-xl border border-gray-100/50 flex gap-2">
                          <img
                            src={cmt.userPhoto}
                            className="w-6.5 h-6.5 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-gray-700">{cmt.userName}</span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{cmt.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stories Viewer Modal overlay */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative bg-zinc-950 w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
            {/* Header sender info */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-900 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
              <div className="flex items-center gap-3">
                <img
                  src={activeStory.userPhoto}
                  className="w-9 h-9 rounded-full object-cover border border-teal-500"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-white text-sm">{activeStory.userName}</h4>
                  <p className="text-[10px] text-zinc-400">Published stories (Expires shortly)</p>
                </div>
              </div>
              <button
                onClick={() => setActiveStory(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Story Visual Frame */}
            <div className="flex-1 flex items-center justify-center bg-black">
              <img
                src={activeStory.mediaUrl}
                alt="Story content"
                className="w-full max-h-[500px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Stories Interactive Reactions and views footer */}
            <div className="bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-around">
                {['🔥', '❤️', '😂', '😮', '😢', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={async () => {
                      // React to story dummy click
                      alert('You reacted ' + emoji + ' to story');
                      setActiveStory(null);
                    }}
                    className="text-2xl hover:scale-130 transition-transform active:scale-95 p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="text-center">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {(activeStory.views || []).length} Views • {(activeStory.reactions || []).length} Reactions
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Story Setup Dialog */}
      {showStoryWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Publish Instagram Story</h3>
            <p className="text-xs text-gray-400">Stories are location-aware, shared with neighbors within 50km, and expire in 24 hours.</p>
            
            <div className="space-y-2">
              <label className="text-[11px] text-gray-400 font-bold uppercase">Insert Story Image URL</label>
              <input
                type="text"
                placeholder="Paste story photo address..."
                value={newStoryMedia}
                onChange={(e) => setNewStoryMedia(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-150 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-gray-400 block">Use premium visual from Unsplash/Picsum.</span>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowStoryWizard(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStory}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
              >
                Upload Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share post preview dialog */}
      {sharingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <form onSubmit={handleSharePost} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Share Post to Neighborhood</h3>
            <textarea
              placeholder="What do you think about this post, or want to add?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="w-full text-xs border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50 text-xs text-gray-600">
              <span className="font-bold italic">@{sharingPost.authorUsername}</span>: {sharingPost.content}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
              >
                Repose to Feed
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Post dialog */}
      {reportingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Report Objectionable Content
            </h3>
            <p className="text-xs text-gray-400">Help keep our community safe and respectful. Tell us what is wrong with this post.</p>
            
            <textarea
              placeholder="Reason (e.g. Hate speech, Spam, Fake coordinates...)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              className="w-full text-xs border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setReportingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportPost}
                className="px-5 py-2 bg-red-650 hover:bg-red-700 rounded-xl text-xs font-semibold text-white bg-red-600"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

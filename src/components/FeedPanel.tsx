/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { timeAgo } from '../utils/time';
import { MediaInput } from './common/MediaInput';
import { ReportDialog, ReportTarget } from './common/ReportDialog';
import { Avatar, EmptyState, LoadMore, Spinner, distanceLabel, errorText } from './common/ui';
import { Comment, MemberSummary, Post, Story, StoryGroup, User } from '../types';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  Heart,
  Image,
  MapPin,
  MessageSquare,
  Plus,
  Send,
  Share2,
  Trash2,
  Video,
  X
} from 'lucide-react';

interface FeedPanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
  /** Post to scroll to and open comments for (from a notification) */
  focusPostId?: string;
}

const STORY_REACTIONS = ['🔥', '❤️', '😂', '😮', '😢', '👏'];
const STORY_IMAGE_MS = 5000;

// ---------- Comments (with one level of replies) ----------
function CommentsSection({
  post,
  currentUser,
  setAppView,
  onCountChange,
  onReport
}: {
  post: Post;
  currentUser: User;
  setAppView: FeedPanelProps['setAppView'];
  onCountChange: (count: number) => void;
  onReport: (t: ReportTarget) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getComments(post.id)
      .then(setComments)
      .catch((err) => toast.error(errorText(err, 'Could not load comments.')))
      .finally(() => setIsLoading(false));
  }, [post.id]);

  const update = (next: Comment[]) => {
    setComments(next);
    onCountChange(next.length);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const created = await api.submitComment(post.id, text.trim(), replyTo?.id);
      update([...comments, created]);
      setText('');
      setReplyTo(null);
    } catch (err) {
      toast.error(errorText(err, 'Could not post comment.'));
    }
  };

  const saveEdit = async () => {
    if (!editing || !editing.text.trim()) return;
    try {
      const saved = await api.editComment(editing.id, editing.text.trim());
      setComments(comments.map((c) => (c.id === saved.id ? { ...c, content: saved.content, editedAt: saved.editedAt } : c)));
      setEditing(null);
    } catch (err) {
      toast.error(errorText(err, 'Could not save comment.'));
    }
  };

  const remove = async (c: Comment) => {
    if (!(await confirmAction('Delete this comment?', 'Delete'))) return;
    try {
      await api.deleteComment(c.id);
      update(comments.filter((x) => x.id !== c.id && x.parentId !== c.id));
    } catch (err) {
      toast.error(errorText(err, 'Could not delete comment.'));
    }
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const renderComment = (c: Comment, isReply = false) => {
    const mine = c.isMine || c.userId === currentUser.id;
    const canDelete = mine || post.userId === currentUser.id || currentUser.isAdmin;
    return (
      <div key={c.id} className={`flex gap-2 ${isReply ? 'ml-9' : ''}`}>
        <button onClick={() => setAppView('profile', c.userId)} className="shrink-0">
          <Avatar src={c.userPhoto} name={c.userName} className="w-7 h-7 rounded-full text-[9px]" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setAppView('profile', c.userId)} className="text-xs font-bold text-gray-800 hover:text-teal-700 truncate">
                {c.userName}
              </button>
              <span className="text-[11px] text-gray-400 shrink-0">
                {timeAgo(c.createdAt)}
                {c.editedAt ? ' · edited' : ''}
              </span>
            </div>
            {editing?.id === c.id ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={editing.text}
                  maxLength={1000}
                  onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
                <button onClick={saveEdit} className="text-xs font-semibold text-teal-700">Save</button>
                <button onClick={() => setEditing(null)} className="text-xs text-gray-500">Cancel</button>
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-0.5 break-words">{c.content}</p>
            )}
          </div>
          <div className="flex gap-3 px-2 mt-1 text-[11px] font-semibold text-gray-500">
            <button
              onClick={() => {
                setReplyTo(c);
                inputRef.current?.focus();
              }}
              className="hover:text-teal-700"
            >
              Reply
            </button>
            {mine && (
              <button onClick={() => setEditing({ id: c.id, text: c.content })} className="hover:text-teal-700">
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => remove(c)} className="hover:text-red-600">
                Delete
              </button>
            )}
            {!mine && (
              <button onClick={() => onReport({ type: 'comment', id: c.id })} className="hover:text-red-600">
                Report
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-xs text-gray-400 text-center py-2">Loading comments...</p>
        ) : topLevel.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-2">No comments yet. Be the first!</p>
        ) : (
          topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              {renderComment(c)}
              {repliesOf(c.id).map((r) => renderComment(r, true))}
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="space-y-1.5">
        {replyTo && (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            Replying to <strong className="text-gray-700">{replyTo.userName}</strong>
            <button type="button" onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-700" aria-label="Cancel reply">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-white rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700"
          />
          <button type="submit" className="px-3 bg-teal-600 hover:bg-teal-700 rounded-xl text-white" aria-label="Send comment">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Story viewer ----------
function StoryViewer({
  groups,
  startGroup,
  currentUser,
  onClose,
  onDeleted,
  onReport
}: {
  groups: StoryGroup[];
  startGroup: number;
  currentUser: User;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onReport: (t: ReportTarget) => void;
}) {
  const [groupIdx, setGroupIdx] = useState(startGroup);
  const [storyIdx, setStoryIdx] = useState(0);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ user: MemberSummary; viewedAt: string; reaction: string | null }[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const next = useCallback(() => {
    if (!group) return;
    setShowViewers(false);
    if (storyIdx < group.stories.length - 1) setStoryIdx(storyIdx + 1);
    else if (groupIdx < groups.length - 1) {
      setGroupIdx(groupIdx + 1);
      setStoryIdx(0);
    } else onClose();
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const prev = () => {
    if (!group) return;
    setShowViewers(false);
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
    else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1);
      setStoryIdx(groups[groupIdx - 1].stories.length - 1);
    }
  };

  useEffect(() => {
    if (!story) return;
    setMyReaction(story.myReaction || null);
    if (story.userId !== currentUser.id && !story.seen) {
      api.viewStory(story.id).catch(() => undefined);
    }
    if (showViewers) return;
    if (story.mediaType === 'video') return; // videos advance onEnded
    const timer = window.setTimeout(next, STORY_IMAGE_MS);
    return () => window.clearTimeout(timer);
  }, [story?.id, showViewers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!group || !story) return null;
  const mine = story.isMine || story.userId === currentUser.id;

  const react = async (emoji: string) => {
    try {
      await api.reactToStory(story.id, emoji);
      setMyReaction(emoji);
    } catch (err) {
      toast.error(errorText(err, 'Could not send reaction.'));
    }
  };

  const remove = async () => {
    if (!(await confirmAction('Delete this story?', 'Delete'))) return;
    try {
      await api.deleteStory(story.id);
      onDeleted(story.id);
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not delete story.'));
    }
  };

  const toggleViewers = async () => {
    if (showViewers) {
      setShowViewers(false);
      return;
    }
    setShowViewers(true);
    setIsLoadingViewers(true);
    try {
      const data = await api.getStoryViewers(story.id);
      setViewers(data);
    } catch (err) {
      toast.error(errorText(err, 'Could not load viewers list.'));
    } finally {
      setIsLoadingViewers(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="relative bg-zinc-950 w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[min(720px,92vh)]">
        {/* Progress bars */}
        <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              <div className={`h-full bg-white ${i < storyIdx ? 'w-full' : i === storyIdx ? 'w-full animate-pulse' : 'w-0'}`} />
            </div>
          ))}
        </div>

        <div className="p-4 pt-6 flex items-center justify-between absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={group.userPhoto} name={group.userName} className="w-9 h-9 rounded-full border border-teal-500 text-xs" />
            <div className="min-w-0">
              <h4 className="font-bold text-white text-sm truncate">{mine ? 'Your story' : group.userName}</h4>
              <p className="text-[11px] text-zinc-400">{timeAgo(story.createdAt)} · disappears after 24 hours</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mine ? (
              <button onClick={remove} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Delete story">
                <Trash2 size={14} />
              </button>
            ) : (
              <button onClick={() => onReport({ type: 'story', id: story.id })} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Report story">
                <AlertTriangle size={14} />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-black relative">
          {story.mediaType === 'video' ? (
            <video key={story.id} src={story.mediaUrl} autoPlay playsInline controls onEnded={next} className="w-full max-h-full object-contain" />
          ) : (
            <img src={story.mediaUrl} alt="Story" className="w-full max-h-full object-contain" referrerPolicy="no-referrer" />
          )}
          <button onClick={prev} className="absolute left-0 top-16 bottom-16 w-1/4 flex items-center justify-start pl-2 text-white/60 hover:text-white" aria-label="Previous">
            <ChevronLeft size={28} />
          </button>
          <button onClick={next} className="absolute right-0 top-16 bottom-16 w-1/4 flex items-center justify-end pr-2 text-white/60 hover:text-white" aria-label="Next">
            <ChevronRight size={28} />
          </button>

          {/* Viewers modal popup over story */}
          {showViewers && (
            <div className="absolute inset-x-0 bottom-0 top-16 bg-black/85 backdrop-blur-md p-4 text-white z-20 flex flex-col rounded-t-3xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <Eye size={16} className="text-teal-400" /> Viewers ({story.viewsCount || 0})
                </h4>
                <button onClick={() => setShowViewers(false)} className="text-zinc-400 hover:text-white p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 space-y-2">
                {isLoadingViewers ? (
                  <p className="text-center text-xs text-zinc-400 py-6">Loading viewers...</p>
                ) : viewers.length === 0 ? (
                  <p className="text-center text-xs text-zinc-400 py-6">No views yet.</p>
                ) : (
                  viewers.map((v) => (
                    <div key={v.user.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={v.user.profilePhoto} name={v.user.name} className="w-8 h-8 rounded-full text-xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{v.user.name}</p>
                          <p className="text-[10px] text-zinc-400">@{v.user.username} · {timeAgo(v.viewedAt)}</p>
                        </div>
                      </div>
                      {v.reaction && <span className="text-lg">{v.reaction}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 p-4 space-y-3">
          {mine ? (
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <button
                onClick={toggleViewers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
              >
                <Eye size={14} className="text-teal-400" />
                {story.viewsCount || 0} {(story.viewsCount || 0) === 1 ? 'view' : 'views'}
              </button>
              <span className="text-zinc-400 font-semibold text-xs">
                {story.reactionsCount || 0} {(story.reactionsCount || 0) === 1 ? 'reaction' : 'reactions'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-around">
              {STORY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  className={`text-2xl p-1.5 rounded-xl transition-transform hover:scale-125 ${myReaction === emoji ? 'bg-white/15 scale-110' : ''}`}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Feed Panel ----------
export function FeedPanel({ currentUser, setAppView, triggerNotificationRefresh, focusPostId }: FeedPanelProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [range, setRange] = useState<string>(focusPostId ? 'global' : '25');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Composer
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'poll'>('text');
  const [newContent, setNewContent] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Per-post UI
  const [openComments, setOpenComments] = useState<Set<string>>(() => new Set(focusPostId ? [focusPostId] : []));
  const [editingPost, setEditingPost] = useState<{ id: string; text: string } | null>(null);

  // Dialogs
  const [storyViewerGroup, setStoryViewerGroup] = useState<number | null>(null);
  const [showStoryWizard, setShowStoryWizard] = useState<boolean>(false);
  const [newStoryMedia, setNewStoryMedia] = useState<string>('');
  const [newStoryType, setNewStoryType] = useState<'image' | 'video'>('image');
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [shareText, setShareText] = useState<string>('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const page = await api.getFeed(range);
      let items = page.items;

      // If opening a focused post from notification not already in page
      if (focusPostId && !items.some((p) => p.id === focusPostId)) {
        try {
          const focused = await api.getPost(focusPostId);
          items = [focused, ...items];
        } catch {
          // Post may have been deleted
        }
      }

      setPosts(items);
      setNextCursor(page.next);
    } catch (err) {
      toast.error(errorText(err, 'Could not load the feed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await api.getFeed(range, nextCursor);
      setPosts((prev) => [...prev, ...page.items]);
      setNextCursor(page.next);
    } catch (err) {
      toast.error(errorText(err, 'Could not load more posts.'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchStories = async () => {
    try {
      const groups = await api.getStories();
      // Sort own story group first
      groups.sort((a, b) => Number(b.userId === currentUser.id) - Number(a.userId === currentUser.id));
      setStoryGroups(groups);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [range, currentUser.location.latitude, currentUser.location.longitude]);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, [currentUser.location.latitude, currentUser.location.longitude]);

  // Scroll to the post a notification pointed at
  useEffect(() => {
    if (!focusPostId || isLoading) return;
    const el = document.getElementById(`post-${focusPostId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (posts.length > 0) toast.info('That post is no longer available.');
  }, [focusPostId, isLoading, posts.length]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { type: postType, content: newContent.trim() };
    if (postType === 'image' || postType === 'video') {
      if (!mediaUrl.trim()) {
        toast.error(`Please upload a ${postType} from your device.`);
        return;
      }
      payload.mediaUrls = [mediaUrl.trim()];
    } else if (postType === 'poll') {
      payload.pollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (payload.pollOptions.length < 2) {
        toast.error('A poll needs at least 2 options.');
        return;
      }
    }
    if (!payload.content && !payload.mediaUrls) return;

    setIsPosting(true);
    try {
      await api.createPost(payload);
      setNewContent('');
      setMediaUrl('');
      setPollOptions(['', '']);
      setPostType('text');
      fetchFeed();
      toast.success('Post published!');
    } catch (err) {
      toast.error(errorText(err, 'Could not publish your post.'));
    } finally {
      setIsPosting(false);
    }
  };

  const patchPost = (id: string, updated: Post | Partial<Post>) => {
    setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const handleReact = async (id: string, reaction: 'like' | 'love') => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const nextReaction = post.myReaction === reaction ? null : reaction;
    try {
      const updated = await api.setReaction(id, nextReaction);
      patchPost(id, updated);
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not update reaction.'));
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    try {
      const updated = await api.votePoll(postId, optionId);
      patchPost(postId, updated);
    } catch (err) {
      toast.error(errorText(err, 'Could not submit vote.'));
    }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((set) => {
      const next = new Set(set);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const saveEditedPost = async () => {
    if (!editingPost) return;
    try {
      const saved = await api.editPost(editingPost.id, editingPost.text.trim());
      patchPost(saved.id, { content: saved.content, editedAt: saved.editedAt });
      setEditingPost(null);
      toast.success('Post updated.');
    } catch (err) {
      toast.error(errorText(err, 'Could not save post.'));
    }
  };

  const deletePost = async (post: Post) => {
    if (!(await confirmAction('Delete this post? Its comments will be deleted too.', 'Delete'))) return;
    try {
      await api.deletePost(post.id);
      setPosts((list) => list.filter((p) => p.id !== post.id));
      toast.success('Post deleted.');
    } catch (err) {
      toast.error(errorText(err, 'Could not delete post.'));
    }
  };

  const handleCreateStory = async () => {
    if (!newStoryMedia.trim()) return;
    try {
      await api.createStory(newStoryMedia.trim());
      setNewStoryMedia('');
      setNewStoryType('image');
      setShowStoryWizard(false);
      fetchStories();
      toast.success('Story shared.');
    } catch (err) {
      toast.error(errorText(err, 'Could not share your story.'));
    }
  };

  const handleSharePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingPost) return;
    try {
      await api.createPost({ type: 'shared', content: shareText.trim(), sharedPostId: sharingPost.sharedPostId || sharingPost.id });
      setSharingPost(null);
      setShareText('');
      fetchFeed();
      toast.success('Reposted.');
    } catch (err) {
      toast.error(errorText(err, 'Could not repost.'));
    }
  };

  const composerButton = (type: typeof postType, icon: React.ReactNode, label: string, active: string) => (
    <button
      type="button"
      onClick={() => setPostType(postType === type ? 'text' : type)}
      className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold ${postType === type ? active : 'text-gray-500 hover:bg-gray-50'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Stories list */}
      <div className="flex items-start gap-3 bg-white p-4 rounded-3xl border border-gray-200 overflow-x-auto">
        <button className="flex flex-col items-center shrink-0" onClick={() => setShowStoryWizard(true)}>
          <span className="w-16 h-16 rounded-full border-2 border-dashed border-teal-500/50 flex items-center justify-center bg-teal-50 hover:bg-teal-100">
            <Plus size={24} className="text-teal-600" />
          </span>
          <span className="text-[11px] font-semibold text-gray-500 mt-1.5">New Story</span>
        </button>

        {storyGroups.map((g, i) => (
          <button key={g.userId} onClick={() => setStoryViewerGroup(i)} className="flex flex-col items-center shrink-0">
            <span className={`relative w-16 h-16 rounded-full p-[3px] ${g.allSeen ? 'bg-gray-300' : 'bg-gradient-to-tr from-teal-500 via-emerald-400 to-amber-400'}`}>
              <Avatar src={g.userPhoto} name={g.userName} className="w-full h-full rounded-full border-2 border-white text-xs" />
              {g.stories.length > 1 && (
                <span className="absolute -bottom-1 -right-1 bg-gray-900 border border-white text-[11px] font-bold text-white px-1.5 rounded-full">{g.stories.length}</span>
              )}
            </span>
            <span className="text-[11px] font-semibold text-gray-700 mt-1.5 max-w-[70px] truncate">
              {g.userId === currentUser.id ? 'Your story' : g.userName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-4">
            <Avatar src={currentUser.profilePhoto} name={currentUser.name} className="w-12 h-12 rounded-full shrink-0" />
            <textarea
              value={newContent}
              maxLength={2000}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={postType === 'poll' ? 'Ask your neighbors a question...' : `What's happening nearby, ${currentUser.name.split(' ')[0]}?`}
              rows={3}
              className="flex-1 border-none focus:outline-none resize-none text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          {(postType === 'image' || postType === 'video') && (
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{postType === 'image' ? 'Upload Photo' : 'Upload Video'}</label>
              <MediaInput
                value={mediaUrl}
                onChange={(url) => setMediaUrl(url)}
                accept={[postType]}
                allowLinks={false}
                placeholder="Upload from your device"
                inputClassName="w-full text-xs bg-white rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {postType === 'poll' && (
            <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Poll options</span>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    maxLength={100}
                    onChange={(e) => setPollOptions(pollOptions.map((o, idx) => (idx === i ? e.target.value : o)))}
                    className="flex-1 text-xs bg-white rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="text-xs text-red-500 font-semibold px-2">
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-teal-700 font-bold flex items-center gap-1">
                  <Plus size={12} /> Add option
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex gap-1">
              {composerButton('image', <Image size={15} />, 'Photo', 'bg-amber-50 text-amber-700')}
              {composerButton('video', <Video size={15} />, 'Video', 'bg-purple-50 text-purple-700')}
              {composerButton('poll', <BarChart2 size={15} />, 'Poll', 'bg-teal-50 text-teal-700')}
            </div>
            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              {isPosting ? 'Publishing...' : 'Share Post'} <Send size={12} />
            </button>
          </div>
        </form>
      </div>

      {/* Distance filter */}
      <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <MapPin size={18} className="text-teal-600" /> Show posts within
        </h3>
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['1', '5', '10', '25', '50', '100', 'global'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-xl text-xs font-semibold ${
                range === r ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {r === 'global' ? 'Anywhere' : `${r} km`}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <Spinner label="Loading posts..." />
      ) : posts.length === 0 ? (
        <EmptyState
          title="There are no posts in this area yet."
          text="Write the first post, or choose a wider distance above."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const mine = post.isMine || post.userId === currentUser.id;
            const liked = post.myReaction === 'like';
            const loved = post.myReaction === 'love';
            return (
              <article
                id={`post-${post.id}`}
                key={post.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-4 scroll-mt-24 ${post.id === focusPostId ? 'border-teal-400 ring-2 ring-teal-100' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => setAppView('profile', post.userId)}>
                    <Avatar src={post.authorPhoto} name={post.authorName} className="w-10 h-10 rounded-full" />
                    <span className="min-w-0">
                      <span className="font-bold text-gray-800 text-sm hover:text-teal-700 block truncate">{post.authorName}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold">
                        <span className="truncate">@{post.authorUsername}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-teal-700 shrink-0">
                          <MapPin size={10} /> {distanceLabel(post.distanceKm) || 'Nearby'}
                        </span>
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1 mr-1" title={new Date(post.createdAt).toLocaleString()}>
                      <Clock size={11} /> {timeAgo(post.createdAt)}
                      {post.editedAt ? ' · edited' : ''}
                    </span>
                    {mine && (
                      <button onClick={() => setEditingPost({ id: post.id, text: post.content })} className="text-gray-400 hover:text-teal-700 p-1" title="Edit post">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {(mine || currentUser.isAdmin) && (
                      <button onClick={() => deletePost(post)} className="text-gray-400 hover:text-red-600 p-1" title="Delete post">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {!mine && (
                      <button onClick={() => setReportTarget({ type: 'post', id: post.id })} className="text-gray-300 hover:text-red-500 p-1" title="Report post">
                        <AlertTriangle size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {editingPost?.id === post.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingPost.text}
                      maxLength={2000}
                      onChange={(e) => setEditingPost({ id: post.id, text: e.target.value })}
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
                      <button onClick={saveEditedPost} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white">Save</button>
                    </div>
                  </div>
                ) : (
                  post.content && <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-line">{post.content}</p>
                )}

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="rounded-2xl overflow-hidden bg-gray-50">
                    {post.type === 'video' ? (
                      <video src={post.mediaUrls[0]} controls playsInline className="w-full max-h-[420px] bg-black" />
                    ) : (
                      <img src={post.mediaUrls[0]} alt="" className="w-full max-h-[480px] object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    )}
                  </div>
                )}

                {post.type === 'shared' && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                    {post.sharedPost ? (
                      <>
                        <button onClick={() => setAppView('profile', post.sharedPost!.userId)} className="flex items-center gap-2">
                          <Avatar src={post.sharedPost.authorPhoto} name={post.sharedPost.authorName} className="w-6 h-6 rounded-full text-[9px]" />
                          <span className="text-xs font-bold text-gray-700">@{post.sharedPost.authorUsername}</span>
                        </button>
                        {post.sharedPost.content && <p className="text-sm text-gray-600">{post.sharedPost.content}</p>}
                        {post.sharedPost.mediaUrls?.[0] &&
                          (post.sharedPost.type === 'video' ? (
                            <video src={post.sharedPost.mediaUrls[0]} controls className="w-full max-h-64 rounded-xl bg-black" />
                          ) : (
                            <img src={post.sharedPost.mediaUrls[0]} alt="" className="w-full max-h-64 object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ))}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 italic">The original post was deleted.</p>
                    )}
                  </div>
                )}

                {post.type === 'poll' && post.pollOptions && (
                  <div className="space-y-2 p-3 bg-teal-50/40 rounded-2xl border border-teal-100">
                    {post.pollOptions.map((opt) => {
                      const voted = post.myVoteOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleVote(post.id, opt.id)}
                          className={`relative w-full text-left p-3 rounded-xl text-sm font-semibold transition-all overflow-hidden flex justify-between items-center ${
                            voted ? 'bg-teal-50 border-2 border-teal-500 text-teal-900 shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="absolute left-0 top-0 bottom-0 bg-teal-100/60 transition-all duration-300" style={{ width: `${opt.percent}%` }} />
                          <span className="relative flex items-center gap-2">
                            {voted && <CheckCircle2 size={14} className="text-teal-600 shrink-0" />}
                            {opt.text}
                          </span>
                          <span className="relative text-xs font-bold text-teal-800 shrink-0">
                            {opt.percent}% ({opt.votes})
                          </span>
                        </button>
                      );
                    })}
                    <p className="text-[11px] text-gray-500 px-1">{post.totalVotes} {post.totalVotes === 1 ? 'vote' : 'votes'}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => handleReact(post.id, 'like')}
                      className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold ${liked ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Heart size={14} className={liked ? 'fill-teal-600' : ''} /> {post.likesCount}
                      <span className="hidden sm:inline">{post.likesCount === 1 ? 'Like' : 'Likes'}</span>
                    </button>
                    <button
                      onClick={() => handleReact(post.id, 'love')}
                      className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold ${loved ? 'bg-rose-50 text-rose-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Heart size={14} className={loved ? 'fill-rose-500 stroke-rose-500' : 'stroke-rose-400'} /> {post.lovesCount}
                      <span className="hidden sm:inline">{post.lovesCount === 1 ? 'Love' : 'Loves'}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold ${openComments.has(post.id) ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <MessageSquare size={14} /> {post.commentCount || 0}
                      <span className="hidden sm:inline">{post.commentCount === 1 ? 'Comment' : 'Comments'}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSharingPost(post);
                      setShareText('');
                    }}
                    className="p-2 rounded-xl flex items-center gap-1.5 text-xs text-gray-500 hover:bg-gray-50 font-bold"
                  >
                    <Share2 size={14} /> <span className="hidden sm:inline">Repost</span>
                  </button>
                </div>

                {openComments.has(post.id) && (
                  <CommentsSection
                    post={post}
                    currentUser={currentUser}
                    setAppView={setAppView}
                    onCountChange={(count) => patchPost(post.id, { commentCount: count })}
                    onReport={setReportTarget}
                  />
                )}
              </article>
            );
          })}

          {nextCursor && <LoadMore onClick={handleLoadMore} isLoading={isLoadingMore} />}
        </div>
      )}

      {storyViewerGroup !== null && storyGroups[storyViewerGroup] && (
        <StoryViewer
          groups={storyGroups}
          startGroup={storyViewerGroup}
          currentUser={currentUser}
          onClose={() => {
            setStoryViewerGroup(null);
            fetchStories();
          }}
          onDeleted={(id) => {
            setStoryGroups((list) =>
              list
                .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== id) }))
                .filter((g) => g.stories.length > 0)
            );
          }}
          onReport={setReportTarget}
        />
      )}

      {showStoryWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Add a Story</h3>
            <p className="text-xs text-gray-500">Stories are shown to people nearby and disappear after 24 hours.</p>
            <div className="flex gap-2">
              {(['image', 'video'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewStoryType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${newStoryType === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {t === 'image' ? 'Photo' : 'Video'}
                </button>
              ))}
            </div>
            <MediaInput
              value={newStoryMedia}
              onChange={(url, kind) => {
                setNewStoryMedia(url);
                if (kind === 'video' || kind === 'image') setNewStoryType(kind);
              }}
              accept={[newStoryType]}
              allowLinks={false}
              placeholder="Upload from your device"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowStoryWizard(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreateStory} disabled={!newStoryMedia.trim()} className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white">
                Share Story
              </button>
            </div>
          </div>
        </div>
      )}

      {sharingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <form onSubmit={handleSharePost} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Repost</h3>
            <textarea
              placeholder="Add a comment (optional)"
              value={shareText}
              maxLength={2000}
              onChange={(e) => setShareText(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-teal-500"
            />
            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50 text-sm text-gray-600">
              <span className="font-bold">@{sharingPost.sharedPost?.authorUsername || sharingPost.authorUsername}</span>:{' '}
              {sharingPost.sharedPost?.content || sharingPost.content}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setSharingPost(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white">Repost</button>
            </div>
          </form>
        </div>
      )}

      {reportTarget && <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />}
    </div>
  );
}

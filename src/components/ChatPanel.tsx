/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { formatListTime, formatMessageTime } from '../utils/time';
import { ChatGroup, Message, User } from '../types';
import { ArrowLeft, Group, LogOut, Mic, Paperclip, Plus, Search, Send, Square, Users, X } from 'lucide-react';

interface ChatPanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
  /** Conversation to open right away (from a profile, a shop or a notification) */
  initialThreadId?: string;
}

const POLL_MS = 4000;
const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function ChatPanel({ currentUser, setAppView, triggerNotificationRefresh, initialThreadId }: ChatPanelProps) {
  const [threads, setThreads] = useState<ChatGroup[]>([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Voice notes
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Group wizard
  const [showGroupWizard, setShowGroupWizard] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [neighbors, setNeighbors] = useState<(User & { distanceKm?: number })[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  const fetchThreads = async () => {
    try {
      setThreads(await api.getThreads());
    } catch (err) {
      console.error(err);
    } finally {
      setThreadsLoaded(true);
    }
  };

  // Only replace the message list when something actually changed, so polling doesn't disturb scrolling
  const fetchMessages = async (threadId: string) => {
    try {
      const list: Message[] = await api.getMessages(threadId);
      setMessages((current) => {
        const same = current.length === list.length && current[current.length - 1]?.id === list[list.length - 1]?.id;
        return same ? current : list;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, POLL_MS * 2);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    setMessages([]);
    lastMessageIdRef.current = null;
    setShowMembers(false);
    fetchMessages(activeThreadId).then(() => {
      fetchThreads(); // unread counts
      triggerNotificationRefresh();
    });
    const interval = setInterval(() => fetchMessages(activeThreadId), POLL_MS);
    return () => clearInterval(interval);
  }, [activeThreadId]);

  // Scroll down when a new message arrives, unless the user scrolled up to read older ones
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastMessageIdRef.current) return;
    const firstLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = last.id;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (firstLoad || nearBottom || last.senderId === currentUser.id) {
      el.scrollTo({ top: el.scrollHeight, behavior: firstLoad ? 'auto' : 'smooth' });
    }
  }, [messages]);

  /** Sends a message; returns false (after showing the error) if it failed. */
  const send = async (content: string, file?: { mediaUrl: string; mediaType: string }): Promise<boolean> => {
    if (!activeThreadId || (!content.trim() && !file)) return false;
    setIsSending(true);
    try {
      const msg = await api.sendMessage(activeThreadId, content.trim(), file);
      setMessages((list) => [...list, msg]);
      fetchThreads();
      return true;
    } catch (err) {
      toast.error(errorText(err, 'Message not sent.'));
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = typedMessage;
    if (!text.trim()) return;
    setTypedMessage('');
    if (!(await send(text))) setTypedMessage(text); // keep what they typed if sending failed
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let uploaded;
    try {
      uploaded = await api.uploadFile(file);
    } catch (err) {
      toast.error(errorText(err, 'Could not upload the file.'));
      return;
    }
    if (await send(typedMessage, { mediaUrl: uploaded.url, mediaType: uploaded.kind === 'audio' ? 'voice' : uploaded.kind })) {
      setTypedMessage('');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType.split(';')[0] || 'audio/webm' });
        if (blob.size === 0) return;
        try {
          const uploaded = await api.uploadFile(blob);
          await send('', { mediaUrl: uploaded.url, mediaType: 'voice' });
        } catch (err) {
          toast.error(errorText(err, 'Could not upload the voice note.'));
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error('Microphone permission was denied.');
    }
  };

  const openGroupWizard = async () => {
    setShowGroupWizard(true);
    try {
      setNeighbors(await api.discoverPeople({ range: 'global' }));
    } catch (err) {
      toast.error(errorText(err, 'Could not load people.'));
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      toast.error('Give the group a name and pick at least one person.');
      return;
    }
    try {
      const group = await api.startGroupChat(groupName.trim(), selectedGroupMembers);
      setShowGroupWizard(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      await fetchThreads();
      setActiveThreadId(group.id);
    } catch (err) {
      toast.error(errorText(err, 'Could not create the group.'));
    }
  };

  const leaveGroup = async () => {
    if (!activeThread) return;
    if (!(await confirmAction(`Leave "${activeThread.name}"? You will stop receiving its messages.`, 'Leave'))) return;
    try {
      await api.leaveGroup(activeThread.id);
      setActiveThreadId(null);
      fetchThreads();
      toast.success('You left the group.');
    } catch (err) {
      toast.error(errorText(err, 'Could not leave the group.'));
    }
  };

  const filteredNeighbors = neighbors.filter((n) => n.name.toLowerCase().includes(memberSearch.toLowerCase()));
  const pendingInitial = initialThreadId && threadsLoaded && !activeThread && activeThreadId === initialThreadId;

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm h-[calc(100vh-200px)] min-h-[480px] grid grid-cols-1 md:grid-cols-3">
      {/* Conversation list */}
      <div className={`md:col-span-1 border-r border-gray-100 flex flex-col min-h-0 ${activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-sm flex items-center gap-1.5 font-display text-teal-700">
            <Users size={16} /> Messages
          </h3>
          <button onClick={openGroupWizard} className="w-8 h-8 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 flex items-center justify-center" title="New group chat">
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {!threadsLoaded ? (
            <p className="text-center text-xs text-gray-400 py-12">Loading...</p>
          ) : threads.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-12 px-4">No conversations yet. Start one from someone's profile or the People page.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`w-full p-4 flex gap-3 items-center text-left hover:bg-teal-50/40 ${activeThreadId === t.id ? 'bg-teal-50' : ''}`}
              >
                <span className="relative shrink-0">
                  <img src={t.coverPhoto} alt="" className="w-11 h-11 rounded-xl object-cover bg-gray-100" referrerPolicy="no-referrer" />
                  {!!t.unreadCount && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[11px] font-bold text-white min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                      {t.unreadCount}
                    </span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex justify-between items-start gap-2">
                    <span className={`text-sm text-gray-800 truncate ${t.unreadCount ? 'font-bold' : 'font-semibold'}`}>{t.name}</span>
                    <span className="text-[11px] text-gray-400 shrink-0">{t.lastMessageAt ? formatListTime(t.lastMessageAt) : ''}</span>
                  </span>
                  <span className={`text-xs truncate block mt-0.5 ${t.unreadCount ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{t.lastMessageContent}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className={`md:col-span-2 flex flex-col min-h-0 bg-gray-50/30 ${!activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        {activeThread ? (
          <>
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-2 relative">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setActiveThreadId(null)} className="md:hidden p-1.5 text-teal-700" aria-label="Back to conversations">
                  <ArrowLeft size={18} />
                </button>
                <button
                  className="flex items-center gap-3 min-w-0 text-left"
                  onClick={() => (activeThread.isGroup ? setShowMembers(!showMembers) : activeThread.otherUserId && setAppView('profile', activeThread.otherUserId))}
                >
                  <img src={activeThread.coverPhoto} alt="" className="w-9 h-9 rounded-xl object-cover bg-gray-50 shrink-0" referrerPolicy="no-referrer" />
                  <span className="min-w-0">
                    <span className="font-bold text-gray-800 text-sm block truncate">{activeThread.name}</span>
                    <span className="text-[11px] text-gray-500 font-semibold block">
                      {activeThread.isGroup ? `Group · ${activeThread.memberIds.length} members (tap to see)` : 'View profile'}
                    </span>
                  </span>
                </button>
              </div>
              {activeThread.isGroup && (
                <button onClick={leaveGroup} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-1.5 shrink-0">
                  <LogOut size={14} /> <span className="hidden sm:inline">Leave</span>
                </button>
              )}

              {showMembers && activeThread.members && (
                <div className="absolute top-full left-3 mt-1 z-20 bg-white border border-gray-200 rounded-2xl shadow-lg w-64 max-h-72 overflow-y-auto p-2">
                  <div className="flex justify-between items-center px-2 py-1">
                    <span className="text-xs font-bold text-gray-700">Members</span>
                    <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>
                  {activeThread.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => m.id !== currentUser.id && setAppView('profile', m.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 text-left"
                    >
                      <img src={m.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <span className="text-sm text-gray-700 truncate">{m.id === currentUser.id ? 'You' : m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-12">No messages yet. Say hello!</p>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                      {!isMe && <img src={m.senderPhoto} alt="" className="w-7 h-7 rounded-lg object-cover bg-gray-100 shrink-0" referrerPolicy="no-referrer" />}
                      <div className="space-y-1 min-w-0">
                        {!isMe && activeThread.isGroup && <span className="text-[11px] font-bold text-gray-500 block">{m.senderName}</span>}
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed shadow-xs break-words ${
                            isMe ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-md' : 'bg-white text-gray-700 rounded-bl-md border border-gray-100'
                          }`}
                        >
                          {m.content && <p className="whitespace-pre-line">{m.content}</p>}
                          {m.mediaUrl && (
                            <div className={`${m.content ? 'mt-2' : ''} rounded-xl overflow-hidden max-w-[240px]`}>
                              {m.mediaType === 'image' && (
                                <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={m.mediaUrl} alt="Attachment" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                                </a>
                              )}
                              {m.mediaType === 'video' && <video src={m.mediaUrl} controls playsInline className="w-full bg-black" />}
                              {m.mediaType === 'voice' && <audio src={m.mediaUrl} controls className="w-[220px] max-w-full" />}
                            </div>
                          )}
                        </div>
                        <span className={`text-[11px] text-gray-400 block ${isMe ? 'text-right' : ''}`}>{formatMessageTime(m.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendText} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isSending || isRecording}
                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-center disabled:opacity-50 shrink-0"
                title="Send a photo or video"
              >
                <Paperclip size={18} />
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleAttach} className="hidden" />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isSending}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-gray-50 text-gray-500 hover:bg-teal-50 hover:text-teal-700'
                }`}
                title={isRecording ? 'Stop and send voice note' : 'Record a voice note'}
              >
                {isRecording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <input
                type="text"
                placeholder={isRecording ? 'Recording... tap stop to send' : 'Type a message...'}
                value={typedMessage}
                maxLength={2000}
                disabled={isRecording}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 min-w-0 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 border-none outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button type="submit" disabled={isSending || !typedMessage.trim()} className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0" aria-label="Send">
                <Send size={15} />
              </button>
            </form>
          </>
        ) : pendingInitial ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <p className="text-sm text-gray-600">This conversation is no longer available.</p>
            <button onClick={() => setActiveThreadId(null)} className="text-xs font-semibold text-teal-700 hover:underline">Back to conversations</button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <Group size={44} className="text-gray-300" />
            <h4 className="font-bold text-gray-700 text-sm">Select a conversation</h4>
            <p className="text-xs text-gray-500 max-w-sm">Pick a conversation on the left, or start one from the People page.</p>
          </div>
        )}
      </div>

      {showGroupWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateGroupChat} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800 font-display">New Group Chat</h3>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold uppercase block">Group name</label>
              <input
                type="text"
                placeholder="e.g. Garden Street neighbors"
                value={groupName}
                maxLength={60}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase block">Members ({selectedGroupMembers.length} selected)</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search people..."
                  className="w-full text-sm rounded-xl border border-gray-200 pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl p-2">
                {filteredNeighbors.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-4">No one found.</p>
                ) : (
                  filteredNeighbors.map((n) => (
                    <label key={n.id} className="flex items-center gap-2.5 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGroupMembers.includes(n.id)}
                        onChange={() =>
                          setSelectedGroupMembers((list) => (list.includes(n.id) ? list.filter((id) => id !== n.id) : [...list, n.id]))
                        }
                        className="accent-teal-600"
                      />
                      <img src={n.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{n.name}</span>
                      {n.distanceKm !== undefined && <span className="text-[11px] text-gray-400">{n.distanceKm} km</span>}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowGroupWizard(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold">Create Group</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

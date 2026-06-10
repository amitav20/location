/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { ChatGroup, Message } from '../types';
import { Send, Image, Group, Users, Plus, AlertCircle, Volume2, Mic } from 'lucide-react';

interface ChatPanelProps {
  currentUser: any;
  triggerNotificationRefresh: () => void;
}

export function ChatPanel({ currentUser, triggerNotificationRefresh }: ChatPanelProps) {
  const [threads, setThreads] = useState<ChatGroup[]>([]);
  const [activeThread, setActiveThread] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedMessage, setTypedMessage] = useState<string>('');
  
  // Custom media attachment setups
  const [showMediaInput, setShowMediaInput] = useState<boolean>(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'voice'>('image');

  // Groups and group-wizard states
  const [showGroupWizard, setShowGroupWizard] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const messageBottomRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      const data = await api.getThreads();
      setThreads(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessagesOfThread = async (threadId: string) => {
    try {
      const list = await api.getMessages(threadId);
      setMessages(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNeighbors = async () => {
    try {
      const list = await api.discoverPeople({ range: 'global' });
      setNeighbors(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchThreads();
    fetchNeighbors();
    const interval = setInterval(() => {
      fetchThreads();
      if (activeThread) {
        fetchMessagesOfThread(activeThread.id);
      }
    }, 4000); // 4-second chat loop
    return () => clearInterval(interval);
  }, [activeThread]);

  useEffect(() => {
    if (activeThread) {
      fetchMessagesOfThread(activeThread.id);
    }
  }, [activeThread]);

  useEffect(() => {
    // Scroll chat frame
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = (thread: ChatGroup) => {
    setActiveThread(thread);
    setShowMediaInput(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || (!typedMessage.trim() && !mediaUrl.trim())) return;

    try {
      const file = mediaUrl.trim()
        ? { mediaUrl, mediaType }
        : undefined;

      const res = await api.sendMessage(activeThread.id, typedMessage, file);
      setMessages([...messages, {
        ...res,
        senderName: currentUser?.name || 'Me',
        senderPhoto: currentUser?.profilePhoto
      }]);
      
      setTypedMessage('');
      setMediaUrl('');
      setShowMediaInput(false);
      fetchThreads();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const newGrp = await api.startGroupChat(groupName, selectedGroupMembers);
      setShowGroupWizard(false);
      setGroupName('');
      setSelectedGroupMembers([]);
      fetchThreads();
      setActiveThread(newGrp);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGroupMember = (mId: string) => {
    if (selectedGroupMembers.includes(mId)) {
      setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== mId));
    } else {
      setSelectedGroupMembers([...selectedGroupMembers, mId]);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-[580px] grid grid-cols-1 md:grid-cols-3">
      
      {/* LEFT COLUMN: ACTIVE SESSIONS CHAT LISTS */}
      <div className={`md:col-span-1 border-r border-gray-100 flex flex-col h-full ${activeThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Header toolbar */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 font-display text-teal-600">
            <Users size={16} /> Chat Messenger Threads
          </h3>
          <button
            onClick={() => setShowGroupWizard(true)}
            className="w-8 h-8 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-600 flex items-center justify-center transition-all"
            title="Create Group Hub Chat"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Thread listings */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {threads.length === 0 ? (
            <p className="text-center text-[11px] text-gray-400 py-12 uppercase font-semibold">No ongoing threads lines.</p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectThread(t)}
                className={`p-4 flex gap-3 items-center cursor-pointer hover:bg-teal-50/20 transition-all ${
                  activeThread?.id === t.id ? 'bg-teal-50/50' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={t.coverPhoto}
                    alt={t.name}
                    className="w-11 h-11 rounded-xl object-cover bg-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  {t.unreadCount && t.unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-bold font-mono text-white w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                      {t.unreadCount}
                    </span>
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-gray-800 truncate select-none">{t.name}</h4>
                    <span className="text-[9px] text-gray-400 font-mono font-bold">
                      {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{t.lastMessageContent}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>


      {/* RIGHT COLUMN: ACTIVE CONVERSATION MESSAGES CANVAS */}
      <div className={`md:col-span-2 flex flex-col h-full bg-gray-50/30 ${!activeThread ? 'hidden md:flex' : 'flex'}`}>
        {activeThread ? (
          <>
            {/* Header active interlocutor info */}
            <div className="p-4 border-b border-gray-150 bg-white shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveThread(null)}
                  className="md:hidden text-xs text-teal-600 font-semibold px-2 py-1 rounded"
                >
                  ← Back
                </button>
                <img
                  src={activeThread.coverPhoto}
                  alt={activeThread.name}
                  className="w-9 h-9 rounded-xl object-cover bg-gray-50 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-gray-800 text-xs sm:text-sm leading-none">{activeThread.name}</h4>
                  <span className="text-[9.5px] text-teal-600 font-bold mt-1 block">Live GPS connected</span>
                </div>
              </div>
            </div>

            {/* Bubble messaging field body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[11px] text-gray-400 uppercase font-bold text-center tracking-wider">Start typing. Chat history is clean.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div key={m.id} className={`flex gap-2.5 items-start max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                      {!isMe && (
                        <img
                          src={m.senderPhoto}
                          className="w-7 h-7 rounded-lg object-cover bg-gray-100 shrink-0 mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      <div className="space-y-1">
                        {!isMe && (
                          <span className="text-[9px] font-bold text-gray-400 block">{m.senderName}</span>
                        )}
                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-tr-xs'
                            : 'bg-white text-gray-700 rounded-tl-xs border border-gray-100'
                        }`}>
                          {m.content}

                          {/* Nested attachment types */}
                          {m.mediaUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden max-w-[190px] border border-white/25">
                              {m.mediaType === 'image' && (
                                <img
                                  src={m.mediaUrl}
                                  className="w-full h-auto object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {m.mediaType === 'voice' && (
                                <div className="p-2 bg-black/15 text-white flex items-center gap-2 text-xs">
                                  <Volume2 size={14} className="animate-bounce" />
                                  <span>Simulated Voice Note</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp under bubble */}
                        <span className={`text-[8.5px] text-gray-400 font-mono font-bold block ${isMe ? 'text-right' : ''}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageBottomRef} />
            </div>

            {/* Simulated file attachments setup overlay strip before message footer */}
            {showMediaInput && (
              <div className="bg-white p-3 border-t border-gray-100 flex flex-col gap-2 shadow-inner">
                <div className="flex gap-2 text-xs">
                  {['image', 'voice'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMediaType(t as any)}
                      className={`px-3 py-1.5 rounded-lg font-bold uppercase ${
                        mediaType === t ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {t === 'image' ? 'Attach Photo' : 'Voice Memo File'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste direct URL to attach..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="flex-1 text-xs bg-gray-50 rounded-xl p-2 border border-gray-200 outline-none"
                  />
                  <button
                    onClick={() => setShowMediaInput(false)}
                    className="text-xs text-gray-400 px-2"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Message composer input footer form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className="w-10 h-10 rounded-xl bg-gray-150 text-gray-400 hover:bg-teal-50 hover:text-teal-600 flex items-center justify-center transition-all bg-gray-50"
              >
                {mediaType === 'voice' ? <Mic size={18} /> : <Image size={18} />}
              </button>

              <input
                type="text"
                placeholder="Type your spatial neighborhood message..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 bg-gray-50 rounded-xl px-4 py-2 text-xs text-gray-700 border-none outline-none focus:ring-1 focus:ring-teal-500"
              />

              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all shadow-sm"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <Group size={44} className="text-gray-300 animate-pulse" />
            <h4 className="font-bold text-gray-700 text-sm">Select any Neighborhood Thread</h4>
            <p className="text-xs text-gray-405 max-w-sm">Tap on any user on the left, or open the Discovery Map/Businesses directories to initiate location chats instantly!</p>
          </div>
        )}
      </div>

      {/* CREATE GROUP CHAT POPUP DIALOG WIZARD */}
      {showGroupWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateGroupChat} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-800 font-display">Create Group Chat Hub</h3>
            <p className="text-xs text-gray-400">Launch a multi-user chat room with neighboring members.</p>
            
            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase block">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Lafayette Garden Block"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase block">Select Members</label>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto border border-gray-100 rounded-xl p-2.5">
                {neighbors.length === 0 ? (
                  <p className="text-center text-[11px] text-gray-400 py-4 font-semibold">No neighbors found.</p>
                ) : (
                  neighbors.map((n) => (
                    <label key={n.id} className="flex items-center gap-2.5 p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGroupMembers.includes(n.id)}
                        onChange={() => handleToggleGroupMember(n.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <img src={n.profilePhoto} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs text-gray-700 font-semibold">{n.name} <span className="font-mono text-[9px] text-gray-400">({n.distanceKm}k)</span></span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGroupWizard(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
              >
                Assemble Group
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

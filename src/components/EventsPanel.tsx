/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { LocalEvent } from '../types';
import { Calendar, MapPin, Clock, Plus, Users, Compass, Eye, Share2 } from 'lucide-react';

interface EventsPanelProps {
  currentUser: any;
  triggerNotificationRefresh: () => void;
}

export function EventsPanel({ currentUser, triggerNotificationRefresh }: EventsPanelProps) {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [range, setRange] = useState<string>('50');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Event Payload creation
  const [showEventWizard, setShowEventWizard] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [image, setImage] = useState<string>('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const list = await api.getEvents(range);
      setEvents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [range, currentUser]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !locationName || !date || !time) return;

    try {
      await api.createEvent({
        name,
        description,
        locationName,
        date,
        time,
        image
      });
      setName('');
      setDescription('');
      setLocationName('');
      setDate('');
      setTime('');
      setImage('');
      setShowEventWizard(false);
      fetchEvents();
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleJoin = async (id: string) => {
    try {
      const res = await api.toggleEventJoin(id);
      setEvents(
        events.map((e) => {
          if (e.id === id) {
            return { ...e, participants: res.event.participants };
          }
          return e;
        })
      );
      triggerNotificationRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Head banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Calendar size={22} />
            Nearby Community Events Hub
          </h2>
          <p className="text-xs text-amber-100 mt-1">Join weekly activities, gatherings, and meetups closest to you.</p>
        </div>

        <div className="flex gap-2">
          {/* Create Button */}
          <button
            onClick={() => setShowEventWizard(true)}
            className="px-4 py-2 bg-white text-amber-800 rounded-xl text-xs font-bold shadow-sm hover:bg-amber-50 transition-all flex items-center gap-1.5"
          >
            <Plus size={15} /> Create Local Event
          </button>

          {/* Range filter dropdown */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-black/15 text-white border border-white/20 rounded-xl px-3 py-2 text-xs focus:outline-none"
          >
            <option className="text-gray-700" value="10">Within 10 KM</option>
            <option className="text-gray-700" value="50">Within 50 KM</option>
            <option className="text-gray-700" value="global">Global Events</option>
          </select>
        </div>
      </div>

      {/* Events Board Listings */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Scanning local schedule lines...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center bg-white border border-gray-100 py-16 rounded-3xl space-y-3">
          <Calendar size={34} className="text-amber-505 text-amber-400 mx-auto" />
          <h4 className="font-bold text-gray-750 text-sm">Schedule is currently sterile.</h4>
          <p className="text-xs text-gray-450 max-w-sm mx-auto leading-relaxed">No upcoming activities have been planned within your distance range filter yet. Click &ldquo;Create Local Event&rdquo; to launch yours right away!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((evt) => {
            const hasJoined = evt.participants.includes(currentUser?.id);
            return (
              <div key={evt.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full hover:ring-1 hover:ring-amber-200 transition-all">
                {/* Event Photo with date overlay */}
                <div className="h-44 bg-gray-150 relative">
                  <img
                    src={evt.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=250&fit=crop'}
                    alt={evt.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs text-center">
                    <span className="text-[12px] font-bold text-gray-800 uppercase block font-display">
                      {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 text-sm leading-snug">{evt.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{evt.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin size={13} className="text-amber-500" />
                      <span>{evt.locationName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-amber-500" />
                      <span>{evt.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Users size={13} className="text-amber-505 text-amber-500" />
                      <span>{evt.participants.length} Neighbors Attending</span>
                    </div>
                  </div>

                  {/* Actions Join and Distance metadata */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-[11px] font-bold font-mono text-amber-600 bg-amber-55 bg-amber-50 px-2 py-1 rounded-lg">
                      {evt.distanceKm} KM Away
                    </span>

                    <button
                      onClick={() => handleToggleJoin(evt.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        hasJoined
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-amber-550 text-white hover:bg-amber-600 bg-amber-500'
                      }`}
                    >
                      {hasJoined ? 'Leave Schedule' : 'Join Gathering'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE EVENT DIALOG WIZARD */}
      {showEventWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-3">
            <h3 className="font-bold text-lg text-gray-800">Launch Neighborhood Gathering</h3>
            
            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Block Coffee Chat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-150 p-2.5 outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50/50"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Location Name / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Lafayette Town Square Park"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full rounded-xl border border-gray-150 p-2.5 outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50/50 text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 05:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Event Hero Image URL</label>
                <input
                  type="text"
                  placeholder="Paste cover photo URL..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Description</label>
                <textarea
                  placeholder="What is the gathering about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-150 p-2.5 outline-none bg-gray-50/50"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEventWizard(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-450 hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs"
              >
                Publish Event
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../api';
import { toast, confirmAction } from './Toaster';
import { parseLocalDate } from '../utils/time';
import { MediaInput } from './common/MediaInput';
import type { PickedLocation } from './common/LocationPicker';
import { LocalEvent, User } from '../types';
import { Calendar, Clock, Edit2, MapPin, Plus, Trash2, Users } from 'lucide-react';

// The map picker pulls in Leaflet, so only load it when the form is opened
const LocationPicker = lazy(() => import('./common/LocationPicker').then((m) => ({ default: m.LocationPicker })));

interface EventsPanelProps {
  currentUser: User;
  setAppView: (view: string, targetId?: string) => void;
  triggerNotificationRefresh: () => void;
  focusEventId?: string;
}

interface EventForm {
  id?: string;
  name: string;
  description: string;
  locationName: string;
  date: string;
  time: string;
  image: string;
  location: PickedLocation;
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function EventsPanel({ currentUser, setAppView, triggerNotificationRefresh, focusEventId }: EventsPanelProps) {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [range, setRange] = useState<string>(focusEventId ? 'global' : '50');
  const [showPast, setShowPast] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [form, setForm] = useState<EventForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      setEvents(await api.getEvents(range, showPast));
    } catch (err) {
      toast.error(errorText(err, 'Could not load events.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [range, showPast, currentUser.location.latitude, currentUser.location.longitude]);

  useEffect(() => {
    if (!focusEventId || isLoading) return;
    document.getElementById(`event-${focusEventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusEventId, isLoading]);

  const openNewForm = () =>
    setForm({
      name: '',
      description: '',
      locationName: '',
      date: '',
      time: '',
      image: '',
      location: { latitude: currentUser.location.latitude, longitude: currentUser.location.longitude, label: currentUser.location.city || 'My location' }
    });

  const openEditForm = (e: LocalEvent) =>
    setForm({
      id: e.id,
      name: e.name,
      description: e.description,
      locationName: e.locationName,
      date: e.date,
      time: e.time,
      image: e.image || '',
      location: { latitude: e.latitude, longitude: e.longitude, label: e.locationName }
    });

  const saveForm = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    setIsSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      locationName: form.locationName || form.location.label,
      date: form.date,
      time: form.time,
      image: form.image,
      latitude: form.location.latitude,
      longitude: form.location.longitude
    };
    try {
      if (form.id) await api.updateEvent(form.id, payload);
      else await api.createEvent(payload);
      toast.success(form.id ? 'Event updated.' : 'Event created. People nearby have been notified.');
      setForm(null);
      fetchEvents();
      triggerNotificationRefresh();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the event.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (e: LocalEvent) => {
    if (!(await confirmAction(`Cancel "${e.name}"? Everyone who joined will be notified.`, 'Cancel event'))) return;
    try {
      await api.deleteEvent(e.id);
      setEvents((list) => list.filter((x) => x.id !== e.id));
      toast.success('Event cancelled.');
    } catch (err) {
      toast.error(errorText(err, 'Could not cancel the event.'));
    }
  };

  const toggleJoin = async (id: string) => {
    try {
      const res = await api.toggleEventJoin(id);
      setEvents((list) => list.map((e) => (e.id === id ? { ...e, participants: res.event.participants, participantsInfo: res.event.participantsInfo } : e)));
      toast.success(res.joined ? "You're going!" : 'You left the event.');
    } catch (err) {
      toast.error(errorText(err, 'Something went wrong.'));
    }
  };

  const fieldClass = 'w-full rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-amber-500 text-sm';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Calendar size={22} /> Events Near You
          </h2>
          <p className="text-xs text-amber-100 mt-1">Join activities, gatherings and meetups close to you.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={openNewForm} className="px-4 py-2 bg-white text-amber-800 rounded-xl text-xs font-bold shadow-sm hover:bg-amber-50 flex items-center gap-1.5">
            <Plus size={15} /> Create Event
          </button>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-black/15 text-white border border-white/20 rounded-xl px-3 py-2 text-xs focus:outline-none" aria-label="Distance">
            <option className="text-gray-700" value="10">Within 10 km</option>
            <option className="text-gray-700" value="50">Within 50 km</option>
            <option className="text-gray-700" value="global">Anywhere</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="accent-white" />
            Show past events
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500 font-semibold">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center bg-white border border-gray-200 py-16 rounded-3xl space-y-3">
          <Calendar size={34} className="text-amber-400 mx-auto" />
          <h4 className="font-bold text-gray-700 text-sm">No upcoming events nearby.</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">Try a wider distance, or create the first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((evt) => {
            const hasJoined = evt.participants.includes(currentUser.id);
            const isOrganizer = evt.creatorId === currentUser.id;
            const canManage = isOrganizer || currentUser.isAdmin;
            const date = parseLocalDate(evt.date);
            return (
              <div
                id={`event-${evt.id}`}
                key={evt.id}
                className={`bg-white rounded-3xl overflow-hidden border shadow-sm flex flex-col ${evt.id === focusEventId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'} ${evt.isPast ? 'opacity-70' : ''}`}
              >
                <div className="h-44 bg-gray-100 relative">
                  <img src={evt.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  <div className="absolute bottom-3 left-3 bg-white/95 px-3 py-1.5 rounded-xl text-center shadow-sm">
                    <span className="text-[11px] font-bold text-amber-700 uppercase block leading-none">{date.toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-lg font-black text-gray-800 leading-none">{date.getDate()}</span>
                  </div>
                  {evt.isPast && <span className="absolute top-3 left-3 bg-gray-900/80 text-white text-[11px] font-bold px-2 py-1 rounded-lg">Past event</span>}
                  {canManage && !evt.isPast && (
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button onClick={() => openEditForm(evt)} className="w-8 h-8 rounded-lg bg-white/95 text-gray-700 hover:text-amber-700 flex items-center justify-center shadow" title="Edit event">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteEvent(evt)} className="w-8 h-8 rounded-lg bg-white/95 text-gray-700 hover:text-rose-600 flex items-center justify-center shadow" title="Cancel event">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-gray-800">{evt.name}</h4>
                    <p className="text-xs text-gray-500">
                      Hosted by{' '}
                      <button onClick={() => setAppView('profile', evt.creatorId)} className="font-semibold text-gray-700 hover:text-amber-700">
                        {isOrganizer ? 'you' : evt.creatorName}
                      </button>
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{evt.description}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-amber-500 shrink-0" /> {evt.locationName} · {evt.distanceKm} km away
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-500 shrink-0" /> {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, {evt.time}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-2">
                        {(evt.participantsInfo || []).slice(0, 5).map((p) => (
                          <button key={p.id} onClick={() => setAppView('profile', p.id)} title={p.name}>
                            <img src={p.profilePhoto} alt={p.name} className="w-7 h-7 rounded-full object-cover border-2 border-white" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={12} /> {evt.participants.length} going
                      </span>
                    </div>

                    {!evt.isPast &&
                      (isOrganizer ? (
                        <span className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800">You're hosting</span>
                      ) : (
                        <button
                          onClick={() => toggleJoin(evt.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 ${hasJoined ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                        >
                          {hasJoined ? 'Leave' : 'Join'}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={saveForm} className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-3 my-auto">
            <h3 className="font-bold text-lg text-gray-800">{form.id ? 'Edit Event' : 'Create an Event'}</h3>

            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Event name</label>
              <input type="text" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Block Coffee Chat" className={fieldClass} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Date</label>
                <input type="date" value={form.date} min={todayYmd()} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldClass} required />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Time</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={fieldClass} required />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Place name</label>
              <input
                type="text"
                value={form.locationName}
                maxLength={150}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                placeholder="e.g. Lafayette Park, north lawn"
                className={fieldClass}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Location on the map</label>
              <Suspense fallback={<div className="h-[200px] rounded-xl bg-gray-100 animate-pulse" />}>
                <LocationPicker
                  value={form.location}
                  onChange={(location) => setForm((f) => (f ? { ...f, location, locationName: f.locationName || location.label } : f))}
                />
              </Suspense>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Cover image (optional)</label>
              <MediaInput value={form.image} onChange={(url) => setForm({ ...form, image: url })} placeholder="Image link or upload" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Description</label>
              <textarea
                placeholder="What is the event about?"
                value={form.description}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className={fieldClass}
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl text-xs">
                {isSaving ? 'Saving...' : form.id ? 'Save changes' : 'Publish Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

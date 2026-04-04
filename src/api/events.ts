import { authFetch } from '../utils/authFetch';
import type { PersonalEvent, PersonalEventInput, EventType } from '../types';

export async function fetchEvents(params?: { month?: string; year?: string }): Promise<PersonalEvent[]> {
  const qs = new URLSearchParams();
  if (params?.month) qs.set('month', params.month);
  if (params?.year)  qs.set('year',  params.year);
  const res = await authFetch('/api/events' + (qs.toString() ? '?' + qs : ''));
  return res.json();
}

export async function fetchReminderEvents(): Promise<PersonalEvent[]> {
  const res = await authFetch('/api/events/reminders');
  return res.json();
}

export async function createEvent(input: PersonalEventInput): Promise<PersonalEvent> {
  const res = await authFetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateEvent(id: string, input: Partial<PersonalEventInput>): Promise<PersonalEvent> {
  const res = await authFetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function completeEvent(id: string): Promise<PersonalEvent> {
  return updateEvent(id, { completed: true });
}

export async function deleteEvent(id: string): Promise<void> {
  await authFetch(`/api/events/${id}`, { method: 'DELETE' });
}

// ── Event types ──────────────────────────────────────────────────────────────
export async function fetchEventTypes(): Promise<EventType[]> {
  const res = await authFetch('/api/event-types');
  return res.json();
}

export async function createEventType(name: string, color: string): Promise<EventType> {
  const res = await authFetch('/api/event-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  return res.json();
}

export async function updateEventType(id: string, color: string): Promise<EventType> {
  const res = await authFetch(`/api/event-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color }),
  });
  return res.json();
}

export async function deleteEventType(id: string): Promise<void> {
  await authFetch(`/api/event-types/${id}`, { method: 'DELETE' });
}

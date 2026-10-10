import { api } from './httpRequestService';

export interface AgendaEvent {
  id: string; title: string; description: string; location: string; startsAt: string; endsAt: string;
  isShared: boolean; isCancelled: boolean; organizerId: string; version: number;
  participantCount: number; userIds: string[]; canEdit: boolean;
}
export interface AgendaInput {
  title: string; description: string; location: string; startsAt: string; endsAt: string;
  isShared: boolean; allDepartment: boolean; userIds: string[]; groupIds: string[]; version: number;
}
export interface AgendaDirectory { users: { id: string; name: string }[]; groups: { id: string; name: string }[] }
export const agendaService = {
  list: (from: string, to: string, signal?: AbortSignal) => api<AgendaEvent[]>(`/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, 'GET', undefined, signal),
  get: (id: string, signal?: AbortSignal) => api<AgendaEvent>(`/agenda/${encodeURIComponent(id)}`, 'GET', undefined, signal),
  directory: (signal?: AbortSignal) => api<AgendaDirectory>('/agenda/directory', 'GET', undefined, signal),
  save: (input: AgendaInput, id?: string) => api(id ? `/agenda/${id}` : '/agenda', id ? 'PUT' : 'POST', input),
  cancel: (event: AgendaEvent) => api(`/agenda/${event.id}/cancel`, 'POST', { version: event.version }),
};
export function agendaToday() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export const agendaMidnight = (day: string) => `${day}T00:00:00+03:00`;
export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
}
export const agendaTime = (value: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const agendaDate = (day: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${day}T12:00:00Z`));
export function agendaLocal(value: string) { return new Date(new Date(value).getTime() + 3 * 3600000).toISOString().slice(0, 16); }

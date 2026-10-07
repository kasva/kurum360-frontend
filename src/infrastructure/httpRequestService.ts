import type { User, UserRole } from '../domain/identity/organization';
import { titles, people, departments, titleGroups, personnelGroups, titleCatalog, workUnits, dutyLocations } from '../domain/identity/organization';
import { categories, categoryDefinitions, priorities, privacyLevels, statuses, typeDefinitions } from '../domain/requests/model';
import type { RequestRecord, RequestDraft } from '../domain/requests/types';
import type { RequestService, RequestFilters, RequestAction } from '../application/requests/types';
import { RequestValidationError } from '../application/requests/errors';
import type { summarize } from '../application/dashboard/summary';

export const typeCodes = ['Request', 'Complaint', 'Suggestion', 'Meeting', 'Instruction'];
const categoryCodes = ['Hardware', 'Software', 'Facilities', 'Training', 'Budget', 'Contract', 'Benefits', 'Meeting', 'CorporateProcess'];
const builtinCategories = [...categories];
const builtinTypes = typeDefinitions.map(t => ({ ...t }));
interface DefinitionMetadata {
  typeDefinitions?: { code: string; name: string; description: string; baseType: string; isActive: boolean }[];
  categoryDefinitions?: { code: string; name: string; isActive: boolean }[];
}
const findType = (label: string) => typeDefinitions.find(t => t.name === label);
const typeCode = (label: string) => findType(label)?.code ?? typeCodes[builtinTypes.findIndex(t => t.name === label)];
const categoryCode = (label: string) => categoryDefinitions.find(c => c.name === label)?.code ?? categoryCodes[builtinCategories.indexOf(label)];
const priorityCodes = ['Low', 'Normal', 'High', 'Critical'];
const privacyCodes = ['Normal', 'Confidential', 'TopSecret'];
const statusCodes = ['New', 'Evaluating', 'Assigned', 'InProgress', 'OnHold', 'AwaitingApproval', 'Completed', 'Closed', 'Rejected', 'Cancelled'];
const roleCodes = ['SystemAdmin', 'GeneralManager', 'DeputyGeneralManager', 'DepartmentManager', 'Employee', 'Viewer'];
const roleNames: UserRole[] = ['Sistem yöneticisi', 'Genel Müdür', 'Genel Müdür Yardımcısı', 'Ünvan yöneticisi', 'Çalışan', 'İzleyici / raporlama kullanıcısı'];
interface WireUser { id: string; name: string; title: string; titleId: string; departmentId?: string; titleGroupId?: string; personnelGroupId?: string; personnelGroupIds?: string[]; workUnitId?: string; dutyLocationId?: string; isInstitutionManager?: boolean; canViewProvince?: boolean; isOperator?: boolean; role: string; canCreateRequests?: boolean; mustChangePassword?: boolean; roleCode?: string; roleName?: string; permissions?: string[] }
interface WireRecord extends Omit<RequestRecord, 'type' | 'category' | 'priority' | 'privacy' | 'status' | 'tags' | 'dynamic'> {
  allowedStatuses?: string[]; type: string; category: string; priority: string; privacy: string; status: string; tags: string[]; targetTitleId: string; dynamic: Record<string, string>;
}
export interface Page { items: RequestRecord[]; totalCount: number; page: number; pageSize: number }
export type DashboardData = ReturnType<typeof summarize> & { recent: RequestRecord[]; approvalCount: number; urgentCount: number };
interface WireDashboard extends Omit<DashboardData, 'approvals' | 'urgent' | 'recent' | 'distribution'> {
  approvals: WireRecord[]; urgent: WireRecord[]; recent: WireRecord[]; distribution: { type: string; count: number; typeCode?: string }[];
}
export interface LiveRequestService extends RequestService {
  page(filters?: RequestFilters, page?: number, pageSize?: number, signal?: AbortSignal): Promise<Page>;
  get(id: string): Promise<RequestRecord>;
  dashboard(view?: string, signal?: AbortSignal): Promise<DashboardData>;
  claim(record: RequestRecord): Promise<void>;
  upload(record: RequestRecord, file: File): Promise<RequestRecord>;
}
let csrf = '';
const titleIds = new Map<string, string>();
let unauthorized: (() => void) | undefined;
export const onUnauthorized = (callback: () => void) => { unauthorized = callback; };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    if (!csrf) csrf = (await api<{ token: string }>('/auth/csrf')).token;
    headers['X-CSRF-TOKEN'] = csrf;
    if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`/api/v1${path}`, { method, headers, credentials: 'same-origin', signal,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ title: `İstek başarısız (${response.status}).` })) as { title: string; errors?: Record<string, string[]> };
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') unauthorized?.();
    if (error.errors) {
      const fields = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key === 'targetTitleId' ? 'targetTitle' : key, value.join(' ')]));
      throw new RequestValidationError(fields);
    }
    throw new ApiError(response.status, error.title);
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
const mapUser = (u: WireUser): User => ({ ...u, role: u.roleName || roleNames[roleCodes.indexOf(u.role)] || u.role, permissions: u.permissions ?? [] });
export const auth = {
  me: async () => mapUser(await api<WireUser>('/auth/me')),
  async login(email: string, password: string) {
    const user = mapUser(await api<WireUser>('/auth/login', 'POST', { email, password }));
    csrf = ''; return user;
  },
  async logout() { await api('/auth/logout', 'POST'); csrf = ''; },
  async changePassword(currentPassword: string, newPassword: string) {
    await api('/auth/change-password', 'POST', { currentPassword, newPassword }); csrf = '';
  },
  async directory() {
    const [titleDefinitions, users, metadata, units, groups, staffGroups, work, places] = await Promise.all([api<{ id: string; name: string; isActive: boolean; titleGroupId: string }[]>('/titles'), api<WireUser[]>('/users'), api<DefinitionMetadata>('/metadata'), api<typeof departments>('/departments'), api<typeof titleGroups>('/title-groups'), api<typeof personnelGroups>('/personnel-groups'), api<typeof workUnits>('/work-units'), api<typeof dutyLocations>('/duty-locations')]);
    workUnits.splice(0, workUnits.length, ...work); dutyLocations.splice(0, dutyLocations.length, ...places);
    personnelGroups.splice(0, personnelGroups.length, ...staffGroups); departments.splice(0, departments.length, ...units); titleGroups.splice(0, titleGroups.length, ...groups); titleCatalog.splice(0, titleCatalog.length, ...titleDefinitions);
    titleIds.clear(); titleDefinitions.forEach(d => titleIds.set(d.name, d.id));
    titles.splice(0, titles.length, ...titleDefinitions.filter(d => d.isActive).map(d => d.name));
    people.splice(0, people.length, ...users.map(mapUser));
    if (metadata.typeDefinitions) typeDefinitions.splice(0, typeDefinitions.length, ...metadata.typeDefinitions.map(t => ({
      ...builtinTypes[typeCodes.indexOf(t.baseType)], name: t.name, code: t.code, baseType: t.baseType,
      description: t.description, isActive: t.isActive, icon: builtinTypes[typeCodes.indexOf(t.baseType)]?.icon ?? 'file',
      fields: builtinTypes[typeCodes.indexOf(t.baseType)]?.fields ?? [],
    })));
    if (metadata.categoryDefinitions) {
      categoryDefinitions.splice(0, categoryDefinitions.length, ...metadata.categoryDefinitions);
      categories.splice(0, categories.length, ...metadata.categoryDefinitions.map(c => c.name));
    }
  },
};
function code(labels: readonly string[], codes: string[], label: string) { return label ? codes[labels.indexOf(label)] : undefined; }
export function mapRecord(w: WireRecord): RequestRecord {
  return { ...w, type: typeDefinitions.find(t => t.code === (w.typeCode ?? w.type))?.name ?? builtinTypes[typeCodes.indexOf(w.type)]?.name ?? w.type,
    category: categoryDefinitions.find(c => c.code === (w.categoryCode ?? w.category))?.name ?? builtinCategories[categoryCodes.indexOf(w.category)] ?? w.category,
    priority: priorities[priorityCodes.indexOf(w.priority)], privacy: privacyLevels[privacyCodes.indexOf(w.privacy)],
    allowedStatuses: w.allowedStatuses?.map(s => statuses[statusCodes.indexOf(s)]), status: statuses[statusCodes.indexOf(w.status)], tags: w.tags.join(', '), assignee: w.assignee || '', relatedPerson: w.relatedPerson || '' };
}
export function createHttpRequestService(): LiveRequestService {
  const versions = new Map<string, number>();
  const remember = (w: WireRecord) => { const r = mapRecord(w); versions.set(r.id, r.version!); return r; };
  const get = async (id: string) => remember(await api<WireRecord>(`/requests/${id}`));
  const service: LiveRequestService = {
    get,
    async list() { return (await service.page()).items; },
    async page(filters = {}, page = 1, pageSize = 10, signal) {
      const mapped = { ...filters, type: undefined, category: undefined, typeCode: filters.type ? typeCode(filters.type) : undefined,
        categoryCode: filters.category ? categoryCode(filters.category) : undefined, status: code(statuses, statusCodes, filters.status || ''),
        priority: code(priorities, priorityCodes, filters.priority || ''), targetTitleId: titleIds.get(filters.targetTitle || ''), targetTitle: undefined, page, pageSize };
      const query = new URLSearchParams(Object.entries(mapped).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
      const result = await api<Omit<Page, 'items'> & { items: WireRecord[] }>(`/requests?${query}`, 'GET', undefined, signal);
      return { ...result, items: result.items.map(remember) };
    },
    async dashboard(view, signal) {
      const w = await api<WireDashboard>(`/dashboard/summary${view ? '?view=' + encodeURIComponent(view) : ''}`, 'GET', undefined, signal);
      return { ...w, approvals: w.approvals.map(remember), urgent: w.urgent.map(remember), recent: w.recent.map(remember),
        distribution: w.distribution.map(d => ({ name: typeDefinitions.find(t => t.code === (d.typeCode ?? d.type))?.name ?? builtinTypes[typeCodes.indexOf(d.type)]?.name ?? d.type, count: d.count })) };
    },
    async create(draft: RequestDraft) {
      let record = remember(await api<WireRecord>('/requests', 'POST', {
        ...draft, type: findType(draft.type)?.baseType ?? typeCodes[builtinTypes.findIndex(t => t.name === draft.type)],
        category: categoryCodes.includes(categoryCode(draft.category)) ? categoryCode(draft.category) : 'CorporateProcess',
        typeCode: typeCode(draft.type), categoryCode: categoryCode(draft.category),
        priority: code(priorities, priorityCodes, draft.priority), privacy: code(privacyLevels, privacyCodes, draft.privacy),
        targetTitleId: draft.targetPersonnelGroupId ? null : titleIds.get(draft.targetTitle), targetDepartmentId: draft.targetDepartmentId || null,
        targetPersonnelGroupId: draft.targetPersonnelGroupId || null, relatedPersonId: draft.relatedPerson || null, assigneeId: draft.assignee || null,
        tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean),
        dynamic: Object.fromEntries((typeDefinitions.find(t => t.name === draft.type)?.fields ?? []).map(f => [f.key, draft.dynamic[f.key] ?? ''])), attachments: undefined,
      }));
      const failures: string[] = [];
      for (const attachment of draft.attachments) {
        if (!attachment.file) continue;
        try { record = await service.upload(record, attachment.file); }
        catch (e) { failures.push(`${attachment.name}: ${e instanceof Error ? e.message : 'Yüklenemedi'}`); record = await get(record.id).catch(() => record); }
      }
      record.uploadFailures = failures;
      if (failures.length) sessionStorage.setItem(`uploadFailures:${record.id}`, JSON.stringify(failures));
      return record;
    },
    async comment(id, text) { await api(`/requests/${id}/comments`, 'POST', { text, version: versions.get(id) }); },
    async update(id, action: RequestAction, value = '', note = '') {
      const mappedValue = action === 'status' ? code(statuses, statusCodes, value) : action === 'priority' ? code(priorities, priorityCodes, value) : action === 'title' ? titleIds.get(value) : value;
      await api(`/requests/${id}/actions`, 'POST', { action, value: mappedValue, note, version: versions.get(id) });
    },
    async claim(record) { remember(await api<WireRecord>(`/requests/${record.id}/claim`, 'POST', { version: record.version })); },
    async upload(record, file) {
      const form = new FormData(); form.append('file', file); form.append('version', String(record.version));
      await api(`/requests/${record.id}/attachments`, 'POST', form); return get(record.id);
    },
  };
  return service;
}

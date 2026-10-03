import { api } from './httpRequestService';
export interface PermissionDefinition { code: string; group: string; name: string }
export interface AccessRole { code: string; name: string; description: string; isActive: boolean; locked: boolean; assignable: boolean; editable: boolean; permissions: string[] }
export interface RoleInput { name: string; description: string; isActive: boolean; permissions: string[] }
export interface AccessData { catalog: PermissionDefinition[]; roles: AccessRole[] }
export const accessService = {
  list: (signal?: AbortSignal) => api<AccessData>('/access/roles', 'GET', undefined, signal),
  save: (input: RoleInput, code?: string) => api(`/access/roles${code ? '/' + encodeURIComponent(code) : ''}`, code ? 'PUT' : 'POST', input),
};


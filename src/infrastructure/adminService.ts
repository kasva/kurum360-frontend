import { api } from './httpRequestService';

export const adminRoles = [
  { value: 'Employee', label: 'Standart Kullanıcı' },
  { value: 'SystemAdmin', label: 'Admin' },
] as const;
export type AdminRole = typeof adminRoles[number]['value'];
export interface AdminTitle { id: string; name: string; isActive: boolean; titleGroupId: string }
export interface AdminUser {
  id: string; email: string; name: string;
  firstName: string; lastName: string; title: string; titleId?: string; departmentId?: string; titleGroupId?: string; isOperator?: boolean; phoneNumber?: string; userType: 'Standard' | 'Admin';
  roleCode?: string; roleName?: string; permissions?: string[]; role: AdminRole; canCreateRequests: boolean; isActive: boolean; mustChangePassword: boolean;
}
export interface UserInput {
  email: string; name: string; role: AdminRole; roleCode?: string;
  firstName: string; lastName: string; title: string; titleId: string; departmentId: string; isOperator: boolean; phoneNumber: string; userType: 'Standard' | 'Admin';
  canCreateRequests: boolean; isActive: boolean; temporaryPassword?: string;
}
export interface ImportUserRow {
  rowNumber: number; firstName: string; lastName: string; email: string; title: string; phoneNumber: string;
  canCreateRequests: boolean; errors: string[]; department: string;
}
export interface ImportUsersResult { committed: boolean; total: number; created: number; rows: ImportUserRow[] }
export const adminService = {
  users: (signal?: AbortSignal) => api<AdminUser[]>('/admin/users', 'GET', undefined, signal),
  titles: (signal?: AbortSignal) => api<AdminTitle[]>('/admin/titles', 'GET', undefined, signal),
  createUser: (input: UserInput) => api<AdminUser>('/admin/users', 'POST', input),
  updateUser: (id: string, input: UserInput) => api<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, 'PUT', input),
  resetPassword: (id: string, temporaryPassword: string) => api<void>(`/admin/users/${encodeURIComponent(id)}/reset-password`, 'POST', { temporaryPassword }),
  importUsers: (file: File, commit: boolean, temporaryPassword = '') => {
    const form = new FormData(); form.append('file', file); form.append('commit', String(commit));
    if (commit) form.append('temporaryPassword', temporaryPassword);
    return api<ImportUsersResult>('/admin/users/import', 'POST', form);
  },
};

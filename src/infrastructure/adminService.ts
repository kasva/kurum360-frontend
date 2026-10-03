import { api } from './httpRequestService';

export const adminRoles = [
  { value: 'Employee', label: 'Çalışan' },
  { value: 'DepartmentManager', label: 'Birim yöneticisi' },
  { value: 'Viewer', label: 'İzleyici / raporlama kullanıcısı' },
  { value: 'GeneralManager', label: 'Genel Müdür' },
  { value: 'DeputyGeneralManager', label: 'Genel Müdür Yardımcısı' },
  { value: 'SystemAdmin', label: 'Sistem yöneticisi' },
] as const;
export type AdminRole = typeof adminRoles[number]['value'];
export interface AdminDepartment { id: string; name: string; isActive: boolean }
export interface AdminUser {
  id: string; email: string; name: string; departmentId: string; department: string;
  roleCode?: string; roleName?: string; permissions?: string[]; role: AdminRole; canCreateRequests: boolean; isActive: boolean; mustChangePassword: boolean;
}
export interface UserInput {
  email: string; name: string; departmentId: string; role: AdminRole; roleCode?: string;
  canCreateRequests: boolean; isActive: boolean; temporaryPassword?: string;
}
export const adminService = {
  users: (signal?: AbortSignal) => api<AdminUser[]>('/admin/users', 'GET', undefined, signal),
  departments: (signal?: AbortSignal) => api<AdminDepartment[]>('/admin/departments', 'GET', undefined, signal),
  createUser: (input: UserInput) => api<AdminUser>('/admin/users', 'POST', input),
  updateUser: (id: string, input: UserInput) => api<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, 'PUT', input),
  resetPassword: (id: string, temporaryPassword: string) => api<void>(`/admin/users/${encodeURIComponent(id)}/reset-password`, 'POST', { temporaryPassword }),
};


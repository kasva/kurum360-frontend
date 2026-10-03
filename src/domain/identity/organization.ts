export type UserRole = string;
export interface User { id: string; name: string; department: string; role: UserRole; departmentId?: string; canCreateRequests?: boolean; mustChangePassword?: boolean; roleCode?: string; permissions?: string[] }
export const departments = ['Bilgi İşlem', 'İnsan Kaynakları', 'Destek Hizmetleri', 'Mali İşler', 'İdari İşler', 'Hukuk Müşavirliği'];
export const people: User[] = [
  { id: 'gm', name: 'Deniz Örnek', department: 'Genel Müdürlük', role: 'Genel Müdür' },
  { id: 'p1', name: 'Ece Örnek', department: 'Bilgi İşlem', role: 'Çalışan' },
  { id: 'p2', name: 'Can Demo', department: 'İnsan Kaynakları', role: 'Birim yöneticisi' },
  { id: 'p3', name: 'Ada Örnek', department: 'Destek Hizmetleri', role: 'Çalışan' },
  { id: 'p4', name: 'Bora Demo', department: 'Mali İşler', role: 'Çalışan' },
  { id: 'p5', name: 'İpek Örnek', department: 'İdari İşler', role: 'Çalışan' },
  { id: 'p6', name: 'Mert Demo', department: 'Hukuk Müşavirliği', role: 'Çalışan' },
];
export const personName = (id: string) => people.find(p => p.id === id)?.name || 'Atanmadı';
export const hasPermission = (user: User, permission: string) => user.permissions?.includes(permission) ?? false;
export const canAssign = (user: User) => hasPermission(user, 'requests.assign');


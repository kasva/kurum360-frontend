export type UserRole = string;
export interface User { id: string; name: string; title: string; role: UserRole; titleId?: string; departmentId?: string; titleGroupId?: string; personnelGroupId?: string; isOperator?: boolean; canCreateRequests?: boolean; mustChangePassword?: boolean; roleCode?: string; permissions?: string[] }
export interface OrganizationDefinition { id: string; name: string; isActive: boolean; parentId?: string; titleGroupId?: string }
export const departments: OrganizationDefinition[] = [];
export const personnelGroups: OrganizationDefinition[] = [];
export const titleGroups: OrganizationDefinition[] = [];
export const titleCatalog: OrganizationDefinition[] = [];
export const titles = ['VHKİ', 'Şef', 'İmam-Hatip', 'Vaiz', 'Memur', 'Kur’an Kursu Öğreticisi'];
export const people: User[] = [
  { id: 'gm', name: 'Deniz Örnek', title: 'İlçe Müftüsü', role: 'Genel Müdür' },
  { id: 'p1', name: 'Ece Örnek', title: 'VHKİ', role: 'Çalışan' },
  { id: 'p2', name: 'Can Demo', title: 'Şef', role: 'Ünvan yöneticisi' },
  { id: 'p3', name: 'Ada Örnek', title: 'İmam-Hatip', role: 'Çalışan' },
  { id: 'p4', name: 'Bora Demo', title: 'Vaiz', role: 'Çalışan' },
  { id: 'p5', name: 'İpek Örnek', title: 'Memur', role: 'Çalışan' },
  { id: 'p6', name: 'Mert Demo', title: 'Kur’an Kursu Öğreticisi', role: 'Çalışan' },
];
export const personName = (id: string) => people.find(p => p.id === id)?.name || 'Atanmadı';
export const hasPermission = (user: User, permission: string) => user.permissions?.includes(permission) ?? false;
export const canAssign = (user: User) => hasPermission(user, 'requests.assign');

import { isOpen, isOverdue } from '../../domain/requests/model.js';
import { departments } from '../../domain/identity/organization.js';
export function summarize(records, now = new Date()) {
  return {
    total: records.length,
    open: records.filter(isOpen).length,
    overdue: records.filter(r => isOverdue(r, now)).length,
    completed: records.filter(r => ['Tamamlandı', 'Kapatıldı'].includes(r.status)).length,
    critical: records.filter(r => r.priority === 'Kritik').length,
    approvals: records.filter(r => r.status === 'Onay Bekliyor'),
    urgent: records.filter(r => isOpen(r) && (r.priority === 'Kritik' || isOverdue(r, now))).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    units: departments.map(name => ({ name, total: records.filter(r => r.department === name).length, open: records.filter(r => r.department === name && isOpen(r)).length })),
    distribution: ['Talep', 'Şikâyet', 'Öneri', 'Görüşme İsteği', 'Yönetici Talimatı'].map(name => ({ name, count: records.filter(r => r.type === name).length })),
    trend: Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const sameMonth = value => value && new Date(value).getMonth() === date.getMonth() && new Date(value).getFullYear() === date.getFullYear();
      return { month: date.toLocaleDateString('tr-TR', { month: 'short' }), created: records.filter(r => sameMonth(r.createdAt)).length, completed: records.filter(r => sameMonth(r.completedAt)).length };
    }),
  };
}

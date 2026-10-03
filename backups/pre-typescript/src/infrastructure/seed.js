import { localDate, priorities, statuses } from '../domain/requests/model.js';
import { departments } from '../domain/identity/organization.js';
export function createSeed(now = new Date()) {
  const at = days => { const d = new Date(now); d.setDate(d.getDate() + days); return d; };
  const templates = [
    ['EBYS erişim sorununun giderilmesi', 'Talep', 'Yazılım', 0],
    ['Personel gelişim programı önerisi', 'Öneri', 'Eğitim', 1],
    ['Toplantı odası klima arızası', 'Şikâyet', 'Bina ve Tesis', 2],
    ['Üçüncü çeyrek bütçe değerlendirmesi', 'Görüşme İsteği', 'Bütçe', 3],
    ['Hizmet aracı planlaması', 'Yönetici Talimatı', 'Kurumsal Süreç', 4],
    ['Tedarik sözleşmesinin incelenmesi', 'Talep', 'Sözleşme', 5],
    ['Yeni dizüstü bilgisayar ihtiyacı', 'Talep', 'Donanım', 0],
    ['Çalışan deneyimi görüşmesi', 'Görüşme İsteği', 'Toplantı', 1],
    ['Yemekhane hizmet kalitesi', 'Şikâyet', 'Sosyal Haklar', 2],
    ['Birimler arası raporlama standardı', 'Yönetici Talimatı', 'Yazılım', 0],
    ['Arşiv alanının düzenlenmesi', 'Öneri', 'Bina ve Tesis', 2],
    ['İç portal erişilebilirlik iyileştirmesi', 'Öneri', 'Yazılım', 0],
  ];
  return Array.from({ length: 48 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const completed = ['Tamamlandı', 'Kapatıldı'].includes(status);
    const createdOffset = -Math.floor(i * 3.3) - 7;
    const createdAt = at(createdOffset).toISOString();
    const [subject, type, category, unit] = templates[i % templates.length];
    const completedAt = completed ? at(createdOffset + 3 + i % 5).toISOString() : null;
    const closedAt = status === 'Kapatıldı' ? at(createdOffset + 4 + i % 5).toISOString() : null;
    const requester = i % 5 === 0 ? 'gm' : `p${i % 6 + 1}`;
    const assignee = status === 'Yeni' ? '' : i % 7 === 0 ? 'gm' : `p${unit + 1}`;
    return {
      id: `demo-${i + 1}`, number: `TLP-${now.getFullYear()}-${String(1048 - i).padStart(5, '0')}`,
      subject: subject + (i >= 12 ? ` · ${Math.floor(i / 12) + 1}. dönem` : ''),
      description: 'İlgili birimin değerlendirmesi ve gerekli çalışmaların planlanması talep edilmektedir. Sürecin kurum içi koordinasyonla takip edilmesi ve sonuç hakkında bilgi verilmesi beklenmektedir. Bu kayıt prototip için oluşturulmuş örnek veridir.',
      type, category, department: departments[unit], requester, relatedPerson: `p${unit + 1}`, assignee,
      priority: priorities[(i * 3) % 4], status, dueDate: localDate(at(completed ? createdOffset + 5 : i % 9 - 4)),
      createdAt, completedAt, closedAt, privacy: i % 11 === 0 ? 'Gizli' : 'Normal', tags: 'Kurum içi, Takip',
      dynamic: type === 'Şikâyet' ? { incidentDate: localDate(at(createdOffset - 1)), incident: 'Hizmet sürecinin iyileştirilmesi için değerlendirme talep ediliyor.' } : type === 'Görüşme İsteği' ? { reason: 'Birim çalışmaları hakkında değerlendirme', preferredDate: `${localDate(at(completed ? createdOffset + 2 : 3))}T14:00`, duration: '30', meetingMode: 'Yüz yüze', participants: 'Birim temsilcileri' } : {},
      attachments: i % 3 === 0 ? [{ name: 'talep-bilgi-notu.pdf', size: 124000, demo: true }] : [],
      comments: i % 2 === 0 ? [{ id: `c-${i}`, author: assignee || 'p1', date: createdAt, text: 'Talep alındı. İlgili birim ile değerlendirme yapılacak. (Örnek yorum)' }] : [],
      timeline: [{ id: `e-${i}`, actor: requester, date: createdAt, text: 'Talep oluşturuldu. (Örnek kayıt)' }, { id: `s-${i}`, actor: 'gm', date: closedAt || completedAt || createdAt, text: `Mevcut durum: ${status}. (Örnek başlangıç)` }],
    };
  });
}

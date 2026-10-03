import { Children, cloneElement, isValidElement, useEffect, useRef } from 'react';
import type { ReactNode, SelectHTMLAttributes, SVGProps } from 'react';
import type { RequestTiming } from '../../domain/requests/types';
export type SelectOption = string | { value: string; label: string };
type ContentProps = { children?: ReactNode };
type TitleProps = ContentProps & { title: string; description: string };
import { delayDays, isOpen } from '../../domain/requests/model';
export function Icon({ name = 'file', size = 20, ...props }: SVGProps<SVGSVGElement> & { name?: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    file: 'M14 2H5v20h14V7l-5-5Z M14 2v6h5M8 12h8M8 16h6',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    bell: 'M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4',
    plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-5-5 5 5-5 5',
    chevron: 'm9 5 7 7-7 7', down: 'm6 9 6 6 6-6',
    clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    check: 'm5 12 4 4L19 6', alert: 'm12 3 10 18H2L12 3Zm0 5v6m0 3v1',
    building: 'm2 7 10-5 10 5H2Zm3 3v9m7-9v9m7-9v9M2 22h20M3 19h18',
    calendar: 'M3 5h18v16H3V5Zm4-3v6m10-6v6M3 10h18m-14 4h3m4 0h3m-10 3h3',
    users: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v3',
    bulb: 'M9 18h6m-6 3h6M8 14a7 7 0 1 1 8 0l-1 2H9l-1-2Z',
    briefcase: 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12l9 3 9-3m-9 0v5',
    info: 'M12 10v7m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    filter: 'M3 4h18l-7 8v7l-4 2v-9L3 4Z', close: 'm6 6 12 12M6 18 18 6',
    upload: 'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
    message: 'M3 3h18v14H8l-5 4V3Zm4 5h10M7 12h7',
    lock: 'M5 10h14v12H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v3',
    chart: 'M4 3v18h18M8 16v-4m5 4V6m5 10V9', menu: 'M3 5h18M3 12h18M3 19h18',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.file} /></svg>;
}
export function Badge({ children }: { children: string }) {
  const colors: Record<string, string> = { Kritik: 'red', Yüksek: 'orange', Normal: 'slate', Düşük: 'slate', Yeni: 'blue', Atandı: 'blue', 'İşlemde': 'orange', Değerlendiriliyor: 'purple', Beklemede: 'slate', 'Onay Bekliyor': 'purple', Tamamlandı: 'green', Kapatıldı: 'green', Reddedildi: 'red', 'İptal Edildi': 'slate', Talep: 'blue', Şikâyet: 'red', Öneri: 'green', 'Görüşme İsteği': 'purple', 'Yönetici Talimatı': 'orange', Gizli: 'orange', 'Çok Gizli': 'red' };
  return <span className={`badge ${colors[children] || 'slate'}`}>{children}</span>;
}
export function Delay({ record }: { record: RequestTiming }) {
  const days = delayDays(record);
  if (days) return <span className={`delay ${isOpen(record) ? 'text-red' : 'muted'}`}>{days} gün {isOpen(record) ? 'gecikmiş' : 'geç sonuçlandı'}</span>;
  if (!isOpen(record)) return <span className="muted">—</span>;
  return <span className="text-green">Zamanında</span>;
}
export function Field({ label, error, required, children, className = '' }: ContentProps & { label: string; error?: string; required?: boolean; className?: string }) {
  const controls = Children.map(children, child => isValidElement<{ 'aria-label'?: string }>(child)
    && (child.type === Select || ['input', 'textarea', 'select'].includes(String(child.type)))
    ? cloneElement(child, { 'aria-label': child.props['aria-label'] ?? label }) : child);
  return <label className={`field ${className}`}><span>{label}{required && <b className="required"> *</b>}</span>{controls}{error && <small className="field-error" role="alert">{error}</small>}</label>;
}
export function Select({ options, placeholder = 'Tümü', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly SelectOption[]; placeholder?: string | null }) {
  return <select {...props}>{placeholder !== null && <option value="">{placeholder}</option>}{options.map(option => typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}
export function PageTitle({ title, description, children }: TitleProps) {
  return <div className="page-heading"><div><div className="eyebrow">GENEL MÜDÜRLÜK <span>/</span> TALEP VE İŞ TAKİBİ</div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
export function Empty({ title = 'Talep bulunamadı', description = 'Filtreleri değiştirerek yeniden deneyebilirsiniz.', children }: Partial<TitleProps>) {
  return <div className="empty"><Icon name="search" size={34}/><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function Modal({ title, children, onClose, wide = false }: ContentProps & { title: string; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { dialog.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={wide ? 'modal-wide' : undefined} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }} aria-labelledby="modal-title"><div className="modal-body"><header><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Pencereyi kapat" onClick={onClose}><Icon name="close"/></button></header>{children}</div></dialog>;
}

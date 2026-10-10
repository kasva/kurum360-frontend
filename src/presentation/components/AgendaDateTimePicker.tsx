import { useId, useRef, useState } from 'react';
import { agendaDate, agendaToday, shiftDay } from '../../infrastructure/agendaService';
import { Icon, Modal } from './ui';

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const weekdays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export default function AgendaDateTimePicker({ label, value, onChange, open, onOpenChange }: { label: string; value: string; onChange: (value: string) => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId(); const trigger = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(value);
  const [month, setMonth] = useState(value.slice(0, 7));
  const day = pending.slice(0, 10); const time = pending.slice(11, 16);
  const first = `${month}-01`;
  const start = shiftDay(first, -((new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7));
  const year = Number(month.slice(0, 4)); const monthIndex = Number(month.slice(5, 7)) - 1;
  function close() { onOpenChange(false); trigger.current?.focus(); }
  function moveMonth(amount: number) {
    const date = new Date(`${first}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 7));
  }
  return <div className="field agenda-datetime">
    <span id={`${id}-label`}>{label}<b className="required"> *</b></span>
    <button ref={trigger} type="button" className="agenda-date-trigger" aria-label={label} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => {
      if (open) close(); else { setPending(value); setMonth(value.slice(0, 7)); onOpenChange(true); }
    }}><Icon name="calendar" size={18}/><span>{agendaDate(value.slice(0, 10))}, {value.slice(0, 4)}<strong>{value.slice(11, 16)}</strong></span><span className="agenda-date-edit">Seç</span></button>
    {open && <Modal title={label} onClose={close}><section id={`${id}-panel`} role="region" aria-label={`${label} seçimi`} className="agenda-date-panel" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
      <div className="agenda-calendar-header"><button type="button" aria-label="Önceki ay" onClick={() => moveMonth(-1)}>‹</button>
        <strong aria-live="polite">{monthNames[monthIndex]} {year}</strong><button type="button" aria-label="Sonraki ay" onClick={() => moveMonth(1)}>›</button></div>
      <div className="agenda-calendar-days">{weekdays.map(w => <span key={w} className="agenda-weekday">{w}</span>)}
        {Array.from({ length: 42 }, (_, index) => {
          const date = shiftDay(start, index);
          return <button type="button" key={date} aria-label={agendaDate(date)} aria-pressed={day === date} aria-current={date === agendaToday() ? 'date' : undefined}
            className={`${day === date ? 'chosen' : ''} ${date.slice(0, 7) !== month ? 'other-month' : ''}`} onClick={() => { setPending(`${date}T${time}`); }}>{Number(date.slice(8, 10))}</button>;
        })}
      </div>
      <div className="agenda-calendar-time"><span>Saat</span><label><span className="sr-only">Saat</span><select aria-label="Saat" value={time.slice(0, 2)} onChange={e => setPending(`${day}T${e.target.value}:${time.slice(3, 5)}`)}>{Array.from({ length: 24 }, (_, i) => <option key={i}>{String(i).padStart(2, '0')}</option>)}</select></label>
        <span>:</span><label><span className="sr-only">Dakika</span><select aria-label="Dakika" value={time.slice(3, 5)} onChange={e => setPending(`${day}T${time.slice(0, 2)}:${e.target.value}`)}>{Array.from({ length: 60 }, (_, i) => <option key={i}>{String(i).padStart(2, '0')}</option>)}</select></label>
        <small>Türkiye saati</small></div>
      <p className="agenda-date-preview">{agendaDate(day)} · <strong>{time}</strong></p>
      <div className="agenda-date-footer"><button type="button" className="button" onClick={close}>Vazgeç</button><button type="button" className="button primary" onClick={() => { onChange(pending); close(); }}>Tamam</button></div>
    </section></Modal>}
  </div>;
}

import { useState } from 'react';
import { adminService } from '../../infrastructure/adminService';
import type { ImportUsersResult } from '../../infrastructure/adminService';
import { RequestValidationError } from '../../application/requests/errors';
import { errorMessage } from '../errors';
import { Field, Modal } from '../components/ui';

export default function UserImport({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => Promise<void> }) {
  const [file, setFile] = useState<File>(); const [password, setPassword] = useState('');
  const [result, setResult] = useState<ImportUsersResult>(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const invalid = result?.rows.filter(r => r.errors.length > 0).length ?? 0;
  async function upload(commit: boolean) {
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      const response = await adminService.importUsers(file, commit, password); setResult(response);
      if (response.committed) { setPassword(''); await onImported(response.created); }
    } catch (e) {
      setError(e instanceof RequestValidationError ? Object.values(e.errors).filter(Boolean).join(' ') : errorMessage(e));
    } finally { setBusy(false); }
  }
  return <Modal wide title="Excel’den Toplu Kullanıcı Oluştur" onClose={() => { if (!busy) onClose(); }}>
    <p>Önce Sistem Tanımları ekranında birim ve ünvanları tanımlayın; şablonu indirip <strong>Kullanıcılar</strong> sayfasını doldurun. Ad, soyad, e-posta, birim ve ünvan zorunludur. Telefon isteğe bağlıdır.</p>
    <p>Birim adını <strong>Birimler</strong>, ünvan adını <strong>Ünvanlar</strong> sayfasından alın. Telefonu başındaki sıfırı koruyarak metin olarak yazın. Talep Açabilir: <strong>Evet / Hayır</strong>; boş bırakılırsa Hayır.</p>
    <a className="button" href="/api/v1/admin/users/import-template">Excel Şablonunu İndir</a>
    <p className="notice">En fazla 100 kullanıcı / 2 MB. Yalnızca .xlsx kabul edilir. Tüm hesaplar Standart Kullanıcı ve aktif olarak oluşturulur. Mevcut hesaplar güncellenmez. Hatalı satır varsa hiçbir kullanıcı kaydedilmez.</p>
    {!result?.committed && <>
      <Field label="Excel dosyası" required><input type="file" accept=".xlsx" disabled={busy} onChange={e => {
        setResult(undefined); setError(''); const selected = e.target.files?.[0];
        if (selected && (selected.size > 2 * 1024 * 1024 || !selected.name.toLowerCase().endsWith('.xlsx'))) {
          setFile(undefined); setError('En fazla 2 MB boyutunda bir .xlsx dosyası seçin.');
        } else setFile(selected);
      }}/></Field>
      <Field label="Ortak Geçici Parola" required><input type="password" autoComplete="new-password" minLength={6} value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/><small>En az 6 karakter; büyük/küçük harf, rakam ve sembol. Her kullanıcı ilk girişinde kendi parolasını belirler.</small></Field>
    </>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {result && <>
      <p role="status">{result.committed ? `${result.created} kullanıcı oluşturuldu.` : `${result.total} kullanıcı satırı bulundu; ${invalid} satır hatalı.`}</p>
      <div className="table-scroll import-preview"><table><thead><tr><th>Satır</th><th>Ad Soyad</th><th>E-posta / Telefon</th><th>Ünvan / Birim</th><th>Talep Açabilir</th><th>Sonuç</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.rowNumber}>
        <td>{row.rowNumber}</td><td>{row.firstName} {row.lastName}</td><td>{row.email}<div>{row.phoneNumber}</div></td><td>{row.title}<div>{row.department}</div></td><td>{row.canCreateRequests ? 'Evet' : 'Hayır'}</td>
        <td>{row.errors.length ? row.errors.map((message, i) => <div key={i} className="import-error">{message}</div>) : result.committed ? 'Oluşturuldu' : 'Hazır'}</td>
      </tr>)}</tbody></table></div>
      {invalid > 0 && <p className="notice">Excel dosyasındaki belirtilen satırları düzeltip dosyayı yeniden seçin ve önizleyin.</p>}
    </>}
    <div className="modal-footer"><button disabled={busy} onClick={onClose}>{result?.committed ? 'Kapat' : 'Vazgeç'}</button>{!result?.committed && <>
      <button disabled={busy || !file} onClick={() => void upload(false)}>{busy ? 'İşleniyor…' : 'Önizle ve Kontrol Et'}</button>
      <button className="primary" disabled={busy || !result || invalid > 0 || password.length < 6} onClick={() => void upload(true)}>Onayla ve {result?.total ?? 0} Kullanıcı Oluştur</button>
    </>}</div>
  </Modal>;
}


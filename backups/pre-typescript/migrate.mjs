import fs from 'node:fs';
import path from 'node:path';
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
for (const file of [...files('src'), ...files('tests')].filter(f => /\.tsx?$/.test(f))) {
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/(from\s+['"]\.[^'"]+)\.jsx?(['"])/g, '$1$2'));
}
function edit(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [before, after] of edits) {
    if (!text.includes(before)) throw new Error(`Missing replacement in ${file}: ${before}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(file, text);
}
edit('index.html', [['/src/main.jsx', '/src/main.tsx']]);
edit('src/main.tsx', [["createRoot(document.getElementById('root')).render(", "const root = document.getElementById('root');\nif (!root) throw new Error('Uygulama kök elementi bulunamadı.');\ncreateRoot(root).render("]]);
edit('src/domain/identity/organization.ts', [
  ["export const departments", "export type UserRole = 'Sistem yöneticisi' | 'Genel Müdür' | 'Genel Müdür Yardımcısı' | 'Birim yöneticisi' | 'Çalışan' | 'İzleyici / raporlama kullanıcısı';\nexport interface User { id: string; name: string; department: string; role: UserRole }\nexport const departments"],
  ['export const people =', 'export const people: User[] ='],
  ['personName = id =>', 'personName = (id: string) =>'],
  ['canAssign = user =>', 'canAssign = (user: User) =>'],
]);
edit('src/domain/requests/model.ts', [
  ['export const statuses =', "import type { Category, Priority, Privacy, RequestDraft, RequestStatus, RequestTiming, TypeDefinition, ValidationErrors } from './types';\nexport const isOption = <T extends string>(options: readonly T[], value: string): value is T => options.some(option => option === value);\nexport const statuses: readonly RequestStatus[] ="],
  ['export const priorities =', 'export const priorities: readonly Priority[] ='],
  ['export const privacyLevels =', 'export const privacyLevels: readonly Privacy[] ='],
  ['export const categories =', 'export const categories: readonly Category[] ='],
  ['export const typeDefinitions =', 'export const typeDefinitions: readonly TypeDefinition[] ='],
  ['isTerminal = r =>', "isTerminal = (r: Pick<RequestTiming, 'status'>) =>"],
  ['isOpen = r =>', "isOpen = (r: Pick<RequestTiming, 'status'>) =>"],
  ['delayDays(r, now', 'delayDays(r: RequestTiming, now'],
  ['isOverdue = (r, now', 'isOverdue = (r: RequestTiming, now'],
  ['emptyDraft = () =>', 'emptyDraft = (): RequestDraft =>'],
  ['validateDraft(draft, now', 'validateDraft(draft: RequestDraft, now'],
  ['const errors = {};', 'const errors: ValidationErrors = {};'],
  ["Object.entries({ type: 'Talep türü', category: 'Kategori', subject: 'Konu', description: 'Açıklama', department: 'İlgili birim', dueDate: 'Son tarih' })", "Object.entries({ type: 'Talep türü', category: 'Kategori', subject: 'Konu', description: 'Açıklama', department: 'İlgili birim', dueDate: 'Son tarih' }) as [keyof RequestDraft, string][]"],
  ['categories.includes(draft.category)', 'isOption(categories, draft.category)'],
  ['priorities.includes(draft.priority)', 'isOption(priorities, draft.priority)'],
  ['privacyLevels.includes(draft.privacy)', 'isOption(privacyLevels, draft.privacy)'],
]);
edit('src/infrastructure/memoryRequestRepository.ts', [
  ["import { RequestRepository }", "import type { RequestRecord } from '../domain/requests/types';\nimport type { RequestRepository }"],
  ['extends RequestRepository', 'implements RequestRepository'],
  ['#records;', '#records: RequestRecord[];'],
  ['constructor(records) { super();', 'constructor(records: RequestRecord[]) {'],
  ['save(record)', 'save(record: RequestRecord)'],
]);
edit('src/infrastructure/seed.ts', [
  ['export function createSeed', "import type { Category, RequestRecord, RequestType } from '../domain/requests/types';\nexport function createSeed"],
  ['createSeed(now = new Date()) {', 'createSeed(now = new Date()): RequestRecord[] {'],
  ['const at = days =>', 'const at = (days: number) =>'],
  ['const templates =', 'const templates: [string, RequestType, Category, number][] ='],
]);
edit('src/application/dashboard/summary.ts', [
  ['export function summarize(records,', "import type { RequestRecord } from '../../domain/requests/types';\nexport function summarize(records: readonly RequestRecord[],"],
]);
edit('src/presentation/format.ts', [
  ['dateText = value =>', 'dateText = (value: string | null | undefined) =>'],
  ['dateTime = value => new Date(value)', "dateTime = (value: string | null | undefined) => value ? new Date(value)"],
  ["timeStyle: 'short' });", "timeStyle: 'short' }) : '—';"],
  ['numberText = value =>', 'numberText = (value: number) =>'],
]);
edit('src/presentation/components/ui.tsx', [
  ["import { useEffect, useRef } from 'react';", "import { useEffect, useRef } from 'react';\nimport type { ReactNode, SelectHTMLAttributes, SVGProps } from 'react';\nimport type { RequestTiming } from '../../domain/requests/types';\nexport type SelectOption = string | { value: string; label: string };\ntype ContentProps = { children?: ReactNode };\ntype TitleProps = ContentProps & { title: string; description: string };"],
  ["size = 20, ...props })", "size = 20, ...props }: SVGProps<SVGSVGElement> & { name?: string; size?: number })"],
  ['const paths =', 'const paths: Record<string, string> ='],
  ['Badge({ children })', 'Badge({ children }: { children: string })'],
  ['const colors =', 'const colors: Record<string, string> ='],
  ['Delay({ record })', 'Delay({ record }: { record: RequestTiming })'],
  ["className = '' })", "className = '' }: ContentProps & { label: string; error?: string; required?: boolean; className?: string })"],
  ["placeholder = 'Tümü', ...props })", "placeholder = 'Tümü', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly SelectOption[]; placeholder?: string | null })"],
  ['PageTitle({ title, description, children })', 'PageTitle({ title, description, children }: TitleProps)'],
  ["yeniden deneyebilirsiniz.', children })", "yeniden deneyebilirsiniz.', children }: Partial<TitleProps>)"],
  ['Modal({ title, children, onClose })', 'Modal({ title, children, onClose }: ContentProps & { title: string; onClose: () => void })'],
  ['useRef(null)', 'useRef<HTMLDialogElement>(null)'],
  ['dialog.showModal();', 'if (!dialog) return;\n    dialog.showModal();'],
  ['previous?.focus();', 'if (previous instanceof HTMLElement) previous.focus();'],
]);
edit('src/presentation/components/RequestTable.tsx', [
  ['export default function', "import type { RequestRecord } from '../../domain/requests/types';\nexport default function"],
  ['compact = false })', 'compact = false }: { records: readonly RequestRecord[]; compact?: boolean })'],
]);
edit('src/presentation/pages/Dashboard.tsx', [
  ['export default function', "import type { RequestRecord } from '../../domain/requests/types';\nimport type { User } from '../../domain/identity/organization';\nexport default function"],
  ['Dashboard({ records, user })', 'Dashboard({ records, user }: { records: readonly RequestRecord[]; user: User })'],
  ['const cards =', 'const cards: [string, number, string, string, string, string][] ='],
  ['const point = (n, i)', 'const point = (n: number, i: number)'],
  ["{['created', 'completed'].map", "{(['created', 'completed'] as const).map"],
]);
edit('src/presentation/pages/RequestList.tsx', [
  ['export default function', "import type { RequestRecord } from '../../domain/requests/types';\nimport type { User } from '../../domain/identity/organization';\nimport type { RequestFilters } from '../../application/requests/types';\nimport type { SelectOption } from '../components/ui';\nexport default function"],
  ['RequestList({ records, user, query })', 'RequestList({ records, user, query }: { records: readonly RequestRecord[]; user: User; query: string })'],
  ['useState(initial)', 'useState<RequestFilters>(initial)'],
  ['const change = (key, value)', 'const change = (key: keyof RequestFilters, value: string)'],
  ['const fields =', 'const fields: [keyof RequestFilters, string, readonly SelectOption[]][] ='],
  ["{[['', 'Tümü'", "{([['', 'Tümü'"],
  ["summary.completed, 'check']].map", "summary.completed, 'check']] as const).map"],
]);
edit('src/presentation/pages/RequestDetail.tsx', [
  ["import { useState } from 'react';", "import { useState } from 'react';\nimport type { FormEvent } from 'react';\nimport type { RequestRecord } from '../../domain/requests/types';\nimport type { RequestAction, RequestService } from '../../application/requests/types';\nimport { errorMessage } from '../errors';"],
  ['ActionDialog({ record, action, onClose, onAction })', 'ActionDialog({ record, action, onClose, onAction }: { record: RequestRecord; action: RequestAction; onClose: () => void; onAction: (action: RequestAction, value: string, note: string) => Promise<void> })'],
  ['submit(event)', 'submit(event: FormEvent<HTMLFormElement>)'],
  ['setError(e.message);', 'setError(errorMessage(e));'],
  ['RequestDetail({ record, service, refresh, created })', 'RequestDetail({ record, service, refresh, created }: { record: RequestRecord | undefined; service: RequestService; refresh: () => Promise<void>; created: boolean })'],
  ['useState(null)', 'useState<RequestAction | null>(null)'],
  ['addComment(event)', 'addComment(event: FormEvent<HTMLFormElement>)'],
  ["event.preventDefault(); setError(''); setBusy(true);", "event.preventDefault(); if (!record) return; setError(''); setBusy(true);"],
  ['setError(e.message);', 'setError(errorMessage(e));'],
  ['definition?.fields.length > 0', 'definition && definition.fields.length > 0'],
  ['Object.entries(actions).map', '(Object.entries(actions) as [RequestAction, string][]).map'],
]);
edit('src/presentation/pages/NewRequest.tsx', [
  ['export default function', "import type { RequestDraft, ValidationErrors } from '../../domain/requests/types';\nimport type { User } from '../../domain/identity/organization';\nimport type { RequestService } from '../../application/requests/types';\nimport { RequestValidationError } from '../../application/requests/errors';\nimport { errorMessage } from '../errors';\nexport default function"],
  ['NewRequest({ service, user, refresh, navigate })', 'NewRequest({ service, user, refresh, navigate }: { service: RequestService; user: User; refresh: () => Promise<void>; navigate: (path: string) => void })'],
  ['useState({})', 'useState<ValidationErrors>({})'],
  ['useRef(null)', 'useRef<HTMLHeadingElement>(null)'],
  ['typeDefinitions.find(t => t.name === draft.type);', 'typeDefinitions.find(t => t.name === draft.type) ?? typeDefinitions[0];'],
  ['const update = (key, value)', 'const update = <K extends keyof RequestDraft,>(key: K, value: RequestDraft[K])'],
  ['function move(next)', 'function move(next: number)'],
  ['setError(e.message); if (e.errors) setErrors(e.errors);', 'setError(errorMessage(e)); if (e instanceof RequestValidationError) setErrors(e.errors);'],
]);
edit('src/presentation/App.tsx', [
  ['export default function', "import type { RequestRecord } from '../domain/requests/types';\nimport type { User } from '../domain/identity/organization';\nimport type { RequestService } from '../application/requests/types';\nimport { errorMessage } from './errors';\nexport default function"],
  ['App({ service, user })', 'App({ service, user }: { service: RequestService; user: User })'],
  ['useState([])', 'useState<RequestRecord[]>([])'],
  ["setError(e.message || 'Talepler yüklenemedi.');", 'setError(errorMessage(e));'],
  ["setError(e.message || 'Talepler yüklenemedi.');", 'setError(errorMessage(e));'],
  ['const navigate = path =>', 'const navigate = (path: string) =>'],
  ['const navItems =', 'const navItems: [string, string, boolean][] ='],
]);
edit('tests/requests.test.ts', [
  ["const now =", "import type { RequestDraft, RequestTiming } from '../src/domain/requests/types';\nconst now ="],
  ['validDraft = () =>', 'validDraft = (): RequestDraft =>'],
  ['record.closedAt >= record.completedAt', 'record.completedAt && record.closedAt >= record.completedAt'],
  ['record.dynamic.incidentDate <=', 'record.dynamic.incidentDate && record.dynamic.incidentDate <='],
  ["records.find(r => r.id === record.id).attachments", "records.find(r => r.id === record.id)?.attachments"],
  [".find(r => r.id === record.id).subject", ".find(r => r.id === record.id)?.subject"],
  ["['completed', 'completed']])", "['completed', 'completed']] as const)"],
  ['const get = async () => (await service.list()).find(r => r.id === created.id);', "const get = async () => { const record = (await service.list()).find(r => r.id === created.id); assert.ok(record); return record; };"],
  ['const base =', 'const base: RequestTiming ='],
  ['const completed =', 'const completed: RequestTiming ='],
]);

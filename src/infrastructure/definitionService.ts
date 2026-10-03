import { api } from './httpRequestService';

export type DefinitionKind = 'types' | 'categories' | 'departments';
export interface DefinitionItem {
  code?: string; id?: string; name: string; isActive: boolean; description?: string; baseType?: string;
}
export interface DefinitionInput { name: string; isActive: boolean; description?: string; baseType?: string }
export const formTemplates = [
  { value: 'Request', label: 'Standart Talep' }, { value: 'Complaint', label: 'Şikâyet (olay tarihi ve bilgileri)' },
  { value: 'Suggestion', label: 'Öneri' }, { value: 'Meeting', label: 'Görüşme İsteği (görüşme ayrıntıları)' },
  { value: 'Instruction', label: 'Yönetici Talimatı (yalnızca yöneticiler açabilir)' },
];
export const definitionService = {
  list: (kind: DefinitionKind, signal?: AbortSignal) => api<DefinitionItem[]>(`/definitions/${kind}`, 'GET', undefined, signal),
  save: (kind: DefinitionKind, input: DefinitionInput, item?: DefinitionItem) => {
    const key = item?.code ?? item?.id;
    return api<DefinitionItem>(`/definitions/${kind}${key ? '/' + encodeURIComponent(key) : ''}`, key ? 'PUT' : 'POST', input);
  },
};

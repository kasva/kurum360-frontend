export type RequestStatus = 'Yeni' | 'Değerlendiriliyor' | 'Atandı' | 'İşlemde' | 'Beklemede' | 'Onay Bekliyor' | 'Tamamlandı' | 'Kapatıldı' | 'Reddedildi' | 'İptal Edildi';
export type Priority = 'Düşük' | 'Normal' | 'Yüksek' | 'Kritik';
export type Privacy = 'Normal' | 'Gizli' | 'Çok Gizli';
export type RequestType = string;
export type Category = string;

export interface Attachment { name: string; size: number; demo?: boolean; id?: string; file?: File }
export interface RequestComment { id: string; author: string; text: string; date: string }
export interface TimelineEvent { id: string; actor: string; text: string; date: string }

/** Unvalidated form input; enum values become constrained when a record is created. */
export interface RequestDraft {
  type: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  department: string;
  relatedPerson: string;
  assignee: string;
  dueDate: string;
  privacy: string;
  tags: string;
  dynamic: Record<string, string | undefined>;
  attachments: Attachment[];
}

export interface RequestTiming {
  status: RequestStatus;
  dueDate: string;
  completedAt?: string | null;
  closedAt?: string | null;
}

export interface RequestRecord extends RequestDraft, RequestTiming {
  typeCode?: string;
  categoryCode?: string;
  version?: number;
  allowedActions?: string[]; allowedStatuses?: string[];
  canComment?: boolean;
  canUpload?: boolean;
  delayDays?: number;
  uploadFailures?: string[];
  id: string;
  number: string;
  requester: string;
  createdAt: string;
  completedAt: string | null;
  closedAt: string | null;
  status: RequestStatus;
  type: RequestType;
  category: Category;
  priority: Priority;
  privacy: Privacy;
  comments: RequestComment[];
  timeline: TimelineEvent[];
}

interface BaseField { key: string; label: string; required: boolean }
export type DynamicField = BaseField & (
  | { type: 'text' | 'textarea'; dateRule?: never; options?: never; min?: never; max?: never }
  | { type: 'date' | 'datetime-local'; dateRule?: 'past' | 'future'; options?: never; min?: never; max?: never }
  | { type: 'number'; min: number; max: number; dateRule?: never; options?: never }
  | { type: 'select'; options: readonly string[]; dateRule?: never; min?: never; max?: never }
);
export interface TypeDefinition { name: RequestType; description: string; icon: string; fields: readonly DynamicField[]; code?: string; baseType?: string; isActive?: boolean }
export type ValidationErrors = Partial<Record<string, string>>;


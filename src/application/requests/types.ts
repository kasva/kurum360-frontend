import type { RequestDraft, RequestRecord } from '../../domain/requests/types';

export type RequestAction = 'release' | 'group' | 'department' | 'assign' | 'title' | 'priority' | 'status' | 'complete' | 'approval' | 'revise' | 'close';
export interface RequestFilters {
  search?: string;
  type?: string;
  category?: string;
  status?: string;
  priority?: string;
  targetTitle?: string;
  targetDepartmentId?: string; targetPersonnelGroupId?: string;
  assignee?: string;
  requester?: string;
  from?: string;
  to?: string;
  quick?: string;
  sort?: string;
  view?: string;
}
export interface RequestService {
  list(): Promise<RequestRecord[]>;
  create(draft: RequestDraft): Promise<RequestRecord>;
  comment(recordId: string, text: string): Promise<void>;
  update(recordId: string, action: RequestAction, value?: string, note?: string): Promise<void>;
}

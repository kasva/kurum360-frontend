import type { RequestRecord } from '../../domain/requests/types';

/** API implementations must return detached request records. */
export interface RequestRepository {
  list(): Promise<RequestRecord[]>;
  save(record: RequestRecord): Promise<void>;
}

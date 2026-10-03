import type { RequestRecord } from '../domain/requests/types';
import type { RequestRepository } from '../application/requests/repository';
export class MemoryRequestRepository implements RequestRepository {
  #records: RequestRecord[];
  constructor(records: RequestRecord[]) { this.#records = structuredClone(records); }
  async list() { return structuredClone(this.#records); }
  async save(record: RequestRecord) {
    const index = this.#records.findIndex(r => r.id === record.id);
    if (index < 0) this.#records.push(structuredClone(record));
    else this.#records[index] = structuredClone(record);
  }
}

import { RequestRepository } from '../application/requests/repository.js';
export class MemoryRequestRepository extends RequestRepository {
  #records;
  constructor(records) { super(); this.#records = structuredClone(records); }
  async list() { return structuredClone(this.#records); }
  async save(record) {
    const index = this.#records.findIndex(r => r.id === record.id);
    if (index < 0) this.#records.push(structuredClone(record));
    else this.#records[index] = structuredClone(record);
  }
}

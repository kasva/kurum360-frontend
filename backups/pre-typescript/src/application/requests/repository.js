/** Repository contract. API implementations must return detached request records. */
export class RequestRepository {
  async list() { throw new Error('list uygulanmalı'); }
  async save(record) { void record; throw new Error('save uygulanmalı'); }
}

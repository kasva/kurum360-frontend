import { people } from '../domain/identity/organization';
import { createRequestService } from '../application/requests/service';
import { MemoryRequestRepository } from '../infrastructure/memoryRequestRepository';
import { createSeed } from '../infrastructure/seed';
export const currentUser = people[0];
export const requestService = createRequestService(new MemoryRequestRepository(createSeed()), currentUser);

import { people } from '../domain/identity/organization.js';
import { createRequestService } from '../application/requests/service.js';
import { MemoryRequestRepository } from '../infrastructure/memoryRequestRepository.js';
import { createSeed } from '../infrastructure/seed.js';
export const currentUser = people[0];
export const requestService = createRequestService(new MemoryRequestRepository(createSeed()), currentUser);

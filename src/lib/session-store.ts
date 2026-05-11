import { RescheduleSession } from './models';

// In-memory store for MVP (will be replaced by Firestore)
export const sessions: Record<string, RescheduleSession> = {};

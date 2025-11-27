import { create } from 'zustand'

/**
 * Mock data store for development/demo purposes.
 * In production, this would connect to Firestore or similar database.
 */
export const useDataStore = create((set) => ({
  users: [
    { id: 'patient_1', role: 'patient', name: 'Alex Patient', email: 'alex@example.com' },
    { id: 'clinician_1', role: 'clinician', name: 'Dr. Sam PT', email: 'sam@example.com' }
  ],
  exercises: [
    { id: 'ex_1', name: 'Straight Leg Raise', difficulty: 'easy' },
    { id: 'ex_2', name: 'Heel Slides', difficulty: 'easy' }
  ],
  sessions: [
    { id: 'sess_1', patientId: 'patient_1', exercises: ['ex_1'], date: Date.now(), status: 'in_progress' }
  ],
  addSession: (s) => set((state) => ({ sessions: [...state.sessions, s] }))
}))

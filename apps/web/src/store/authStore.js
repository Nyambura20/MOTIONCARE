import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Authentication store using Zustand with localStorage persistence.
 * Manages user login, signup, and logout with data cleanup.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      login: (user) => {
        console.log('User logged in:', user.email);
        set({ user });
      },
      signup: (user) => {
        // Mark as new user for first-time experience
        const newUser = {
          ...user,
          isNewUser: true,
          createdAt: new Date().toISOString()
        };
        console.log('New user signed up:', newUser.email);
        set({ user: newUser });
      },
      markOnboardingComplete: () => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, isNewUser: false } });
        }
      },
      logout: () => {
        const currentUser = get().user;
        const userKey = currentUser?.email || currentUser?.id || 'default';
        
        const keysToRemove = [
          `tutorialScript_${userKey}`,
          `onboardingComplete_${userKey}`,
          `consentTimestamp_${userKey}`,
          `intakeData_${userKey}`,
          `hasVisitedTodaysPlan`,
          'motioncare-assessment-state'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log('Cleared:', key);
        });
        
        console.log('User logged out, data cleared for:', userKey);
        set({ user: null });
      }
    }),
    {
      name: 'motioncare-auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

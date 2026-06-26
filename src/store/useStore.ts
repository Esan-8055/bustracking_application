import { create } from 'zustand';
import { UserProfile, School } from '../types';

interface AppState {
  user: UserProfile | null;
  school: School | null;
  loading: boolean;
  activeSosAlarm: boolean;
  mobileSidebarOpen: boolean;
  setUser: (user: UserProfile | null) => void;
  setSchool: (school: School | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveSosAlarm: (active: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  school: null,
  loading: true,
  activeSosAlarm: false,
  mobileSidebarOpen: false,
  setUser: (user) => set({ user }),
  setSchool: (school) => set({ school }),
  setLoading: (loading) => set({ loading }),
  setActiveSosAlarm: (activeSosAlarm) => set({ activeSosAlarm }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
}));

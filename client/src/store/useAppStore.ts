import { create } from "zustand";

interface AppState {
  // UI
  mobileNavOpen: boolean;
  postsMenuOpen: boolean;
  setMobileNavOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setPostsMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobileNav: () => void;
  togglePostsMenu: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  mobileNavOpen: false,
  postsMenuOpen: false,
  setMobileNavOpen: (open) =>
    set((s) => ({
      mobileNavOpen: typeof open === "function" ? open(s.mobileNavOpen) : open,
    })),
  setPostsMenuOpen: (open) =>
    set((s) => ({
      postsMenuOpen: typeof open === "function" ? open(s.postsMenuOpen) : open,
    })),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  togglePostsMenu: () => set((s) => ({ postsMenuOpen: !s.postsMenuOpen })),
}));

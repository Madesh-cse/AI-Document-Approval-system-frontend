import { create } from "zustand";

export type UserRole = "admin" | "manager" | "employee";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  organization?: string | null;
  workflow_domain?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  login: (
    token: string,
    user: User,
    remember: boolean,
  ) => void;

  logout: () => void;

  restoreSession: () => void;
}

const ACCESS_TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

const getStorage = (remember?: boolean): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (remember === undefined) {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
      ? localStorage
      : sessionStorage;
  }

  return remember ? localStorage : sessionStorage;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user, remember) => {
    const storage = getStorage(remember);

    if (storage) {
      storage.setItem(ACCESS_TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
    }

    set({
      token,
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  restoreSession: () => {
    if (typeof window === "undefined") {
      return;
    }

    const storage = getStorage();

    if (!storage) {
      return;
    }

    const token = storage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = storage.getItem(USER_KEY);

    if (!token || !storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser) as User;

      set({
        token,
        user,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  },
}));
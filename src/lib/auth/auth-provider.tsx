"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  scope: string;
  bprName?: string;
  branchName?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  const [user, setUser] = useState<UserProfile | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialUser) {
      fetchUser();
    }
  }, [initialUser]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return permissions.some((p) => user.permissions.includes(p));
  };

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasPermission,
        hasAnyPermission,
        refreshUser: fetchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

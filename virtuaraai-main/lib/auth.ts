"use client";

import { User } from "@/types";

const USER_KEY = "virtuara_user";

export function saveUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  const user = getUser();
  return !!user?.loggedIn;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}

export function mockSignup(name: string, email: string): void {
  saveUser({ name, email, loggedIn: false });
}

export function mockLogin(email: string): void {
  const existing = getUser();
  saveUser({
    name: existing?.name ?? email.split("@")[0],
    email,
    loggedIn: true,
  });
}

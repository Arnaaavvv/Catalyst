import type { User } from "./types";
import { isStorageAvailable } from "./storage";

// Local-only accounts. There is no server: sign-up creates a profile in this
// browser's localStorage, passwords are salted + hashed (SHA-256, Web Crypto)
// before they ever touch storage, and a session just remembers which local
// profile is active. This is enough to keep one person's data separated and
// persistent on one device — it is NOT server-verified auth, has no password
// reset, and offers no protection if someone else has access to this browser.
// Don't reuse a real/sensitive password here.

const USERS_KEY = "lifeos:users";
const SESSION_KEY = "lifeos:session";

export type PublicUser = Omit<User, "passwordHash" | "salt">;

function toPublic(u: User): PublicUser {
  const { passwordHash, salt, ...rest } = u;
  return rest;
}

function readUsers(): User[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch {
    return false;
  }
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(salt + ":" + password);
  const digest = await window.crypto.subtle.digest("SHA-256", enc);
  return bufToHex(digest);
}

export class AuthError extends Error {}

export async function signUp(name: string, email: string, password: string): Promise<PublicUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim()) throw new AuthError("Enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new AuthError("Enter a valid email.");
  if (password.length < 6) throw new AuthError("Password must be at least 6 characters.");

  const users = readUsers();
  if (users.some((u) => u.email === cleanEmail)) {
    throw new AuthError("An account with this email already exists on this device.");
  }

  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const user: User = {
    id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  if (!writeUsers([...users, user])) {
    throw new AuthError("Couldn't save your account — browser storage may be unavailable.");
  }
  setSession(user.id);
  return toPublic(user);
}

export async function logIn(email: string, password: string): Promise<PublicUser> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);
  if (!user) throw new AuthError("No account with this email on this device.");
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new AuthError("Incorrect password.");
  setSession(user.id);
  return toPublic(user);
}

export function logOut(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function setSession(userId: string) {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(SESSION_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function getSessionUser(): PublicUser | null {
  if (!isStorageAvailable()) return null;
  try {
    const userId = window.localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const user = readUsers().find((u) => u.id === userId);
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}

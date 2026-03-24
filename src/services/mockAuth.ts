import type { AuthUser } from "../types/user";

interface MockAuthAccount {
  email: string;
  password: string;
  confirmed: boolean;
  otpCode: string;
}

const SESSION_KEY = "wc-companion:mock-auth:session";
const ACCOUNTS_KEY = "wc-companion:mock-auth:accounts";
const accounts = new Map<string, MockAuthAccount>();
let currentEmail: string | null = null;
let accountsLoaded = false;

interface BasicStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function getStorage(): BasicStorage | null {
  const maybeStorage = (globalThis as unknown as { localStorage?: BasicStorage }).localStorage;
  if (!maybeStorage) {
    return null;
  }
  return maybeStorage;
}

function loadSession(): void {
  if (currentEmail) {
    return;
  }
  const storage = getStorage();
  const saved = storage?.getItem(SESSION_KEY);
  if (saved) {
    currentEmail = saved;
  }
}

function loadAccounts(): void {
  if (accountsLoaded) {
    return;
  }

  const storage = getStorage();
  const raw = storage?.getItem(ACCOUNTS_KEY);
  if (!raw) {
    accountsLoaded = true;
    return;
  }

  try {
    const parsed = JSON.parse(raw) as MockAuthAccount[];
    for (const account of parsed) {
      accounts.set(account.email, account);
    }
  } catch {
    // Ignore bad local data and start fresh.
  } finally {
    accountsLoaded = true;
  }
}

function persistAccounts(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(ACCOUNTS_KEY, JSON.stringify(Array.from(accounts.values())));
}

function saveSession(email: string | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  if (email) {
    storage.setItem(SESSION_KEY, email);
  } else {
    storage.removeItem(SESSION_KEY);
  }
}

function toAuthUser(email: string): AuthUser {
  return {
    id: `mock:${email}`,
    email
  };
}

export async function mockGetCurrentUser(): Promise<AuthUser | null> {
  loadAccounts();
  loadSession();
  if (!currentEmail) {
    return null;
  }
  return toAuthUser(currentEmail);
}

export async function mockSignUp(email: string, password: string): Promise<void> {
  loadAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.has(normalizedEmail)) {
    throw new Error("Account already exists. Please login.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters in mock mode.");
  }

  accounts.set(normalizedEmail, {
    email: normalizedEmail,
    password,
    confirmed: false,
    otpCode: "123456"
  });
  persistAccounts();
}

export async function mockConfirmSignUp(email: string, otp: string): Promise<void> {
  loadAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const account = accounts.get(normalizedEmail);
  if (!account) {
    throw new Error("No account found for this email.");
  }
  if (otp.trim() !== account.otpCode) {
    throw new Error("Invalid mock OTP. Use 123456.");
  }
  account.confirmed = true;
  persistAccounts();
}

export async function mockSignIn(email: string, password: string): Promise<void> {
  loadAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const account = accounts.get(normalizedEmail);
  if (!account) {
    throw new Error("No account found. Please register first.");
  }
  if (!account.confirmed) {
    throw new Error("Please verify your account first. Use OTP 123456 in mock mode.");
  }
  if (account.password !== password) {
    throw new Error("Invalid password.");
  }

  currentEmail = normalizedEmail;
  saveSession(currentEmail);
}

export async function mockSignOut(): Promise<void> {
  currentEmail = null;
  saveSession(null);
}

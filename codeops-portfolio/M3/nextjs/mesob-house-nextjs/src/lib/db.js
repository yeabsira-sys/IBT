import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { ROLES } from "./roles";

/**
 * db — the assignment's server-side persistence layer.
 *
 * A JSON file keeps the project self-contained (no external database
 * credentials are needed to run the assessment). Every read/write goes
 * through this module, so swapping the implementation for Postgres later is
 * a single-file change. On a serverless host the file must be replaced by a
 * real database; DATA.md records that decision.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "mesob-house.json");
const SESSION_DAYS = 7;
const REMEMBER_DAYS = 30;

export { ROLES };

const seedAccounts = [
  {
    fullName: "Mesob Admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@mesob.house",
    phone: "911000001",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
    role: "admin",
    preference: "all-heritage",
  },
  {
    fullName: "Kitchen Lead",
    email: process.env.SEED_KITCHEN_EMAIL ?? "kitchen@mesob.house",
    phone: "911000002",
    password: process.env.SEED_KITCHEN_PASSWORD ?? "Kitchen123!",
    role: "employee",
    preference: "all-heritage",
  },
  {
    fullName: "Guest Diner",
    email: process.env.SEED_GUEST_EMAIL ?? "guest@mesob.house",
    phone: "911000003",
    password: process.env.SEED_GUEST_PASSWORD ?? "Guest123!",
    role: "customer",
    preference: "all-heritage",
  },
];

let writeChain = Promise.resolve();

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

/** Ethiopian numbers are stored as the nine digits after +251. */
export const normalizePhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
};

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(String(password), salt, 64);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export const hashToken = (token) => createHash("sha256").update(String(token)).digest("hex");

/** Never send passwordHash or the session table to the browser. */
export function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preference: user.preference ?? null,
    provider: user.provider ?? null,
    createdAt: user.createdAt,
  };
}

function seedDb() {
  const now = new Date().toISOString();
  return {
    version: 1,
    users: seedAccounts.map((account) => ({
      id: randomUUID(),
      fullName: account.fullName,
      email: normalizeEmail(account.email),
      phone: normalizePhone(account.phone),
      passwordHash: hashPassword(account.password),
      role: account.role,
      preference: account.preference,
      provider: "password",
      createdAt: now,
    })),
    sessions: [],
    orders: [],
  };
}

async function writeToDisk(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

async function readFromDisk() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.orders)) {
      throw new Error("The local database is missing one of its tables.");
    }
    return parsed;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const seeded = seedDb();
    await writeToDisk(seeded);
    return seeded;
  }
}

export async function readDb() {
  // Read the file on every call. Next dev can serve route handlers and server
  // actions in different workers, so an in-memory cache would go stale after
  // a write in another worker. The file is tiny, so this is cheap and correct.
  return readFromDisk();
}

/**
 * Serialises writes inside the process and replaces the file atomically.
 * Mutations receive a cloned database so a failed write cannot leave a
 * half-written document on disk.
 */
export async function mutateDb(mutator) {
  const run = async () => {
    const current = structuredClone(await readFromDisk());
    const result = await mutator(current);
    await writeToDisk(current);
    return result;
  };
  const next = writeChain.then(run, run);
  writeChain = next.catch(() => {});
  return next;
}

export async function findUserByEmail(email) {
  const db = await readDb();
  return db.users.find((user) => user.email === normalizeEmail(email)) ?? null;
}

export async function findUserByPhone(phone) {
  const db = await readDb();
  return db.users.find((user) => user.phone === normalizePhone(phone)) ?? null;
}

export async function findUserByIdentifier(identifier) {
  const db = await readDb();
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return db.users.find((user) => user.email === email || (phone && user.phone === phone)) ?? null;
}

export async function findUserById(id) {
  const db = await readDb();
  return db.users.find((user) => user.id === id) ?? null;
}

/**
 * Creates a customer/staff account. `password` is optional for provider
 * accounts (the demo social buttons); those accounts cannot password-sign-in.
 */
export async function createUser(values) {
  return mutateDb((db) => {
    const email = normalizeEmail(values.email);
    const phone = normalizePhone(values.phone);
    if (db.users.some((user) => user.email === email)) {
      return { ok: false, message: "An account with that email already exists." };
    }
    if (phone && db.users.some((user) => user.phone === phone)) {
      return { ok: false, message: "An account with that mobile number already exists." };
    }
    const user = {
      id: randomUUID(),
      fullName: String(values.fullName ?? "").trim(),
      email,
      phone,
      passwordHash: values.password ? hashPassword(values.password) : null,
      role: ROLES.includes(values.role) ? values.role : "customer",
      preference: values.preference ?? null,
      provider: values.provider ?? "password",
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return { ok: true, user };
  });
}

export async function findOrCreateSocialUser(provider) {
  const key = String(provider ?? "Demo").trim().toLowerCase().replace(/\s+/g, "-");
  const email = `${key}.guest@mesob.house`;
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const created = await createUser({
    fullName: `${provider} Guest`,
    email,
    phone: "",
    password: null,
    role: "customer",
    preference: "all-heritage",
    provider,
  });
  return created.ok ? created.user : findUserByEmail(email);
}

export async function listUsers() {
  const db = await readDb();
  return db.users.map(toSafeUser);
}

export async function updateUserRole(userId, role) {
  if (!ROLES.includes(role)) return { ok: false, message: "Unknown role." };
  return mutateDb((db) => {
    const user = db.users.find((entry) => entry.id === userId);
    if (!user) return { ok: false, message: "User not found." };
    user.role = role;
    return { ok: true, user: toSafeUser(user) };
  });
}

export async function createSessionRecord(userId, { remember = false } = {}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  await mutateDb((db) => {
    // Expired rows are harmless but pruning keeps the file small.
    db.sessions = db.sessions.filter((session) => new Date(session.expiresAt) > now);
    db.sessions.push({
      id: randomUUID(),
      tokenHash,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    });
  });

  return { token, expiresAt, days };
}

export async function getSessionUserByToken(token) {
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((entry) => entry.tokenHash === hashToken(token));
  if (!session || new Date(session.expiresAt) <= new Date()) return null;
  return toSafeUser(db.users.find((user) => user.id === session.userId));
}

export async function deleteSessionByToken(token) {
  if (!token) return;
  await mutateDb((db) => {
    const tokenHash = hashToken(token);
    db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
  });
}

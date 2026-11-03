import "server-only";

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getPrisma } from "./prisma";
import { ROLES } from "./roles";

const SESSION_DAYS = 7;
const REMEMBER_DAYS = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const iso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Transactions are owned by Prisma. The database still enforces the status
 * machine and writes history/audit rows, so every write transaction sets the
 * actor in a transaction-local Postgres setting before touching a row.
 */
export function withTransaction(fn, options = undefined) {
  return getPrisma().$transaction(fn, options);
}

/**
 * The order and user triggers read the actor from transaction-local settings.
 * This is the one place where a raw statement is required: Prisma's model API
 * cannot emit `set_config(..., true)`.
 */
export async function setDbActor(client, actor) {
  const actorId = actor?.id ? String(actor.id) : "";
  const actorRole = actor?.role ? String(actor.role) : "";
  await client.$queryRaw`
    SELECT
      set_config('app.actor_id', ${actorId}, true),
      set_config('app.actor_role', ${actorRole}, true)
  `;
}

export { ROLES };

export const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

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
  return (
    expected.length === candidate.length && timingSafeEqual(expected, candidate)
  );
}

export const hashToken = (token) =>
  createHash("sha256").update(String(token)).digest("hex");

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    passwordHash: row.passwordHash,
    role: row.role,
    preference: row.preference,
    provider: row.provider,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

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

export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = await getPrisma().user.findFirst({
    where: { email: normalized },
  });
  return mapUser(row);
}

export async function findUserByPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const row = await getPrisma().user.findFirst({
    where: { phone: normalized },
  });
  return mapUser(row);
}

export async function findUserByIdentifier(identifier) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const row = await getPrisma().user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });
  return mapUser(row);
}

export async function findUserById(id) {
  if (!id || !UUID_RE.test(String(id))) return null;
  const row = await getPrisma().user.findUnique({
    where: { id: String(id) },
  });
  return mapUser(row);
}

/**
 * Creates a customer/staff account. `password` is optional for provider
 * accounts (the demo social buttons); those accounts cannot password-sign-in.
 */
export async function createUser(values) {
  const email = normalizeEmail(values.email);
  const phone = normalizePhone(values.phone);
  const role = ROLES.includes(values.role) ? values.role : "customer";
  const passwordHash = values.password ? hashPassword(values.password) : null;

  try {
    const row = await getPrisma().user.create({
      data: {
        fullName: String(values.fullName ?? "").trim(),
        email,
        phone,
        passwordHash,
        role,
        preference: values.preference ?? null,
        provider: values.provider ?? "password",
      },
    });
    return { ok: true, user: mapUser(row) };
  } catch (error) {
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      return {
        ok: false,
        message: "An account with that email already exists.",
      };
    }

    if (phone) {
      const existingByPhone = await findUserByPhone(phone);
      if (existingByPhone) {
        return {
          ok: false,
          message: "An account with that mobile number already exists.",
        };
      }
    }

    if (error?.code === "P2002") {
      return { ok: false, message: "Could not create that account." };
    }
    throw error;
  }
}

export async function findOrCreateSocialUser(provider) {
  const key = String(provider ?? "Demo")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
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
  const rows = await getPrisma().user.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toSafeUser(mapUser(row)));
}

export async function updateUserRole(userId, role, actor = null) {
  if (!ROLES.includes(role)) return { ok: false, message: "Unknown role." };
  if (!UUID_RE.test(String(userId))) {
    return { ok: false, message: "User not found." };
  }

  return withTransaction(async (tx) => {
    if (actor) await setDbActor(tx, actor);
    try {
      const row = await tx.user.update({
        where: { id: String(userId) },
        data: { role },
      });
      return { ok: true, user: toSafeUser(mapUser(row)) };
    } catch (error) {
      if (error?.code === "P2025") {
        return { ok: false, message: "User not found." };
      }
      throw error;
    }
  });
}

export async function createSessionRecord(userId, { remember = false } = {}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS;
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await getPrisma().session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt: expiresAt.toISOString(), days };
}

export async function getSessionUserByToken(token) {
  if (!token) return null;

  const row = await getPrisma().session.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return toSafeUser(mapUser(row?.user));
}

/** Revocation, not deletion: the row remains as an audit trail. */
export async function deleteSessionByToken(token) {
  if (!token) return;
  await getPrisma().session.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

/** Used by the session API and future account screens without exposing tokens. */
export async function listActiveSessionsForUser(userId) {
  if (!UUID_RE.test(String(userId))) return [];
  const rows = await getPrisma().session.findMany({
    where: {
      userId: String(userId),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      lastSeenAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: iso(row.createdAt),
    expiresAt: iso(row.expiresAt),
    lastSeenAt: iso(row.lastSeenAt),
  }));
}

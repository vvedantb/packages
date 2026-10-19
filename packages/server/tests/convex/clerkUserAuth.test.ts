import { describe, expect, it } from "vitest";
import { createClerkUserAuth } from "@vvedantb/server";

// A fake Convex ctx. Index lookups filter on `field === value` in insertion
// order (Convex orders equal index keys by creation time); `unique()` throws on
// two matches like Convex does. Each app's copy (ported below) and the kit run
// against the same fake, so only their own logic differs.

type Identity = {
  subject: string;
  email?: string;
  givenName?: string;
  firstName?: string;
  name?: string;
};

type User = {
  _id: string;
  _creationTime: number;
  clerkId: string;
  email?: string;
  firstName?: string;
  fullName?: string;
  admin?: boolean | string;
  isAdmin?: boolean;
};

type Account = {
  _id: string;
  _creationTime: number;
  clerkUserId: string;
  createdAt: number;
  lastSeenAt: number;
};

type DataModel = {
  users: {
    document: User;
    indexes: { by_clerk_id: ["clerkId", "_creationTime"]; by_email: ["email", "_creationTime"] };
  };
  accounts: {
    document: Account;
    indexes: { by_clerk_user: ["clerkUserId", "_creationTime"] };
  };
};

type FieldEq = { field: string; value: string | undefined };

function fakeCtx<Doc extends { _id: string; _creationTime: number }>(
  table: string,
  identity: Identity | null,
  rows: Doc[],
  build: (fields: Omit<Doc, "_id" | "_creationTime">, id: string, creationTime: number) => Doc,
) {
  const writes: Array<{ op: "insert" | "patch"; id: string; value: object }> = [];
  function matches(range: FieldEq, doc: Doc): boolean {
    return Object.entries(doc).some(([key, value]) => key === range.field && value === range.value);
  }
  return {
    writes,
    rows,
    auth: { getUserIdentity: async () => identity },
    db: {
      query(name: string) {
        expect(name).toBe(table);
        return {
          withIndex(_index: string, range: (q: { eq(field: string, value: string | undefined): FieldEq }) => FieldEq) {
            const eq = range({ eq: (field, value) => ({ field, value }) });
            const found = rows.filter((doc) => matches(eq, doc));
            return {
              first: async () => found[0] ?? null,
              unique: async () => {
                if (found.length > 1) throw new Error("unique() query returned more than one result");
                return found[0] ?? null;
              },
            };
          },
        };
      },
      get: async (id: string) => rows.find((doc) => doc._id === id) ?? null,
      insert: async (name: string, fields: Omit<Doc, "_id" | "_creationTime">) => {
        expect(name).toBe(table);
        const id = `${table}_${rows.length + 1}`;
        rows.push(build(fields, id, rows.length + 1));
        writes.push({ op: "insert", id, value: fields });
        return id;
      },
      patch: async (id: string, value: Partial<Omit<Doc, "_id" | "_creationTime">>) => {
        const index = rows.findIndex((doc) => doc._id === id);
        const current = rows[index];
        if (current === undefined) throw new Error(`no row ${id}`);
        rows[index] = { ...current, ...value };
        writes.push({ op: "patch", id, value });
      },
    },
  };
}

function usersCtx(identity: Identity | null, rows: User[] = []) {
  return fakeCtx<User>("users", identity, rows, (fields, _id, _creationTime) => ({ ...fields, _id, _creationTime }));
}

function accountsCtx(identity: Identity | null, rows: Account[] = []) {
  return fakeCtx<Account>("accounts", identity, rows, (fields, _id, _creationTime) => ({ ...fields, _id, _creationTime }));
}

type UsersCtx = ReturnType<typeof usersCtx>;

const userRow = (id: string, fields: Omit<User, "_id" | "_creationTime">): User => ({ _id: id, _creationTime: 0, ...fields });

/** Run `fn`, returning `{ value }` or `{ error }` so two copies can be compared. */
async function settle<T>(fn: () => Promise<T>): Promise<{ value: T } | { error: string }> {
  try {
    return { value: await fn() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// ---- Ports of each app's code (convex/auth.ts, convex/users.ts) --------------

/** app-a: getUserByClerkId (`.first()`) and a throwing getCurrentUserId. */
const appA = {
  async getUserByClerkId(ctx: UsersCtx, clerkId: string) {
    return ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId)).first();
  },
  async getCurrentUserId(ctx: UsersCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkUserId = identity.subject;
    if (!clerkUserId) throw new Error("Not authenticated");
    const user = await appA.getUserByClerkId(ctx, clerkUserId);
    if (!user) throw new Error("Not authenticated");
    return user._id;
  },
  /** ensureUserExists without the profile insert (that stays in the app). */
  async ensureUserExists(ctx: UsersCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkUserId = identity.subject;
    if (!clerkUserId) throw new Error("Clerk user ID is required");
    const existingUser = await appA.getUserByClerkId(ctx, clerkUserId);
    const email = identity.email?.trim().toLowerCase() || undefined;
    if (existingUser) {
      if (email !== undefined && existingUser.email !== email) {
        await ctx.db.patch(existingUser._id, { email });
      }
      return { userId: existingUser._id, wasCreated: false };
    }
    const userId = await ctx.db.insert("users", {
      clerkId: clerkUserId,
      email,
      firstName: typeof identity.givenName === "string" ? identity.givenName : undefined,
      fullName: typeof identity.name === "string" ? identity.name : undefined,
    });
    return { userId, wasCreated: true };
  },
};

/** app-b: clerk id lookup then a legacy email lookup; admin via `admin === true`. */
const appB = {
  async getCurrentUserId(ctx: UsersCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const clerkUserId = identity.subject;
    if (clerkUserId) {
      const byClerkId = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId)).first();
      if (byClerkId) return byClerkId._id;
    }
    const email = identity.email || "";
    if (!email) return null;
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    if (user) return user._id;
    return null;
  },
  async getCurrentUser(ctx: UsersCtx) {
    const userId = await appB.getCurrentUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
  },
  async checkIsAdmin(ctx: UsersCtx) {
    const currentUser = await appB.getCurrentUser(ctx);
    if (!currentUser) return false;
    return currentUser.admin === true;
  },
  async ensureUserExists(ctx: UsersCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkUserId = identity.subject;
    const email = identity.email || "";
    if (!clerkUserId) throw new Error("Clerk user ID is required");
    const existingUser = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId)).first();
    if (existingUser) return { userId: existingUser._id, wasCreated: false };
    const userId = await ctx.db.insert("users", {
      clerkId: clerkUserId,
      email: email,
      firstName: typeof identity.firstName === "string" ? identity.firstName : undefined,
      fullName: typeof identity.name === "string" ? identity.name : undefined,
    });
    return { userId, wasCreated: true };
  },
};

/** app-d: `!identity?.subject` → null, clerk id then email; admin via `isAdmin === true`. */
const appD = {
  async getCurrentUserId(ctx: UsersCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    const byClerk = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).first();
    if (byClerk) return byClerk._id;
    const email = typeof identity.email !== "string" || identity.email.length === 0 ? undefined : identity.email;
    if (!email) return null;
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    return user?._id ?? null;
  },
  async isCurrentUserAdmin(ctx: UsersCtx) {
    const userId = await appD.getCurrentUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.isAdmin === true;
  },
};

/** app-e: `.unique()` on `by_clerk_user` / `clerkUserId`. */
const appE = {
  async current(ctx: ReturnType<typeof accountsCtx>) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    return ctx.db.query("accounts").withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject)).unique();
  },
};

// ---- The kit, configured per app -----------------------------------------

const kitA = createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId", adminField: "admin" });
const kitD = createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId", adminField: "isAdmin" });
const kitE = createClerkUserAuth<DataModel>()({ table: "accounts", index: "by_clerk_user", field: "clerkUserId", lookup: "unique" });

/** The legacy email lookup app-b and app-d keep, composed after the kit. */
async function legacyEmailUserId(ctx: UsersCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email || "";
  if (!email) return null;
  const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
  return user?._id ?? null;
}

const identities: Record<string, Identity | null> = {
  "no identity": null,
  "empty subject": { subject: "" },
  "empty subject with email": { subject: "", email: "old@example.com" },
  "known subject": { subject: "user_1", email: "a@example.com" },
  "duplicate subject": { subject: "user_dup" },
  "unknown subject": { subject: "user_9" },
  "unknown subject, legacy email": { subject: "user_9", email: "old@example.com" },
};

function seedUsers(): User[] {
  return [
    userRow("users_a", { clerkId: "user_1", email: "a@example.com", admin: true, isAdmin: true }),
    userRow("users_b", { clerkId: "legacy", email: "old@example.com", admin: "true", isAdmin: false }),
    userRow("users_c", { clerkId: "user_dup", email: "c@example.com" }),
    userRow("users_d", { clerkId: "user_dup", email: "d@example.com", admin: true }),
  ];
}

describe("createClerkUserAuth: index lookups", () => {
  for (const [label, identity] of Object.entries(identities)) {
    it(`${label}: app-a getUserByClerkId / requireCurrentUserId`, async () => {
      const subject = identity?.subject ?? "";
      expect(await kitA.getUserByClerkId(usersCtx(identity, seedUsers()), subject)).toEqual(
        await appA.getUserByClerkId(usersCtx(identity, seedUsers()), subject),
      );
      expect(await settle(() => kitA.requireCurrentUserId(usersCtx(identity, seedUsers())))).toEqual(
        await settle(() => appA.getCurrentUserId(usersCtx(identity, seedUsers()))),
      );
    });

    it(`${label}: app-b getCurrentUserId / getCurrentUser / checkIsAdmin with the email lookup kept in the app`, async () => {
      // An empty subject is unreachable in Convex (subject is always set); app-b
      // would still try the email there, the kit returns null first.
      const reachable = identity === null || identity.subject !== "";
      const kitUserId = async (ctx: UsersCtx) => (await kitA.getCurrentUserId(ctx)) ?? (await legacyEmailUserId(ctx));
      const kitUser = async (ctx: UsersCtx) => {
        const userId = await kitUserId(ctx);
        return userId ? ctx.db.get(userId) : null;
      };
      if (!reachable) return;
      expect(await kitUserId(usersCtx(identity, seedUsers()))).toEqual(await appB.getCurrentUserId(usersCtx(identity, seedUsers())));
      expect(await kitUser(usersCtx(identity, seedUsers()))).toEqual(await appB.getCurrentUser(usersCtx(identity, seedUsers())));
    });

    it(`${label}: app-d getCurrentUserId with the email lookup kept in the app`, async () => {
      const ctx = () => usersCtx(identity, seedUsers());
      const kitUserId = async (c: UsersCtx) => {
        const identityNow = await c.auth.getUserIdentity();
        if (!identityNow?.subject) return null;
        return (await kitD.getCurrentUserId(c)) ?? (await legacyEmailUserId(c));
      };
      expect(await kitUserId(ctx())).toEqual(await appD.getCurrentUserId(ctx()));
    });

    it(`${label}: app-e current row with unique()`, async () => {
      const accounts = (): Account[] => [
        { _id: "accounts_1", _creationTime: 0, clerkUserId: "user_1", createdAt: 1, lastSeenAt: 1 },
        { _id: "accounts_2", _creationTime: 0, clerkUserId: "user_dup", createdAt: 1, lastSeenAt: 1 },
        { _id: "accounts_3", _creationTime: 0, clerkUserId: "user_dup", createdAt: 2, lastSeenAt: 2 },
      ];
      expect(await settle(() => kitE.getCurrentUser(accountsCtx(identity, accounts())))).toEqual(
        await settle(() => appE.current(accountsCtx(identity, accounts()))),
      );
    });
  }

  it("first() takes the earliest duplicate, unique() throws", async () => {
    const identity = { subject: "user_dup" };
    expect(await kitA.getCurrentUserId(usersCtx(identity, seedUsers()))).toBe("users_c");
    const kitUnique = createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId", lookup: "unique" });
    await expect(kitUnique.getCurrentUserId(usersCtx(identity, seedUsers()))).rejects.toThrow("more than one result");
  });

  it("returns null for no identity, an empty subject and no row", async () => {
    expect(await kitA.getCurrentUserId(usersCtx(null, seedUsers()))).toBeNull();
    expect(await kitA.getCurrentUserId(usersCtx({ subject: "" }, seedUsers()))).toBeNull();
    expect(await kitA.getCurrentUser(usersCtx({ subject: "user_9" }, seedUsers()))).toBeNull();
  });

  it("requireCurrentUserId throws the default, the config and the per-call message", async () => {
    const ctx = () => usersCtx(null);
    await expect(kitA.requireCurrentUserId(ctx())).rejects.toThrow(new Error("Not authenticated"));
    await expect(kitA.requireCurrentUserId(ctx(), "User not found")).rejects.toThrow(new Error("User not found"));
    const custom = createClerkUserAuth<DataModel>()({
      table: "users",
      index: "by_clerk_id",
      field: "clerkId",
      unauthenticatedMessage: "Sign in to continue",
    });
    await expect(custom.requireCurrentUserId(ctx())).rejects.toThrow(new Error("Sign in to continue"));
    expect(await custom.requireCurrentUserId(usersCtx({ subject: "user_1" }, seedUsers()))).toBe("users_a");
  });
});

describe("createClerkUserAuth: isCurrentUserAdmin", () => {
  const cases: Array<[string, Identity | null]> = [
    ["no identity", null],
    ["admin row", { subject: "user_1" }],
    ["string 'true' is not admin", { subject: "legacy" }],
    ["missing flag", { subject: "user_dup" }],
    ["no row", { subject: "user_9" }],
  ];
  for (const [label, identity] of cases) {
    it(`${label}: matches app-b (admin) and app-d (isAdmin)`, async () => {
      // Identities without email, so the legacy lookup cannot change the row.
      expect(await kitA.isCurrentUserAdmin(usersCtx(identity, seedUsers()))).toBe(await appB.checkIsAdmin(usersCtx(identity, seedUsers())));
      expect(await kitD.isCurrentUserAdmin(usersCtx(identity, seedUsers()))).toBe(await appD.isCurrentUserAdmin(usersCtx(identity, seedUsers())));
    });
  }

  it("throws when adminField is not configured", async () => {
    await expect(kitE.isCurrentUserAdmin(accountsCtx({ subject: "user_1" }))).rejects.toThrow("set adminField");
  });
});

describe("createClerkUserAuth: ensureUser", () => {
  const normalise = (email: string | undefined) => email?.trim().toLowerCase() || undefined;
  const kitEnsureA = (ctx: UsersCtx) =>
    kitA.ensureUser(
      ctx,
      (identity) => ({
        clerkId: identity.subject,
        email: normalise(identity.email),
        firstName: typeof identity.givenName === "string" ? identity.givenName : undefined,
        fullName: typeof identity.name === "string" ? identity.name : undefined,
      }),
      {
        patch: (existing, identity) => {
          const email = normalise(identity.email);
          return email !== undefined && existing.email !== email ? { email } : undefined;
        },
      },
    );
  const kitEnsureB = (ctx: UsersCtx) =>
    kitA.ensureUser(ctx, (identity) => ({
      clerkId: identity.subject,
      email: identity.email || "",
      firstName: typeof identity.firstName === "string" ? identity.firstName : undefined,
      fullName: typeof identity.name === "string" ? identity.name : undefined,
    }));

  const ensureIdentities: Record<string, Identity | null> = {
    ...identities,
    "known subject, new email": { subject: "user_1", email: " New@Example.com " },
    "known subject, same email": { subject: "user_1", email: "a@example.com" },
    "new user with names": { subject: "user_new", email: "N@example.com", givenName: "Ada", firstName: "Ada", name: "Ada L" },
  };

  for (const [label, identity] of Object.entries(ensureIdentities)) {
    const pairs: Array<[string, typeof appA.ensureUserExists, typeof kitEnsureA]> = [
      ["app-a", appA.ensureUserExists, kitEnsureA],
      ["app-b", appB.ensureUserExists, kitEnsureB],
    ];
    for (const [app, reference, kit] of pairs) {
      it(`${label}: ${app} result, thrown message, rows and writes`, async () => {
        const ours = usersCtx(identity, seedUsers());
        const theirs = usersCtx(identity, seedUsers());
        expect(await settle(() => kit(ours))).toEqual(await settle(() => reference(theirs)));
        expect(ours.rows).toEqual(theirs.rows);
        expect(ours.writes).toEqual(theirs.writes);
      });
    }
  }

  it("uses the unauthenticated and missing-subject messages from options", async () => {
    const build = (identity: Identity) => ({ clerkId: identity.subject });
    await expect(kitA.ensureUser(usersCtx(null), build)).rejects.toThrow(new Error("Not authenticated"));
    await expect(kitA.ensureUser(usersCtx({ subject: "" }), build)).rejects.toThrow(new Error("Clerk user ID is required"));
    const options = { unauthenticatedMessage: "Sign in to continue", missingSubjectMessage: "Sign in to continue" };
    await expect(kitA.ensureUser(usersCtx(null), build, options)).rejects.toThrow(new Error("Sign in to continue"));
    await expect(kitA.ensureUser(usersCtx({ subject: "" }), build, options)).rejects.toThrow(new Error("Sign in to continue"));
  });

  it("does not call patch when the row is created", async () => {
    const ctx = usersCtx({ subject: "user_new" });
    const result = await kitA.ensureUser(ctx, (identity) => ({ clerkId: identity.subject }), {
      patch: () => {
        throw new Error("patch called");
      },
    });
    expect(result).toEqual({ userId: "users_1", wasCreated: true });
  });
});

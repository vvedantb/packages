import type { GenericId } from "convex/values";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { tempId } from "@vvedantb/server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tempId", () => {
  it("defaults to crypto.randomUUID() like app-a and app-c", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("123e4567-e89b-42d3-a456-426614174000");
    // app-a: tempId<T>(); app-c: tempId(table). Both return crypto.randomUUID().
    expect(tempId<"skills">()).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(tempId("tasks")).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("returns real UUIDs by default", () => {
    const a = tempId("tasks");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(tempId("tasks")).not.toBe(a);
  });

  it('"timestamp" reproduces app-d optimisticId exactly', () => {
    vi.spyOn(Date, "now").mockReturnValue(1_760_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    const appD = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    expect(tempId("reminders", { format: "timestamp" })).toBe(appD);
    expect(appD).toMatch(/^optimistic_1760000000000_[0-9a-z]+$/);
  });

  it("is typed as the table's id", () => {
    expectTypeOf(tempId("tasks")).toEqualTypeOf<GenericId<"tasks">>();
    expectTypeOf(tempId<"users">()).toEqualTypeOf<GenericId<"users">>();
  });
});

import { describe, expect, it, vi } from "vitest";

/**
 * The store is module state, so each test re-imports it fresh rather than
 * relying on a reset helper that production code would never call.
 */
async function freshStore() {
  vi.resetModules();
  return import("@/lib/study/read-sections");
}

describe("markRead", () => {
  it("counts a section once, however many times it is marked", async () => {
    const store = await freshStore();

    store.markRead("ch-1", "intro");
    store.markRead("ch-1", "intro");

    expect(store.readCount("ch-1")).toBe(1);
  });

  it("keeps chapters separate, since anchor ids only have to be unique within one", async () => {
    const store = await freshStore();

    store.markRead("ch-1", "summary");
    store.markRead("ch-2", "summary");

    expect(store.hasRead("ch-1", "summary")).toBe(true);
    expect(store.hasRead("ch-2", "summary")).toBe(true);
    expect(store.readCount("ch-1")).toBe(1);
  });

  it("reports nothing read for a chapter that has never been touched", async () => {
    const store = await freshStore();

    expect(store.readCount("ch-9")).toBe(0);
    expect(store.hasRead("ch-9", "intro")).toBe(false);
  });

  it("notifies subscribers only when something actually changed", async () => {
    const store = await freshStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.markRead("ch-1", "intro");
    store.markRead("ch-1", "intro");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", async () => {
    const store = await freshStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.markRead("ch-1", "intro");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("active chapter progress", () => {
  it("is null until a chapter registers", async () => {
    const store = await freshStore();
    expect(store.getProgress()).toBeNull();
  });

  it("starts from the count the server already knew about", async () => {
    const store = await freshStore();

    store.setActiveChapter({ slug: "ch-1", initialCount: 7, total: 19 });

    expect(store.getProgress()).toEqual({ read: 7, total: 19 });
  });

  it("adds this session's reading to the server's count", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 7, total: 19 });

    store.markRead("ch-1", "vlans");

    expect(store.getProgress()).toEqual({ read: 8, total: 19 });
  });

  it("ignores reading in a chapter that isn't the active one", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 2, total: 19 });

    store.markRead("ch-2", "intro");

    expect(store.getProgress()).toEqual({ read: 2, total: 19 });
  });

  it("returns the identical object when nothing changed", async () => {
    // The contract useSyncExternalStore enforces: a getSnapshot that builds a
    // fresh object every call re-renders forever. This is the regression test
    // for that, not a style preference.
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 3, total: 19 });

    const first = store.getProgress();
    store.markRead("ch-2", "elsewhere");

    expect(store.getProgress()).toBe(first);
  });

  it("returns a new object once the count moves", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 3, total: 19 });

    const first = store.getProgress();
    store.markRead("ch-1", "subnetting");

    expect(store.getProgress()).not.toBe(first);
  });

  it("clears when the reader leaves the chapter", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 3, total: 19 });

    store.clearActiveChapter("ch-1");

    expect(store.getProgress()).toBeNull();
  });

  it("does not let an outgoing chapter clear the incoming one", async () => {
    // Effect cleanup for the old chapter can run after the new chapter's
    // effect during a client-side navigation, which without the slug guard
    // would blank the bar for the page the reader just opened.
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 3, total: 19 });
    store.setActiveChapter({ slug: "ch-2", initialCount: 0, total: 12 });

    store.clearActiveChapter("ch-1");

    expect(store.getProgress()).toEqual({ read: 0, total: 12 });
  });

  it("carries reading already done in a chapter revisited this session", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 0, total: 19 });
    store.markRead("ch-1", "intro");

    store.clearActiveChapter("ch-1");
    store.setActiveChapter({ slug: "ch-1", initialCount: 0, total: 19 });

    expect(store.getProgress()).toEqual({ read: 1, total: 19 });
  });

  it("has no server-side progress to report", async () => {
    const store = await freshStore();
    store.setActiveChapter({ slug: "ch-1", initialCount: 3, total: 19 });

    expect(store.getServerProgress()).toBeNull();
  });
});

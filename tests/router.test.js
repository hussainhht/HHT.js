import assert from "node:assert/strict";
import { test } from "node:test";
import { createRouter, notFound } from "../framework/router.js";

function createWindow(initialHash) {
  const listeners = [];
  let hash = initialHash;

  return {
    location: {
      get hash() {
        return hash;
      },
      set hash(nextHash) {
        hash = nextHash;
        for (const listener of listeners) listener();
      },
    },
    addEventListener(type, listener) {
      if (type === "hashchange") listeners.push(listener);
    },
  };
}

test("unknown hash routes show the built-in 404 view without redirecting", () => {
  const originalWindow = globalThis.window;
  globalThis.window = createWindow("#/missing");

  try {
    const router = createRouter();
    router.register("/").register("/active");
    router.start();

    assert.equal(router.getCurrentRoute(), "/missing");
    assert.equal(window.location.hash, "#/missing");
    assert.deepEqual(router.getCurrentView((path) => ({ path })), notFound("/missing"));

    router.navigate("/active");
    assert.equal(router.getCurrentRoute(), "/active");
    assert.deepEqual(router.getCurrentView((path) => ({ path })), { path: "/active" });

    router.navigate("/unknown");
    assert.equal(window.location.hash, "#/unknown");
    assert.deepEqual(router.getCurrentView((path) => ({ path })), notFound("/unknown"));

    window.location.hash = "#/direct-change";
    assert.deepEqual(router.getCurrentView((path) => ({ path })), notFound("/direct-change"));

    const refreshedRouter = createRouter();
    refreshedRouter.register("/").register("/active");
    refreshedRouter.start();
    assert.equal(refreshedRouter.getCurrentRoute(), "/direct-change");
    assert.deepEqual(refreshedRouter.getCurrentView((path) => ({ path })), notFound("/direct-change"));

    let routeUpdates = 0;
    refreshedRouter.subscribe(() => { routeUpdates += 1; });
    refreshedRouter.register("/direct-change");
    assert.equal(routeUpdates, 1);
    assert.deepEqual(refreshedRouter.getCurrentView((path) => ({ path })), { path: "/direct-change" });
  } finally {
    globalThis.window = originalWindow;
  }
});

test("router.subscribe returns an unsubscribe function", () => {
  const originalWindow = globalThis.window;
  globalThis.window = createWindow("#/");

  try {
    const router = createRouter();
    router.register("/").register("/active").register("/completed");
    const seenA = [];
    const seenB = [];
    const unsubscribeA = router.subscribe((path) => seenA.push(path));
    const unsubscribeB = router.subscribe((path) => seenB.push(path));
    assert.equal(typeof unsubscribeA, "function");

    router.start();
    router.navigate("/active");
    assert.deepEqual(seenA, ["/", "/active"]);

    unsubscribeA();
    unsubscribeA();
    router.navigate("/completed");
    window.location.hash = "#/";

    assert.deepEqual(seenA, ["/", "/active"], "no changes after unsubscribe");
    assert.deepEqual(seenB, ["/", "/active", "/completed", "/"]);
    assert.equal(router.getCurrentRoute(), "/", "routing itself is unaffected");

    unsubscribeB();
  } finally {
    globalThis.window = originalWindow;
  }
});

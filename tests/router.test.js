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
  } finally {
    globalThis.window = originalWindow;
  }
});

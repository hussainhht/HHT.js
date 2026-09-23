import assert from "node:assert/strict";
import { test } from "node:test";
import { createPage } from "../todo/page.js";
import { appState } from "../todo/state.js";

test("the page reads the application store shared across modules", () => {
  const originalState = appState.get();

  try {
    assert.equal(createPage().children[0].children[0], originalState.title);

    appState.set({ title: "Shared state" });

    assert.equal(createPage().children[0].children[0], "Shared state");
  } finally {
    appState.set(originalState);
  }
});

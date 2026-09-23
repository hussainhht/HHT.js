import assert from "node:assert/strict";
import { test } from "node:test";
import { state } from "../framework/store.js";

test("state can be read and updated without the DOM", () => {
  const count = state(0);

  assert.equal(count.get(), 0);
  count.set(4);
  assert.equal(count.get(), 4);
  count.set((current) => current + 1);
  assert.equal(count.get(), 5);
});

test("state subscribers receive each new value", () => {
  const message = state("initial");
  const updates = [];
  message.subscribe((value) => updates.push(value));

  message.set("first");
  message.set((current) => `${current} update`);

  assert.deepEqual(updates, ["first", "first update"]);
  assert.equal(message.get(), "first update");
});

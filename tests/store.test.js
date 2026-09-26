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

test("subscribe returns an unsubscribe function that stops the listener", () => {
  const count = state(0);
  const updates = [];
  const unsubscribe = count.subscribe((value) => updates.push(value));

  assert.equal(typeof unsubscribe, "function");
  count.set(1);
  unsubscribe();
  count.set(2);

  assert.deepEqual(updates, [1]);
  assert.equal(count.get(), 2, "state still updates without subscribers");
});

test("calling unsubscribe more than once is safe", () => {
  const count = state(0);
  const updates = [];
  const unsubscribe = count.subscribe((value) => updates.push(value));
  count.subscribe((value) => updates.push(`other:${value}`));

  unsubscribe();
  assert.doesNotThrow(() => {
    unsubscribe();
    unsubscribe();
  });
  count.set(1);

  assert.deepEqual(updates, ["other:1"]);
});

test("unsubscribing one listener keeps the others, in order", () => {
  const count = state(0);
  const calls = [];
  const unsubscribeA = count.subscribe((value) => calls.push(`A:${value}`));
  count.subscribe((value) => calls.push(`B:${value}`));
  count.subscribe((value) => calls.push(`C:${value}`));

  count.set(1);
  unsubscribeA();
  count.set(2);

  assert.deepEqual(calls, ["A:1", "B:1", "C:1", "B:2", "C:2"]);
});

test("the same function subscribed twice is two independent subscriptions", () => {
  const count = state(0);
  const calls = [];
  const listener = (value) => calls.push(value);
  const unsubscribeA = count.subscribe(listener);
  const unsubscribeB = count.subscribe(listener);

  count.set(1);
  unsubscribeA();
  count.set(2);
  unsubscribeA();
  count.set(3);
  unsubscribeB();
  count.set(4);

  assert.deepEqual(calls, [1, 1, 2, 3]);
});

test("a listener can unsubscribe itself while being notified", () => {
  const count = state(0);
  const calls = [];
  const unsubscribeSelf = count.subscribe((value) => {
    calls.push(`self:${value}`);
    unsubscribeSelf();
  });
  count.subscribe((value) => calls.push(`next:${value}`));

  count.set(1);
  count.set(2);

  // The listener after it is not skipped, and the removed one never runs again.
  assert.deepEqual(calls, ["self:1", "next:1", "next:2"]);
});

test("a listener removed by an earlier listener is not called in that update", () => {
  const count = state(0);
  const calls = [];
  let unsubscribeB;
  count.subscribe((value) => {
    calls.push(`A:${value}`);
    unsubscribeB();
  });
  unsubscribeB = count.subscribe((value) => calls.push(`B:${value}`));
  count.subscribe((value) => calls.push(`C:${value}`));

  count.set(1);
  count.set(2);

  assert.deepEqual(calls, ["A:1", "C:1", "A:2", "C:2"]);
});

test("a listener added while notifying starts with the next update", () => {
  const count = state(0);
  const calls = [];
  let added = false;
  count.subscribe((value) => {
    calls.push(`A:${value}`);
    if (!added) {
      added = true;
      count.subscribe((next) => calls.push(`late:${next}`));
    }
  });

  count.set(1);
  count.set(2);

  assert.deepEqual(calls, ["A:1", "A:2", "late:2"]);
});

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { loadTodos, saveTodos } from "../todo/storage.js";
import { createStorage } from "./todo-dom.js";

const KEY = "todos-hhtjs";
const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

function useStorage(localStorage) {
  globalThis.window = { localStorage };
}

test("loadTodos returns saved todos and round-trips saveTodos", () => {
  useStorage(createStorage());
  const todos = [
    { id: "a", text: "one", completed: false },
    { id: "b", text: "two", completed: true },
  ];
  saveTodos(todos);
  assert.deepEqual(loadTodos(), todos);
});

test("loadTodos starts empty instead of failing on missing or bad data", () => {
  useStorage(createStorage());
  assert.deepEqual(loadTodos(), [], "nothing saved yet");

  useStorage(createStorage({ [KEY]: "{not json" }));
  assert.deepEqual(loadTodos(), [], "corrupt JSON");

  useStorage(createStorage({ [KEY]: JSON.stringify({ todos: [] }) }));
  assert.deepEqual(loadTodos(), [], "not an array");

  const good = { id: "a", text: "keep me", completed: false };
  useStorage(
    createStorage({
      [KEY]: JSON.stringify([good, { id: 1, title: "old format" }, null]),
    }),
  );
  assert.deepEqual(loadTodos(), [good], "invalid entries dropped");

  globalThis.window = {};
  assert.deepEqual(loadTodos(), [], "no localStorage at all");

  useStorage({
    getItem() {
      throw new Error("SecurityError: storage is disabled");
    },
  });
  assert.deepEqual(loadTodos(), [], "storage access throws");
});

test("saveTodos doesn't throw when storage is full or unavailable", () => {
  useStorage({
    setItem() {
      throw new Error("QuotaExceededError");
    },
  });
  assert.doesNotThrow(() => saveTodos([]));

  globalThis.window = {};
  assert.doesNotThrow(() => saveTodos([]));
});

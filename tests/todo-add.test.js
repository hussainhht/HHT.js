import assert from "node:assert/strict";
import { test } from "node:test";
import { todoState } from "../todo/state.js";
import { findByClass, getTextContent, mountTodoApp, pressKey } from "./todo-dom.js";

test("adding a todo with Enter rerenders the TodoMVC page automatically", async () => {
  const { page, restore } = await mountTodoApp();

  try {
    const todoList = () => findByClass(page(), "todo-list");
    const input = findByClass(page(), "new-todo");

    assert.equal(todoList().childNodes.length, 0);
    assert.match(getTextContent(page()), /0 items left/);

    // Other keys and empty/whitespace input add nothing.
    pressKey(input, "a", "buy milk");
    pressKey(input, "Enter", "   ");
    assert.equal(todoState.get().todos.length, 0);
    assert.equal(todoList().childNodes.length, 0);

    pressKey(input, "Enter", "  buy milk ");
    assert.deepEqual(todoState.get().todos.map((todo) => todo.text), ["buy milk"]);
    assert.equal(todoList().childNodes.length, 1);
    assert.match(getTextContent(todoList()), /buy milk/);
    assert.match(getTextContent(page()), /1 item left/);
    assert.equal(input.value, "");

    // The page is patched in place, so the same input element stays mounted.
    assert.equal(findByClass(page(), "new-todo"), input);

    pressKey(input, "Enter", "walk dog");
    assert.equal(todoList().childNodes.length, 2);
    assert.equal(getTextContent(todoList().childNodes[1]), "walk dog");
    assert.match(getTextContent(page()), /2 items left/);
  } finally {
    restore();
  }
});

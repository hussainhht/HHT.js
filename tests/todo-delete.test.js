import assert from "node:assert/strict";
import { test } from "node:test";
import { todoState } from "../todo/state.js";
import {
  findByClass,
  getTextContent,
  mountTodoApp,
  pressKey,
} from "./todo-dom.js";

test("the destroy button removes exactly the todo it belongs to", async () => {
  const { page, restore } = await mountTodoApp();

  try {
    const input = findByClass(page(), "new-todo");
    for (const text of ["one", "two", "three", "four", "five"]) {
      pressKey(input, "Enter", text);
    }

    const rows = () => findByClass(page(), "todo-list").childNodes;
    const destroy = (index) =>
      findByClass(rows()[index], "destroy").dispatchEvent(new Event("click"));
    const texts = () => todoState.get().todos.map((todo) => todo.text);
    const renderedTexts = () => rows().map(getTextContent);

    // Middle: the rows after it must still carry the handlers for their own todos.
    destroy(2);
    assert.deepEqual(texts(), ["one", "two", "four", "five"]);
    assert.deepEqual(renderedTexts(), texts());

    destroy(2);
    assert.deepEqual(texts(), ["one", "two", "five"]);

    // First.
    destroy(0);
    assert.deepEqual(texts(), ["two", "five"]);
    assert.deepEqual(renderedTexts(), texts());

    // Last.
    destroy(1);
    assert.deepEqual(texts(), ["two"]);
    assert.deepEqual(renderedTexts(), ["two"]);
    assert.match(getTextContent(page()), /1 item left/);

    // Everything.
    destroy(0);
    assert.deepEqual(texts(), []);
    assert.equal(rows().length, 0);
    assert.match(getTextContent(page()), /0 items left/);

    // Deleting the todo being edited also ends edit mode; deleting another
    // todo leaves it alone.
    pressKey(input, "Enter", "keep");
    pressKey(input, "Enter", "edited");
    const [, edited] = todoState.get().todos;
    todoState.set((current) => ({ ...current, editingId: edited.id }));
    destroy(0);
    assert.equal(todoState.get().editingId, edited.id);
    destroy(0);
    assert.equal(todoState.get().editingId, null);
  } finally {
    restore();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { todoState } from "../todo/state.js";
import {
  clickCheckbox,
  findByClass,
  getTextContent,
  mountTodoApp,
  pressKey,
} from "./todo-dom.js";

test("Clear completed removes only completed todos", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    const toggle = (index) => clickCheckbox(findByClass(rows()[index], "toggle"));
    const clearButton = () => findByClass(app.page(), "clear-completed");
    const texts = () => todoState.get().todos.map((todo) => todo.text);
    const visible = () => rows().map(getTextContent);
    const pageText = () => getTextContent(app.page());

    // Hidden until something is completed.
    for (const text of ["a", "b", "c", "d", "e"]) pressKey(input, "Enter", text);
    assert.equal(clearButton(), null);
    toggle(1);
    toggle(3);
    assert.ok(clearButton());
    assert.match(pageText(), /3 items left/);

    // Clearing keeps active todos, in order, and the count is unchanged
    // because it only ever counted active todos.
    const activeBefore = todoState.get().todos.filter((todo) => !todo.completed);
    clearButton().dispatchEvent(new Event("click"));
    assert.deepEqual(texts(), ["a", "c", "e"]);
    assert.deepEqual(todoState.get().todos, activeBefore);
    assert.deepEqual(visible(), ["a", "c", "e"]);
    assert.match(pageText(), /3 items left/);
    assert.equal(clearButton(), null);

    // Filters still work afterwards, including clearing from each of them.
    toggle(0);
    app.navigate("#/active");
    assert.deepEqual(visible(), ["c", "e"]);
    assert.match(pageText(), /2 items left/);
    clearButton().dispatchEvent(new Event("click"));
    assert.deepEqual(visible(), ["c", "e"]);
    assert.deepEqual(texts(), ["c", "e"]);

    app.navigate("#/completed");
    assert.deepEqual(visible(), []);
    app.navigate("#/");
    toggle(1);
    app.navigate("#/completed");
    assert.deepEqual(visible(), ["e"]);
    clearButton().dispatchEvent(new Event("click"));
    assert.deepEqual(visible(), []);
    assert.deepEqual(texts(), ["c"]);
    assert.match(pageText(), /1 item left/);

    app.navigate("#/active");
    assert.deepEqual(visible(), ["c"]);
    app.navigate("#/");
    assert.deepEqual(visible(), ["c"]);

    // Adding after a clear still works.
    pressKey(input, "Enter", "f");
    assert.deepEqual(visible(), ["c", "f"]);
    assert.match(pageText(), /2 items left/);

    // Edit mode ends only if the todo being edited is cleared.
    const [c] = todoState.get().todos;
    toggle(1);
    todoState.set((current) => ({ ...current, editingId: c.id }));
    clearButton().dispatchEvent(new Event("click"));
    assert.equal(todoState.get().editingId, c.id);
    toggle(0);
    clearButton().dispatchEvent(new Event("click"));
    assert.equal(todoState.get().editingId, null);
    assert.deepEqual(texts(), []);
  } finally {
    app.restore();
  }
});

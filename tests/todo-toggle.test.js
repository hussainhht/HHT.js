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

test("checking a todo toggles only that todo and its completed class", async () => {
  const { page, restore } = await mountTodoApp();

  try {
    const input = findByClass(page(), "new-todo");
    for (const text of ["one", "two", "three"]) pressKey(input, "Enter", text);

    const rows = () => findByClass(page(), "todo-list").childNodes;
    const checkbox = (index) => findByClass(rows()[index], "toggle");
    const completed = () => todoState.get().todos.map((todo) => todo.completed);
    const rowClasses = () => rows().map((row) => row.attributes.get("class"));

    // Complete the middle todo: only it changes, found by its ID.
    const [, second] = todoState.get().todos;
    clickCheckbox(checkbox(1));
    assert.deepEqual(completed(), [false, true, false]);
    assert.equal(todoState.get().todos[1].id, second.id);
    assert.deepEqual(rowClasses(), [undefined, "completed", undefined]);
    assert.equal(checkbox(1).checked, true);
    assert.match(getTextContent(page()), /2 items left/);
    assert.ok(findByClass(page(), "clear-completed"));

    // Complete the others, then uncomplete the first.
    clickCheckbox(checkbox(0));
    clickCheckbox(checkbox(2));
    assert.deepEqual(completed(), [true, true, true]);
    assert.match(getTextContent(page()), /0 items left/);

    clickCheckbox(checkbox(0));
    assert.deepEqual(completed(), [false, true, true]);
    assert.deepEqual(rowClasses(), [undefined, "completed", "completed"]);
    assert.equal(checkbox(0).checked, false);
    assert.match(getTextContent(page()), /1 item left/);

    // Uncomplete everything: the completed class and Clear completed go away.
    clickCheckbox(checkbox(1));
    clickCheckbox(checkbox(2));
    assert.deepEqual(completed(), [false, false, false]);
    assert.deepEqual(rowClasses(), [undefined, undefined, undefined]);
    assert.equal(findByClass(page(), "clear-completed"), null);
  } finally {
    restore();
  }
});

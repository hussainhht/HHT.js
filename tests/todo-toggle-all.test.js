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

test("toggle-all completes everything, or reactivates everything", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    const toggleAllBox = () => findByClass(app.page(), "toggle-all");
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    const toggle = (index) => clickCheckbox(findByClass(rows()[index], "toggle"));
    const completed = () => todoState.get().todos.map((todo) => todo.completed);
    const rowClasses = () => rows().map((row) => row.attributes.get("class"));
    const pageText = () => getTextContent(app.page());

    // Unchecked with no todos (nothing to be "all completed").
    assert.equal(toggleAllBox().checked, false);

    for (const text of ["a", "b", "c"]) pressKey(input, "Enter", text);
    assert.equal(toggleAllBox().checked, false);

    // Some completed -> complete them all.
    toggle(1);
    assert.equal(toggleAllBox().checked, false);
    clickCheckbox(toggleAllBox());
    assert.deepEqual(completed(), [true, true, true]);
    assert.deepEqual(rowClasses(), ["completed", "completed", "completed"]);
    assert.equal(toggleAllBox().checked, true);
    assert.match(pageText(), /0 items left/);

    // All completed -> make them all active.
    clickCheckbox(toggleAllBox());
    assert.deepEqual(completed(), [false, false, false]);
    assert.deepEqual(rowClasses(), [undefined, undefined, undefined]);
    assert.equal(toggleAllBox().checked, false);
    assert.match(pageText(), /3 items left/);

    // The control follows single-todo changes too.
    toggle(0);
    toggle(1);
    assert.equal(toggleAllBox().checked, false);
    toggle(2);
    assert.equal(toggleAllBox().checked, true);
    toggle(2);
    assert.equal(toggleAllBox().checked, false);

    // It acts on every todo, not only the ones the filter shows: on Active
    // only "c" is visible, but "a" and "b" end up completed as well.
    app.navigate("#/active");
    assert.deepEqual(rows().map(getTextContent), ["c"]);
    clickCheckbox(toggleAllBox());
    assert.deepEqual(completed(), [true, true, true]);
    assert.deepEqual(rows().map(getTextContent), []);
    clickCheckbox(toggleAllBox());
    assert.deepEqual(completed(), [false, false, false]);
    assert.deepEqual(rows().map(getTextContent), ["a", "b", "c"]);
    app.navigate("#/");

    // Adding an active todo unchecks it; deleting the last active re-checks.
    clickCheckbox(toggleAllBox());
    assert.equal(toggleAllBox().checked, true);
    pressKey(input, "Enter", "d");
    assert.equal(toggleAllBox().checked, false);
    findByClass(rows()[3], "destroy").dispatchEvent(new Event("click"));
    assert.equal(toggleAllBox().checked, true);

    // Clearing everything leaves it unchecked again.
    findByClass(app.page(), "clear-completed").dispatchEvent(new Event("click"));
    assert.deepEqual(completed(), []);
    assert.equal(toggleAllBox().checked, false);
  } finally {
    app.restore();
  }
});

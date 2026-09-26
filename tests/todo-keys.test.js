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

// Todo rows are keyed by todo ID, so each row's DOM element stays with its
// todo. Without keys, deleting B would rewrite B's row to show C and remove
// the last row, taking C's original element (and its focus) with it.
test("todo rows keep their DOM elements when other todos go away", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    for (const text of ["A", "B", "C"]) pressKey(input, "Enter", text);

    const [rowA, rowB, rowC] = rows();
    const toggleC = findByClass(rowC, "toggle");
    toggleC.focus();

    // Deleting the middle todo removes B's row and leaves A and C alone.
    findByClass(rowB, "destroy").dispatchEvent(new Event("click"));
    assert.deepEqual(rows(), [rowA, rowC]);
    assert.equal(getTextContent(rowC), "C");
    assert.equal(document.activeElement, toggleC, "focus stays on C's checkbox");
    assert.equal(findByClass(rows()[1], "toggle"), toggleC);

    // `key` is framework metadata, not an attribute; `data-id` still is.
    const [cTodo] = todoState.get().todos.slice(-1);
    assert.equal(rowC.attributes.has("key"), false);
    assert.equal(rowC.attributes.get("data-id"), cTodo.id);

    // Filtering hides and shows rows without swapping elements between todos.
    pressKey(input, "Enter", "D");
    const rowD = rows()[2];
    clickCheckbox(findByClass(rowA, "toggle"));
    app.navigate("#/active");
    assert.deepEqual(rows(), [rowC, rowD]);

    app.navigate("#/");
    const [newRowA, ...rest] = rows();
    assert.deepEqual(rest, [rowC, rowD]);
    assert.equal(getTextContent(newRowA), "A");
    assert.equal(newRowA.attributes.get("class"), "completed");
  } finally {
    app.restore();
  }
});

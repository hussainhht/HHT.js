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

test("double-click edits a todo; Enter/blur save, Escape cancels", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    const label = (index) => rows()[index].querySelector("label");
    const editInput = (index) => findByClass(rows()[index], "edit");
    const texts = () => todoState.get().todos.map((todo) => todo.text);
    const rowClasses = () => rows().map((row) => row.attributes.get("class"));
    const editing = () => todoState.get().editingId;
    const doubleClick = (index) =>
      label(index).dispatchEvent(new Event("dblclick"));
    const blur = (index) => editInput(index).dispatchEvent(new Event("blur"));

    for (const text of ["a", "b", "c", "d"]) pressKey(input, "Enter", text);
    const ids = todoState.get().todos.map((todo) => todo.id);

    // Double-click shows the edit input for that row only, filled with the
    // current title and focused.
    doubleClick(1);
    assert.equal(editing(), ids[1]);
    assert.deepEqual(rowClasses(), [undefined, "editing", undefined, undefined]);
    assert.equal(editInput(1).value, "b");
    assert.equal(document.activeElement, editInput(1));

    // Enter saves (trimmed), exits edit mode and gives up focus; the blur
    // that causes does not save a second time.
    pressKey(editInput(1), "Enter", "  bee  ");
    assert.deepEqual(texts(), ["a", "bee", "c", "d"]);
    assert.equal(editing(), null);
    assert.deepEqual(rowClasses(), [undefined, undefined, undefined, undefined]);
    assert.equal(getTextContent(label(1)), "bee");
    assert.equal(document.activeElement, null);
    editInput(1).value = "stale";
    blur(1);
    assert.deepEqual(texts(), ["a", "bee", "c", "d"]);

    // Blur saves.
    doubleClick(0);
    editInput(0).value = "alpha";
    blur(0);
    assert.deepEqual(texts(), ["alpha", "bee", "c", "d"]);
    assert.equal(editing(), null);

    // Escape cancels: text unchanged, the edit input is reset for next time,
    // and the blur that follows doesn't save the discarded text.
    doubleClick(2);
    pressKey(editInput(2), "Escape", "discard me");
    assert.deepEqual(texts(), ["alpha", "bee", "c", "d"]);
    assert.equal(editing(), null);
    assert.equal(editInput(2).value, "c");
    assert.equal(document.activeElement, null);
    blur(2);
    assert.deepEqual(texts(), ["alpha", "bee", "c", "d"]);

    // Other keys just type; nothing is saved until Enter.
    doubleClick(3);
    pressKey(editInput(3), "x", "dx");
    assert.deepEqual(texts(), ["alpha", "bee", "c", "d"]);
    assert.equal(editing(), ids[3]);
    pressKey(editInput(3), "Enter", "delta");
    assert.deepEqual(texts(), ["alpha", "bee", "c", "delta"]);

    // A completed todo stays completed through an edit.
    clickCheckbox(findByClass(rows()[2], "toggle"));
    doubleClick(2);
    assert.equal(rowClasses()[2], "completed editing");
    pressKey(editInput(2), "Enter", "charlie");
    assert.equal(todoState.get().todos[2].completed, true);
    assert.equal(rowClasses()[2], "completed");

    // Editing to empty (or only spaces) deletes the todo.
    doubleClick(1);
    pressKey(editInput(1), "Enter", "   ");
    assert.deepEqual(texts(), ["alpha", "charlie", "delta"]);
    assert.equal(editing(), null);
    assert.match(getTextContent(app.page()), /2 items left/);
    doubleClick(2);
    editInput(2).value = "";
    blur(2);
    assert.deepEqual(texts(), ["alpha", "charlie"]);

    // Editing from a filtered view edits the right todo.
    app.navigate("#/completed");
    doubleClick(0);
    assert.equal(editInput(0).value, "charlie");
    pressKey(editInput(0), "Enter", "carol");
    assert.deepEqual(texts(), ["alpha", "carol"]);
    assert.deepEqual(rows().map(getTextContent), ["carol"]);
  } finally {
    app.restore();
  }
});

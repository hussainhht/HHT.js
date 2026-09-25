import assert from "node:assert/strict";
import { test } from "node:test";
import { todoState } from "../todo/state.js";
import {
  clickCheckbox,
  createStorage,
  findByClass,
  getTextContent,
  mountTodoApp,
  pressKey,
} from "./todo-dom.js";

const KEY = "todos-hhtjs";

test("todos are saved on change and restored after a refresh", async () => {
  const storage = createStorage({
    [KEY]: JSON.stringify([
      { id: "saved-1", text: "from last visit", completed: true },
      { id: "saved-2", text: "still to do", completed: false },
    ]),
  });
  const app = await mountTodoApp({ hash: "#/", storage });

  try {
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    const visible = () => rows().map(getTextContent);
    const saved = () => JSON.parse(storage.getItem(KEY));
    const savedTexts = () => saved().map((todo) => todo.text);

    // Load: the saved todos are shown on startup, with their state.
    assert.deepEqual(visible(), ["from last visit", "still to do"]);
    assert.equal(rows()[0].attributes.get("class"), "completed");
    assert.match(getTextContent(app.page()), /1 item left/);

    // Save: every kind of change is written straight away.
    const input = findByClass(app.page(), "new-todo");
    pressKey(input, "Enter", "new one");
    assert.deepEqual(savedTexts(), ["from last visit", "still to do", "new one"]);

    clickCheckbox(findByClass(rows()[1], "toggle"));
    assert.equal(saved()[1].completed, true);

    rows()[2].querySelector("label").dispatchEvent(new Event("dblclick"));
    pressKey(findByClass(rows()[2], "edit"), "Enter", "renamed");
    assert.deepEqual(savedTexts(), ["from last visit", "still to do", "renamed"]);

    findByClass(rows()[0], "destroy").dispatchEvent(new Event("click"));
    assert.deepEqual(savedTexts(), ["still to do", "renamed"]);

    // Only todos are saved, never edit mode.
    rows()[0].querySelector("label").dispatchEvent(new Event("dblclick"));
    assert.equal(todoState.get().editingId, saved()[0].id);
    assert.deepEqual(Object.keys(saved()[0]).sort(), ["completed", "id", "text"]);
    assert.equal(storage.getItem(KEY).includes("editingId"), false);

    // Refresh mid-edit on #/completed: todos come back from storage, the
    // filter comes back from the URL, and edit mode is off.
    const before = saved();
    await app.reload("#/completed");
    assert.deepEqual(todoState.get().todos, before);
    assert.equal(todoState.get().editingId, null);
    assert.deepEqual(visible(), ["still to do"]);
    assert.equal(rows()[0].attributes.get("class"), "completed");
    assert.match(getTextContent(app.page()), /1 item left/);
  } finally {
    app.restore();
  }
});

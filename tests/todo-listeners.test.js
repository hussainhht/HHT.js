import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clickCheckbox,
  findByClass,
  getTextContent,
  mountTodoApp,
  pressKey,
} from "./todo-dom.js";

// TodoMVC rows use inline arrow handlers, so every render passes new
// functions. Re-rendering must not remove and re-add the rows' listeners.
// (Each test file runs in its own process, so patching EventTarget is local.)
const counts = { adds: 0, removes: 0 };
const { addEventListener, removeEventListener } = EventTarget.prototype;
EventTarget.prototype.addEventListener = function (...args) {
  counts.adds += 1;
  return addEventListener.apply(this, args);
};
EventTarget.prototype.removeEventListener = function (...args) {
  counts.removes += 1;
  return removeEventListener.apply(this, args);
};

function measure(action) {
  counts.adds = 0;
  counts.removes = 0;
  action();
  return [counts.adds, counts.removes];
}

test("TodoMVC re-renders update handlers without listener churn", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    const rows = () => findByClass(app.page(), "todo-list").childNodes;
    for (const text of ["a", "b", "c"]) pressKey(input, "Enter", text);

    // A new row adds its own 5 listeners (toggle, label, destroy, edit
    // keydown + blur); the existing rows add and remove nothing.
    assert.deepEqual(measure(() => pressKey(input, "Enter", "d")), [5, 0]);

    // Entering edit mode re-renders all 4 rows with new inline handlers.
    const label = rows()[1].querySelector("label");
    assert.deepEqual(measure(() => label.dispatchEvent(new Event("dblclick"))), [0, 0]);
    pressKey(findByClass(rows()[1], "edit"), "Escape", "b");

    // Toggling a todo only adds the "Clear completed" button's listener.
    assert.deepEqual(measure(() => clickCheckbox(findByClass(rows()[0], "toggle"))), [1, 0]);

    // The re-rendered handlers are the current ones: clicks act on the right todo.
    findByClass(rows()[2], "destroy").dispatchEvent(new Event("click"));
    assert.deepEqual(rows().map(getTextContent), ["a", "b", "d"]);
  } finally {
    app.restore();
  }
});

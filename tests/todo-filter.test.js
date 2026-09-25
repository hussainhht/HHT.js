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

function filterLinks(page) {
  return findByClass(page, "filters").childNodes.map((li) => li.childNodes[0]);
}

function selectedFilter(page) {
  const selected = filterLinks(page).filter(
    (link) => link.attributes.get("class") === "selected",
  );
  assert.equal(selected.length, 1, "exactly one filter is selected");
  return getTextContent(selected[0]);
}

function visibleTodos(page) {
  return findByClass(page, "todo-list").childNodes.map(getTextContent);
}

test("filters show the right todos per route without removing any", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    assert.deepEqual(
      filterLinks(app.page()).map((link) => link.attributes.get("href")),
      ["#/", "#/active", "#/completed"],
    );

    const input = findByClass(app.page(), "new-todo");
    for (const text of ["one", "two", "three"]) pressKey(input, "Enter", text);
    const secondRow = findByClass(app.page(), "todo-list").childNodes[1];
    clickCheckbox(findByClass(secondRow, "toggle"));
    const allTodos = todoState.get().todos;

    const expected = {
      "#/": ["All", ["one", "two", "three"]],
      "#/active": ["Active", ["one", "three"]],
      "#/completed": ["Completed", ["two"]],
    };
    // Every filter to every other filter, and back.
    const visits = [
      ...["#/", "#/active", "#/completed"],
      ...["#/", "#/completed", "#/active", "#/"],
    ];
    for (const hash of visits) {
      app.navigate(hash);
      const [label, texts] = expected[hash];
      assert.equal(selectedFilter(app.page()), label, hash);
      assert.deepEqual(visibleTodos(app.page()), texts, hash);
      assert.equal(todoState.get().todos, allTodos, "state is untouched");
      assert.match(getTextContent(app.page()), /2 items left/);
    }

    // Completing a todo in the Active view hides it there, but keeps it.
    app.navigate("#/active");
    const firstRow = findByClass(app.page(), "todo-list").childNodes[0];
    clickCheckbox(findByClass(firstRow, "toggle"));
    assert.deepEqual(visibleTodos(app.page()), ["three"]);
    assert.equal(todoState.get().todos.length, 3);
    app.navigate("#/completed");
    assert.deepEqual(visibleTodos(app.page()), ["one", "two"]);

    // Refreshing on each route keeps that route's filter and selection.
    for (const [hash, label, texts] of [
      ["#/", "All", ["one", "two", "three"]],
      ["#/active", "Active", ["three"]],
      ["#/completed", "Completed", ["one", "two"]],
    ]) {
      await app.reload(hash);
      assert.equal(window.location.hash, hash);
      assert.equal(selectedFilter(app.page()), label, hash);
      assert.deepEqual(visibleTodos(app.page()), texts, hash);
    }
  } finally {
    app.restore();
  }
});

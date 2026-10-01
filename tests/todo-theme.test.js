import assert from "node:assert/strict";
import { test } from "node:test";
import { createStorage, findByClass, mountTodoApp } from "./todo-dom.js";

const KEY = "theme-hhtjs";

const toggleButton = (app) => findByClass(app.page(), "theme-toggle");
const isPressed = (app) => toggleButton(app).attributes.get("aria-pressed");
const click = (app) => toggleButton(app).dispatchEvent(new Event("click"));

// Keep this test first: it checks that nothing is saved, which only holds for
// the first mount in a process. Later mounts share `themeState` with the
// earlier copies of the app, and those write to whatever storage is current.
test("with nothing saved, the theme follows the system setting", async () => {
  const storage = createStorage();
  const light = await mountTodoApp({ storage, prefersDark: false });
  try {
    assert.equal(light.theme(), "light");
    assert.equal(isPressed(light), "false");
    // Following the system is not a choice, so nothing is saved.
    assert.equal(storage.getItem(KEY), null);
  } finally {
    light.restore();
  }

  const dark = await mountTodoApp({ prefersDark: true });
  try {
    assert.equal(dark.theme(), "dark");
    assert.equal(isPressed(dark), "true");
  } finally {
    dark.restore();
  }
});

test("a saved choice wins over the system setting", async () => {
  const storage = createStorage({ [KEY]: "light" });
  const app = await mountTodoApp({ storage, prefersDark: true });

  try {
    assert.equal(app.theme(), "light");
    assert.equal(isPressed(app), "false");
  } finally {
    app.restore();
  }
});

test("an unknown saved value is ignored", async () => {
  const storage = createStorage({ [KEY]: "sepia" });
  const app = await mountTodoApp({ storage, prefersDark: true });

  try {
    assert.equal(app.theme(), "dark");
  } finally {
    app.restore();
  }
});

test("the toggle switches the theme, saves it, and survives a refresh", async () => {
  const storage = createStorage();
  const app = await mountTodoApp({ storage, prefersDark: false });

  try {
    click(app);
    assert.equal(app.theme(), "dark");
    assert.equal(isPressed(app), "true");
    assert.equal(storage.getItem(KEY), "dark");

    click(app);
    assert.equal(app.theme(), "light");
    assert.equal(isPressed(app), "false");
    assert.equal(storage.getItem(KEY), "light");

    click(app);
    await app.reload();
    assert.equal(app.theme(), "dark");
    assert.equal(isPressed(app), "true");
  } finally {
    app.restore();
  }
});

test("switching the theme leaves the todos alone", async () => {
  const app = await mountTodoApp({ hash: "#/" });

  try {
    const input = findByClass(app.page(), "new-todo");
    input.value = "keep me";
    const keydown = new Event("keydown");
    keydown.key = "Enter";
    input.dispatchEvent(keydown);

    const row = () => findByClass(app.page(), "todo-list").childNodes[0];
    const before = row();
    click(app);

    assert.equal(findByClass(app.page(), "todo-list").childNodes.length, 1);
    assert.equal(row(), before, "the list item is patched, not replaced");
  } finally {
    app.restore();
  }
});

test("blocked storage does not stop the theme from switching", async () => {
  const blocked = {
    getItem() {
      throw new Error("storage is blocked");
    },
    setItem() {
      throw new Error("storage is blocked");
    },
  };
  const app = await mountTodoApp({ storage: blocked, prefersDark: true });

  try {
    assert.equal(app.theme(), "dark");
    click(app);
    assert.equal(app.theme(), "light");
  } finally {
    app.restore();
  }
});

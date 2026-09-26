import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, mount, on } from "../framework/index.js";

const originals = { window: globalThis.window, document: globalThis.document };

afterEach(() => {
  globalThis.window = originals.window;
  globalThis.document = originals.document;
});

// Node's EventTarget behaves like the browser's for these tests (including
// the `once` and `passive` options), so it stands in for window and document.
function usePage() {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
}

function keyEvent(type, key) {
  const event = new Event(type, { cancelable: true });
  event.key = key;
  return event;
}

// Records the arguments of add/removeEventListener calls.
function recordingTarget() {
  const calls = [];
  return {
    calls,
    addEventListener: (...args) => calls.push(["add", ...args]),
    removeEventListener: (...args) => calls.push(["remove", ...args]),
  };
}

test("on(window, ...) listens and passes the native event", () => {
  usePage();
  const received = [];
  on(window, "keydown", function (event) {
    received.push({ event, key: event.key, self: this });
  });

  const event = keyEvent("keydown", "ArrowUp");
  window.dispatchEvent(event);

  assert.equal(received.length, 1);
  assert.equal(received[0].event, event, "the same native event object");
  assert.equal(received[0].key, "ArrowUp");
  assert.equal(received[0].self, window, "`this` is the target, as natively");
});

test("on(document, ...) listens, e.g. for visibilitychange", () => {
  usePage();
  let changes = 0;
  on(document, "visibilitychange", () => {
    changes += 1;
  });

  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("visibilitychange"));

  assert.equal(changes, 1, "only the document listener target");
});

test("on() works with window resize and keyup too", () => {
  usePage();
  const seen = [];
  on(window, "resize", (event) => seen.push(event.type));
  on(window, "keyup", (event) => seen.push(`${event.type}:${event.key}`));

  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(keyEvent("keyup", "a"));

  assert.deepEqual(seen, ["resize", "keyup:a"]);
});

test("the returned function stops listening and is safe to call again", () => {
  usePage();
  let calls = 0;
  const stop = on(window, "keydown", () => {
    calls += 1;
  });

  window.dispatchEvent(keyEvent("keydown", "a"));
  stop();
  window.dispatchEvent(keyEvent("keydown", "b"));
  assert.doesNotThrow(() => {
    stop();
    stop();
  });
  window.dispatchEvent(keyEvent("keydown", "c"));

  assert.equal(calls, 1);
});

test("different listeners are independent", () => {
  usePage();
  const seen = [];
  const pressed = new Set();
  const stopDown = on(window, "keydown", (event) => pressed.add(event.key));
  on(window, "keyup", (event) => pressed.delete(event.key));
  on(window, "keydown", (event) => seen.push(event.key));

  window.dispatchEvent(keyEvent("keydown", "ArrowLeft"));
  assert.deepEqual([...pressed], ["ArrowLeft"]);

  stopDown();
  window.dispatchEvent(keyEvent("keydown", "Space"));
  window.dispatchEvent(keyEvent("keyup", "ArrowLeft"));

  assert.deepEqual([...pressed], [], "keyup listener still works");
  assert.deepEqual(seen, ["ArrowLeft", "Space"], "other keydown listener still works");
});

test("the same handler registered twice gives two independent listeners", () => {
  usePage();
  let calls = 0;
  const handler = () => {
    calls += 1;
  };
  const stopA = on(window, "keydown", handler);
  const stopB = on(window, "keydown", handler);

  window.dispatchEvent(keyEvent("keydown", "a"));
  assert.equal(calls, 2);

  stopA();
  window.dispatchEvent(keyEvent("keydown", "b"));
  assert.equal(calls, 3, "B is still registered");

  stopB();
  window.dispatchEvent(keyEvent("keydown", "c"));
  assert.equal(calls, 3);
});

test("options are passed to addEventListener and removeEventListener unchanged", () => {
  const options = { capture: true, once: false, passive: true };
  const objectTarget = recordingTarget();
  const stopObject = on(objectTarget, "keydown", () => {}, options);
  stopObject();

  const [[add, addType, listener, addOptions], [remove, removeType, removed, removeOptions]] =
    objectTarget.calls;
  assert.deepEqual([add, addType, remove, removeType], ["add", "keydown", "remove", "keydown"]);
  assert.equal(removed, listener, "removes exactly what was added");
  assert.equal(addOptions, options);
  assert.equal(removeOptions, options);

  const booleanTarget = recordingTarget();
  on(booleanTarget, "click", () => {}, true)();
  assert.equal(booleanTarget.calls[0][3], true);
  assert.equal(booleanTarget.calls[1][3], true);

  const noOptions = recordingTarget();
  on(noOptions, "click", () => {})();
  assert.equal(noOptions.calls[0][3], undefined);
});

test("once: true runs the handler a single time", () => {
  usePage();
  let calls = 0;
  const stop = on(window, "resize", () => {
    calls += 1;
  }, { once: true });

  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("resize"));
  assert.equal(calls, 1);
  assert.doesNotThrow(stop, "stopping after it already ran is fine");
});

test("passive: true behaves natively (preventDefault is ignored)", () => {
  usePage();
  const blocked = keyEvent("keydown", "ArrowUp");
  const passive = keyEvent("keydown", "ArrowUp");

  const stopBlocking = on(window, "keydown", (event) => event.preventDefault());
  window.dispatchEvent(blocked);
  stopBlocking();
  on(window, "keydown", (event) => event.preventDefault(), { passive: true });
  window.dispatchEvent(passive);

  assert.equal(blocked.defaultPrevented, true);
  assert.equal(passive.defaultPrevented, false);
});

test("an invalid target throws a clear error", () => {
  const message = "HHT.js: Event target must support addEventListener() and removeEventListener().";
  for (const target of [null, undefined, {}, 123, "window", { addEventListener() {} }]) {
    assert.throws(() => on(target, "keydown", () => {}), { message }, String(target));
  }
});

test("an invalid event name throws a clear error", () => {
  usePage();
  for (const name of ["", null, undefined, 123, {}]) {
    assert.throws(() => on(window, name, () => {}), {
      message: "HHT.js: Event name must be a non-empty string.",
    });
  }
});

test("an invalid handler throws a clear error and registers nothing", () => {
  const target = recordingTarget();
  for (const handler of [null, undefined, false, {}, "handler"]) {
    assert.throws(() => on(target, "keydown", handler), {
      message: "HHT.js: Event handler must be a function.",
    });
  }
  assert.deepEqual(target.calls, []);
});

test("elements work as targets, next to their declarative on… handlers", () => {
  const makeElement = (tagName) => Object.assign(new EventTarget(), {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: [],
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    },
  });
  globalThis.document = { createElement: makeElement, createTextNode: (text) => ({ nodeType: 3, text }) };
  const root = makeElement("div");
  const clicks = [];

  mount(root, createElement("button", { onClick: () => clicks.push("declared") }, ["Go"]));
  const button = root.childNodes[0];
  const stop = on(button, "click", () => clicks.push("on()"));

  button.dispatchEvent(new Event("click"));
  stop();
  button.dispatchEvent(new Event("click"));

  assert.deepEqual(clicks, ["declared", "on()", "declared"]);
});

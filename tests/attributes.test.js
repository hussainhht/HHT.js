import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, render } from "../framework/index.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

// Tags whose elements have these boolean DOM properties in a browser.
const propertiesByTag = {
  INPUT: ["checked", "disabled"],
  OPTION: ["selected", "disabled"],
  VIDEO: ["muted"],
  BUTTON: ["disabled"],
};

// Fake element that records attribute writes, property writes and listener
// changes in `log`, so tests can check that nothing extra is written.
function makeElement(tagName) {
  const element = new EventTarget();
  const add = element.addEventListener.bind(element);
  const remove = element.removeEventListener.bind(element);

  Object.assign(element, {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: [],
    attributes: new Map(),
    log: [],
    setAttribute(name, value) {
      this.log.push(["set", name, String(value)]);
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return this.attributes.has(name);
    },
    removeAttribute(name) {
      this.log.push(["remove", name]);
      this.attributes.delete(name);
    },
    addEventListener(type, handler) {
      this.log.push(["listen", type]);
      add(type, handler);
    },
    removeEventListener(type, handler) {
      this.log.push(["unlisten", type]);
      remove(type, handler);
    },
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    },
    replaceChildren(...nodes) {
      this.childNodes = nodes;
    },
  });
  Object.defineProperty(element, "firstChild", {
    get() {
      return this.childNodes[0] ?? null;
    },
  });

  for (const property of propertiesByTag[element.tagName] ?? []) {
    let current = false;
    Object.defineProperty(element, property, {
      get: () => current,
      set(value) {
        element.log.push(["property", property, value]);
        current = value;
      },
    });
  }
  return element;
}

function useRoot() {
  globalThis.document = {
    createElement: makeElement,
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  };
  return makeElement("div");
}

function renderOne(root, tag, attrs) {
  render(root, createElement(tag, attrs));
  return root.firstChild;
}

// --- Boolean attributes ------------------------------------------------------

test("true adds a boolean attribute and false leaves it out", () => {
  for (const name of ["hidden", "readonly", "required", "multiple", "autofocus", "open"]) {
    const on = renderOne(useRoot(), "input", { [name]: true });
    assert.equal(on.getAttribute(name), "", `${name}: true`);

    const off = renderOne(useRoot(), "input", { [name]: false });
    assert.equal(off.hasAttribute(name), false, `${name}: false`);
    assert.deepEqual(off.log.filter(([kind, attribute]) => kind === "set" && attribute === name), [],
      `${name} is never written as "false"`);
  }
});

test("toggling boolean attributes updates the same element", () => {
  for (const name of ["hidden", "readonly", "required", "multiple", "autofocus", "open"]) {
    const root = useRoot();
    const element = renderOne(root, "details", { [name]: true });

    renderOne(root, "details", { [name]: false });
    assert.equal(element.hasAttribute(name), false, `${name}: true → false`);

    renderOne(root, "details", { [name]: true });
    assert.equal(element.getAttribute(name), "", `${name}: false → true`);
    assert.equal(root.firstChild, element);
  }
});

test("null and undefined turn a boolean attribute off too", () => {
  for (const off of [null, undefined]) {
    const root = useRoot();
    const element = renderOne(root, "p", { hidden: true });
    renderOne(root, "p", { hidden: off });
    assert.equal(element.hasAttribute("hidden"), false, String(off));

    assert.equal(renderOne(useRoot(), "p", { hidden: off }).hasAttribute("hidden"), false);
  }

  const root = useRoot();
  const element = renderOne(root, "p", { hidden: true });
  renderOne(root, "p", {});
  assert.equal(element.hasAttribute("hidden"), false, "attribute left out");
});

test("unchanged boolean attributes are not written again", () => {
  const root = useRoot();
  const element = renderOne(root, "input", { required: true, readonly: false });
  element.log.length = 0;

  renderOne(root, "input", { required: true, readonly: false });

  assert.deepEqual(element.log, []);
});

test("the expected example: required on, then readonly and disabled on", () => {
  const root = useRoot();
  const input = renderOne(root, "input", { required: true, readonly: false, disabled: false });
  assert.deepEqual([...input.attributes.keys()], ["required"]);
  assert.equal(input.disabled, false);

  renderOne(root, "input", { required: false, readonly: true, disabled: true });
  assert.equal(root.firstChild, input);
  assert.equal(input.hasAttribute("required"), false);
  assert.equal(input.getAttribute("readonly"), "");
  assert.equal(input.getAttribute("disabled"), "");
  assert.equal(input.disabled, true);
});

test("string values of boolean attributes are written as given", () => {
  const input = renderOne(useRoot(), "input", { autofocus: "" });
  assert.equal(input.getAttribute("autofocus"), "", "TodoMVC's autofocus: \"\"");

  const section = renderOne(useRoot(), "section", { hidden: "until-found" });
  assert.equal(section.getAttribute("hidden"), "until-found");
});

test("checked, disabled and selected keep their DOM properties in sync", () => {
  const root = useRoot();
  const box = renderOne(root, "input", { type: "checkbox", checked: true, disabled: false });
  assert.equal(box.checked, true);
  assert.equal(box.getAttribute("checked"), "");
  assert.equal(box.disabled, false);
  assert.equal(box.hasAttribute("disabled"), false);

  box.checked = false; // the user unticks it
  renderOne(root, "input", { type: "checkbox", checked: true, disabled: true });
  assert.equal(box.checked, true, "re-synced to the vnode value");
  assert.equal(box.disabled, true);

  renderOne(root, "input", { type: "checkbox", checked: null, disabled: undefined });
  assert.equal(box.checked, false);
  assert.equal(box.disabled, false);
  assert.equal(box.hasAttribute("checked"), false);

  const option = renderOne(useRoot(), "option", { selected: true });
  assert.equal(option.selected, true);
  assert.equal(option.getAttribute("selected"), "");
});

test("readonly is written as the HTML attribute, with no readOnly name mapping", () => {
  const input = renderOne(useRoot(), "input", { readonly: true });
  assert.equal(input.getAttribute("readonly"), "");
  assert.equal(input.log.some(([kind]) => kind === "property"), false);
});

test("muted also sets the property, since the attribute is only the initial value", () => {
  const root = useRoot();
  const video = renderOne(root, "video", { muted: true });
  assert.equal(video.muted, true);

  renderOne(root, "video", { muted: false });
  assert.equal(video.muted, false);
  assert.equal(video.hasAttribute("muted"), false);
});

test("false on normal attributes is still written as the text \"false\"", () => {
  const div = renderOne(useRoot(), "div", { "data-active": false, "aria-hidden": false, title: false });
  assert.equal(div.getAttribute("data-active"), "false");
  assert.equal(div.getAttribute("aria-hidden"), "false");
  assert.equal(div.getAttribute("title"), "false");
});

// --- Declarative event handlers ---------------------------------------------

test("function, null and undefined are valid handler values", () => {
  const root = useRoot();
  let clicks = 0;
  const button = renderOne(root, "button", { onClick: () => { clicks += 1; } });
  button.dispatchEvent(new Event("click"));
  assert.equal(clicks, 1);

  for (const none of [null, undefined]) {
    const idle = renderOne(useRoot(), "button", { onClick: none });
    assert.deepEqual(idle.log.filter(([kind]) => kind === "listen"), [], String(none));
  }
});

test("invalid handler values throw a clear error naming the attribute", () => {
  for (const value of [false, true, "save", {}, 42]) {
    assert.throws(() => createElement("button", { onClick: value }), {
      message: 'HHT.js: Event handler "onClick" must be a function, null, or undefined.',
    }, String(value));
  }
  assert.throws(() => createElement("input", { onKeyDown: "x" }), {
    message: 'HHT.js: Event handler "onKeyDown" must be a function, null, or undefined.',
  });
});

test("an invalid handler fails before any element or listener is created", () => {
  const root = useRoot();
  let created = 0;
  document.createElement = (tag) => {
    created += 1;
    return makeElement(tag);
  };

  assert.throws(() => render(root, createElement("button", {
    onFocus: () => {},
    onClick: false,
  })));
  assert.equal(created, 0);
  assert.deepEqual(root.childNodes, []);
});

test("handler → null or undefined removes the listener without adding one", () => {
  for (const none of [null, undefined]) {
    const root = useRoot();
    let clicks = 0;
    const button = renderOne(root, "button", { onClick: () => { clicks += 1; } });
    button.log.length = 0;

    renderOne(root, "button", { onClick: none });
    button.dispatchEvent(new Event("click"));

    assert.equal(clicks, 0);
    assert.deepEqual(button.log, [["unlisten", "click"]], String(none));
  }
});

test("null → handler adds it", () => {
  const root = useRoot();
  let clicks = 0;
  const button = renderOne(root, "button", { onClick: null });
  renderOne(root, "button", { onClick: () => { clicks += 1; } });
  button.dispatchEvent(new Event("click"));
  assert.equal(clicks, 1);
});

test("handler A → B replaces it, and the same handler is not re-added", () => {
  const root = useRoot();
  const calls = [];
  const handlerA = () => calls.push("A");
  const handlerB = () => calls.push("B");

  const button = renderOne(root, "button", { onClick: handlerA });
  button.log.length = 0;
  renderOne(root, "button", { onClick: handlerB });
  assert.deepEqual(button.log, [], "the native listener stays; only the handler changes");

  button.log.length = 0;
  renderOne(root, "button", { onClick: handlerB });
  assert.deepEqual(button.log, [], "same function: no remove/add");

  button.dispatchEvent(new Event("click"));
  assert.deepEqual(calls, ["B"]);
});

test("the conditional handler pattern works", () => {
  const root = useRoot();
  const calls = [];
  const handleClick = () => calls.push("click");
  const view = (enabled) => createElement("button", { onClick: enabled ? handleClick : null });

  render(root, view(false));
  const button = root.firstChild;
  button.dispatchEvent(new Event("click"));
  render(root, view(true));
  button.dispatchEvent(new Event("click"));
  render(root, view(false));
  button.dispatchEvent(new Event("click"));

  assert.deepEqual(calls, ["click"]);
});

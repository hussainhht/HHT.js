import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, render } from "../framework/index.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

const camelCase = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

// Fake element whose `style` records every property write in `styleWrites`.
// Like a browser, setting the `style` attribute replaces all inline styles
// and removing it clears them.
function makeElement(tagName) {
  const element = new EventTarget();
  const styles = new Map();
  const write = (name, value) => {
    element.styleWrites.push([name, value]);
    if (value === "") styles.delete(name);
    else styles.set(name, String(value));
  };

  Object.assign(element, {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: [],
    attributes: new Map(),
    styleWrites: [],
    styles,
    style: new Proxy({}, {
      get(_, name) {
        if (name === "setProperty") return (property, value) => write(property, value);
        if (name === "removeProperty") return (property) => write(property, "");
        return styles.get(name) ?? "";
      },
      set(_, name, value) {
        write(name, value);
        return true;
      },
    }),
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name !== "style") return;
      styles.clear();
      for (const declaration of String(value).split(";")) {
        const [property, ...rest] = declaration.split(":");
        if (property.trim()) styles.set(camelCase(property.trim()), rest.join(":").trim());
      }
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === "style") styles.clear();
    },
    appendChild(child) {
      this.childNodes.push(child);
      return child;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
    replaceChild(next, previous) {
      this.childNodes[this.childNodes.indexOf(previous)] = next;
      return previous;
    },
    replaceChildren(...nodes) {
      this.childNodes = nodes;
    },
    insertBefore(child, reference) {
      const from = this.childNodes.indexOf(child);
      if (from !== -1) this.childNodes.splice(from, 1);
      const to = reference == null ? this.childNodes.length : this.childNodes.indexOf(reference);
      this.childNodes.splice(to, 0, child);
      return child;
    },
  });
  Object.defineProperty(element, "firstChild", {
    get() {
      return this.childNodes[0] ?? null;
    },
  });
  return element;
}

function useRoot() {
  globalThis.document = {
    createElement: makeElement,
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  };
  return makeElement("div");
}

// Renders `attrs` on a div in `root` and returns that div.
function renderDiv(root, attrs) {
  render(root, createElement("div", attrs));
  return root.firstChild;
}

const current = (element) => Object.fromEntries(element.styles);

test("string styles still work", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: "color: red; display: block" });

  assert.equal(div.getAttribute("style"), "color: red; display: block");
  assert.deepEqual(current(div), { color: "red", display: "block" });

  renderDiv(root, { style: "color: blue" });
  assert.deepEqual(current(div), { color: "blue" });
});

test("a style object is applied property by property on first render", () => {
  const root = useRoot();
  const div = renderDiv(root, {
    style: {
      color: "red",
      backgroundColor: "black",
      transform: "translate3d(10px, 20px, 0)",
    },
  });

  assert.deepEqual(current(div), {
    color: "red",
    backgroundColor: "black",
    transform: "translate3d(10px, 20px, 0)",
  });
  assert.equal(div.getAttribute("style"), null, "not written as one attribute");
  assert.notEqual(div.getAttribute("style"), "[object Object]");
});

test("object to object writes only what changed, added or removed", () => {
  const root = useRoot();
  const div = renderDiv(root, {
    style: { color: "red", transform: "translateX(10px)", width: "10px" },
  });
  div.styleWrites.length = 0;

  const same = renderDiv(root, {
    style: { color: "red", transform: "translateX(20px)", opacity: "0.5" },
  });

  assert.equal(same, div, "same element");
  assert.deepEqual(div.styleWrites, [
    ["width", ""],
    ["transform", "translateX(20px)"],
    ["opacity", "0.5"],
  ], "color is not rewritten");
  assert.deepEqual(current(div), { color: "red", transform: "translateX(20px)", opacity: "0.5" });
});

test("an unchanged style object causes no style writes", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { color: "red", transform: "translateX(10px)" } });
  div.styleWrites.length = 0;

  renderDiv(root, { style: { color: "red", transform: "translateX(10px)" } });

  assert.deepEqual(div.styleWrites, []);
});

test("null or undefined properties remove that property", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { color: "red", transform: "scale(2)", opacity: "1" } });

  renderDiv(root, { style: { color: null, transform: undefined, opacity: "1" } });
  assert.deepEqual(current(div), { opacity: "1" });

  renderDiv(root, { style: { color: "green", transform: undefined, opacity: "1" } });
  assert.deepEqual(current(div), { opacity: "1", color: "green" });

  const initial = renderDiv(useRoot(), { style: { color: null, width: "5px" } });
  assert.deepEqual(current(initial), { width: "5px" });
});

test("style: {} clears the styles the previous object set", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { color: "red", transform: "scale(2)" } });

  renderDiv(root, { style: {} });

  assert.deepEqual(current(div), {});
});

test("style: null / undefined / missing removes the previous styles", () => {
  for (const next of [{ style: null }, { style: undefined }, {}]) {
    const root = useRoot();
    const div = renderDiv(root, { style: { color: "red", transform: "translateX(20px)" } });
    renderDiv(root, next);
    assert.deepEqual(current(div), {}, JSON.stringify(next));

    const fromString = renderDiv(useRoot(), { style: "color: red" });
    assert.equal(fromString.getAttribute("style"), "color: red");
  }

  const root = useRoot();
  const div = renderDiv(root, { style: "color: red; margin: 0" });
  renderDiv(root, { style: null });
  assert.deepEqual(current(div), {});
  assert.equal(div.getAttribute("style"), null);
});

test("no style to an object, and back", () => {
  const root = useRoot();
  const div = renderDiv(root, { class: "box" });
  renderDiv(root, { class: "box", style: { color: "red" } });
  assert.deepEqual(current(div), { color: "red" });

  renderDiv(root, { class: "box" });
  assert.deepEqual(current(div), {});
  assert.equal(root.firstChild, div);
});

test("string to object leaves none of the string's properties behind", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: "color: red; background: black" });

  renderDiv(root, { style: { color: "blue", transform: "translateX(10px)" } });

  assert.deepEqual(current(div), { color: "blue", transform: "translateX(10px)" });
  assert.equal(div.getAttribute("style"), null);
});

test("object to string leaves none of the object's properties behind", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { color: "red", transform: "translateX(10px)" } });

  renderDiv(root, { style: "color: blue" });

  assert.deepEqual(current(div), { color: "blue" });
});

test("custom properties use setProperty / removeProperty", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { "--player-x": "20px", color: "red" } });
  assert.deepEqual(current(div), { "--player-x": "20px", color: "red" });

  renderDiv(root, { style: { "--player-x": 40, color: "red" } });
  assert.equal(div.styles.get("--player-x"), "40");

  renderDiv(root, { style: { color: "red" } });
  assert.deepEqual(current(div), { color: "red" });
});

test("numbers are written as given, without adding units", () => {
  const root = useRoot();
  const div = renderDiv(root, { style: { width: 100, opacity: 0.5 } });

  assert.deepEqual(div.styleWrites, [["width", 100], ["opacity", 0.5]]);
});

test("the user's style object is not modified", () => {
  const root = useRoot();
  const first = Object.freeze({ color: "red", transform: "scale(1)" });
  const second = Object.freeze({ color: null });

  assert.doesNotThrow(() => {
    renderDiv(root, { style: first });
    renderDiv(root, { style: second });
  });
  assert.deepEqual(first, { color: "red", transform: "scale(1)" });
  assert.deepEqual(second, { color: null });
});

test("style changes keep the element and do not call an unchanged ref again", () => {
  const root = useRoot();
  const calls = [];
  const ref = (element) => calls.push(element && {
    element,
    color: element.style.color,
  });

  const div = renderDiv(root, { ref, style: { color: "red" } });
  renderDiv(root, { ref, style: { color: "blue" } });
  renderDiv(root, { ref, style: "color: green" });

  assert.equal(root.firstChild, div);
  assert.equal(calls.length, 1, "ref called only on creation");
  assert.equal(calls[0].element, div);
  assert.equal(calls[0].color, "red", "the ref saw the initial style");
  assert.deepEqual(current(div), { color: "green" });
});

test("keyed elements keep their element and styles through reorders and style updates", () => {
  const root = useRoot();
  const players = (list) => createElement("div", { class: "board" }, list.map(({ id, x }) =>
    createElement("div", {
      key: id,
      class: "player",
      style: { position: "absolute", transform: `translateX(${x}px)` },
    }),
  ));

  render(root, players([{ id: "p1", x: 0 }, { id: "p2", x: 32 }]));
  const [p1, p2] = root.firstChild.childNodes;
  p1.styleWrites.length = 0;

  render(root, players([{ id: "p2", x: 32 }, { id: "p1", x: 64 }]));

  assert.deepEqual(root.firstChild.childNodes, [p2, p1]);
  assert.equal(p1.styles.get("transform"), "translateX(64px)");
  assert.equal(p2.styles.get("transform"), "translateX(32px)");
  assert.deepEqual(p1.styleWrites, [["transform", "translateX(64px)"]]);
  assert.deepEqual(p2.styleWrites, [["position", "absolute"], ["transform", "translateX(32px)"]],
    "p2 only has its first-render writes");
});

test("styles written through a ref on properties the vnode does not set are kept", () => {
  const root = useRoot();
  let element;
  const ref = (el) => {
    element = el;
  };

  renderDiv(root, { ref, class: "player", style: { position: "absolute" } });
  element.style.transform = "translate3d(5px, 0, 0)"; // game loop owns transform
  renderDiv(root, { ref, class: "player", style: { position: "relative" } });
  renderDiv(root, { ref, class: "player active", style: { position: "relative" } });

  assert.equal(element.styles.get("transform"), "translate3d(5px, 0, 0)");
  assert.equal(element.styles.get("position"), "relative");
});

test("invalid style values throw a clear error", () => {
  for (const style of [42, true, [], ["color: red"], () => {}]) {
    assert.throws(() => createElement("div", { style }), {
      message: "HHT.js: style must be a string, object, null, or undefined.",
    });
  }
  for (const style of ["", "color: red", {}, null, undefined]) {
    assert.doesNotThrow(() => createElement("div", { style }));
  }
});

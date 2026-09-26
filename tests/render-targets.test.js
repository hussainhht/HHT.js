import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, mount, render, unmount } from "../framework/index.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

// Supports the selector forms these tests use: "#id" and a tag name.
function matches(node, selector) {
  if (node.nodeType !== 1) return false;
  if (selector.startsWith("#")) return node.attributes.get("id") === selector.slice(1);
  return node.tagName === selector.toUpperCase();
}

function find(node, selector) {
  for (const child of node.childNodes) {
    if (matches(child, selector)) return child;
    const found = child.nodeType === 1 ? find(child, selector) : null;
    if (found) return found;
  }
  return null;
}

// Fake page: `document.body` holds the given `<div id="...">` roots.
// Invalid selectors throw a SyntaxError, like a browser.
function usePage(...rootIds) {
  const document = {
    created: 0,
    createElement(tagName) {
      document.created += 1;
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.value = "";
      element.childNodes = [];
      element.attributes = new Map();
      Object.defineProperty(element, "firstChild", {
        get() {
          return this.childNodes[0] ?? null;
        },
      });
      element.setAttribute = function (name, value) {
        this.attributes.set(name, String(value));
      };
      element.getAttribute = function (name) {
        return this.attributes.get(name) ?? null;
      };
      element.removeAttribute = function (name) {
        this.attributes.delete(name);
      };
      element.appendChild = function (child) {
        this.childNodes.push(child);
        return child;
      };
      element.removeChild = function (child) {
        this.childNodes.splice(this.childNodes.indexOf(child), 1);
        return child;
      };
      element.replaceChild = function (next, previous) {
        this.childNodes[this.childNodes.indexOf(previous)] = next;
        return previous;
      };
      element.replaceChildren = function (...nodes) {
        this.childNodes = nodes;
      };
      element.insertBefore = function (child, reference) {
        const from = this.childNodes.indexOf(child);
        if (from !== -1) this.childNodes.splice(from, 1);
        const to = reference == null ? this.childNodes.length : this.childNodes.indexOf(reference);
        this.childNodes.splice(to, 0, child);
        return child;
      };
      element.querySelector = function (selector) {
        return find(this, selector);
      };
      return element;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    querySelector(selector) {
      if (!/^(#[\w-]+|[a-z]+)$/.test(selector)) {
        throw new SyntaxError(`'${selector}' is not a valid selector.`);
      }
      return find(document.body, selector);
    },
  };
  globalThis.document = document;

  document.body = document.createElement("body");
  for (const id of rootIds) {
    const root = document.createElement("div");
    root.setAttribute("id", id);
    document.body.appendChild(root);
  }
  document.created = 0;
  return document;
}

const text = (node) =>
  node.nodeType === 3 ? node.textContent : node.childNodes.map(text).join("");

const view = (label) => createElement("section", {}, [
  createElement("h1", {}, [label]),
  createElement("button", {}, ["Go"]),
]);

// --- Targets ----------------------------------------------------------------

test("render accepts a CSS selector", () => {
  usePage("app");
  render("#app", view("Hello"));
  assert.equal(text(document.querySelector("#app")), "HelloGo");
});

test("render accepts a DOM element, including one not in the page", () => {
  usePage("app");
  const root = document.querySelector("#app");
  render(root, view("Hello"));
  assert.equal(text(root), "HelloGo");

  const detached = document.createElement("div");
  render(detached, view("Detached"));
  assert.equal(text(detached), "DetachedGo");
});

test("mount accepts a CSS selector or a DOM element", () => {
  usePage("a", "b");
  mount("#a", createElement("p", {}, ["via selector"]));
  const b = document.querySelector("#b");
  mount(b, createElement("p", {}, ["via element"]));

  assert.equal(text(document.querySelector("#a")), "via selector");
  assert.equal(text(b), "via element");
});

test("a selector and the element it matches share one render history", () => {
  usePage("app");
  const root = document.querySelector("#app");

  render("#app", view("First"));
  const button = root.querySelector("button");
  document.created = 0;

  render(root, view("Second"));
  assert.equal(root.querySelector("button"), button, "patched, not rebuilt");
  assert.equal(document.created, 0);

  render("#app", view("Third"));
  assert.equal(root.querySelector("button"), button);
  assert.equal(text(root), "ThirdGo");
});

test("an element target keeps DOM identity across normal re-renders", () => {
  usePage("app");
  const root = document.querySelector("#app");
  const tree = (label, className) => createElement("div", { class: className }, [
    createElement("button", { onClick: () => {} }, [label]),
  ]);

  render(root, tree("Save", "a"));
  const oldButton = root.querySelector("button");
  render(root, tree("Saved", "b"));

  assert.equal(root.querySelector("button"), oldButton);
  assert.equal(text(oldButton), "Saved");
  assert.equal(root.childNodes[0].getAttribute("class"), "b");
});

test("keyed children work the same with an element target", () => {
  usePage("app");
  const root = document.querySelector("#app");
  const list = (keys) => createElement("ul", {}, keys.map((key) =>
    createElement("li", { key }, [key]),
  ));

  render(root, list(["a", "b", "c"]));
  const [a, , c] = root.childNodes[0].childNodes;
  render(root, list(["c", "a"]));

  assert.deepEqual(root.childNodes[0].childNodes, [c, a]);
});

test("invalid targets throw a clear HHT.js error", () => {
  usePage("app");
  const message = "HHT.js: Mount target must be a CSS selector string or a DOM element.";

  for (const target of [null, undefined, {}, 123, [], { nodeType: 3 }]) {
    assert.throws(() => render(target, view("x")), { message }, String(target));
    assert.throws(() => mount(target, view("x")), { message });
    assert.throws(() => unmount(target), { message });
  }
});

test("a missing or malformed selector throws a clear HHT.js error", () => {
  usePage("app");
  assert.throws(() => render("#missing", view("x")), {
    message: 'HHT.js: Mount target "#missing" was not found.',
  });
  assert.throws(() => unmount("#missing"), {
    message: 'HHT.js: Mount target "#missing" was not found.',
  });
  assert.throws(() => render("###", view("x")), {
    message: 'HHT.js: Mount target "###" is not a valid CSS selector.',
  });
});

// --- unmount() ---------------------------------------------------------------

test("unmount empties the root but keeps the root element", () => {
  const page = usePage("app");
  render("#app", view("Hello"));

  unmount("#app");

  const root = document.querySelector("#app");
  assert.ok(root, "root still in the page");
  assert.equal(page.body.childNodes[0], root);
  assert.deepEqual(root.childNodes, []);
});

test("render after unmount is a fresh first render", () => {
  usePage("app");
  const root = document.querySelector("#app");
  render(root, view("First"));
  const oldSection = root.childNodes[0];

  unmount(root);
  document.created = 0;
  render(root, view("Second"));

  // Same tags, but nothing is reused: the old tree was forgotten.
  assert.notEqual(root.childNodes[0], oldSection);
  assert.equal(document.created, 3, "section, h1 and button created anew");
  assert.equal(text(root), "SecondGo");
});

test("unmount can be called repeatedly and on a never-rendered root", () => {
  usePage("app", "empty");
  render("#app", view("Hello"));

  assert.doesNotThrow(() => {
    unmount("#app");
    unmount("#app");
    unmount(document.querySelector("#app"));
    unmount("#empty");
  });
  assert.deepEqual(document.querySelector("#app").childNodes, []);
});

test("unmount also clears content added with mount()", () => {
  usePage("app");
  mount("#app", createElement("p", {}, ["one"]));
  mount("#app", createElement("p", {}, ["two"]));

  unmount("#app");

  assert.deepEqual(document.querySelector("#app").childNodes, []);
});

// --- Several roots --------------------------------------------------------

test("each render root keeps its own tree", () => {
  usePage("hud", "board");
  const hud = document.querySelector("#hud");
  const board = document.querySelector("#board");
  const hudView = (lives) => createElement("span", {}, ["Lives: ", lives]);
  const boardView = (cells) => createElement("div", { class: "board" }, cells.map((cell) =>
    createElement("div", { class: "cell" }, [cell]),
  ));

  render("#hud", hudView(3));
  render(board, boardView(["a", "b"]));
  const boardEl = board.childNodes[0];
  const cells = [...boardEl.childNodes];
  const span = hud.childNodes[0];

  document.created = 0;
  render(hud, hudView(2));
  assert.equal(text(hud), "Lives: 2");
  assert.equal(hud.childNodes[0], span);
  assert.equal(board.childNodes[0], boardEl, "board untouched");
  assert.deepEqual(board.childNodes[0].childNodes, cells);
  assert.equal(document.created, 0);

  render("#board", boardView(["a", "c"]));
  assert.equal(text(board), "ac");
  assert.equal(text(hud), "Lives: 2", "hud untouched");
});

test("unmounting one root leaves the others alone", () => {
  usePage("hud", "board");
  render("#hud", createElement("span", {}, ["HUD"]));
  render("#board", createElement("div", {}, ["Board"]));
  const boardChild = document.querySelector("#board").childNodes[0];

  unmount("#hud");

  assert.deepEqual(document.querySelector("#hud").childNodes, []);
  assert.equal(document.querySelector("#board").childNodes[0], boardChild);
  render("#board", createElement("div", {}, ["Board 2"]));
  assert.equal(document.querySelector("#board").childNodes[0], boardChild, "still diffed");
});

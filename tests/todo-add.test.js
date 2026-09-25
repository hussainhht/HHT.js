import assert from "node:assert/strict";
import { test } from "node:test";
import { todoState } from "../todo/state.js";

function createDocument(root) {
  return {
    createElement(tagName) {
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.value = "";
      element.childNodes = [];
      element.attributes = new Map();
      element.setAttribute = function (name, value) {
        this.attributes.set(name, String(value));
      };
      element.removeAttribute = function (name) {
        this.attributes.delete(name);
      };
      element.removeChild = function (child) {
        this.childNodes.splice(this.childNodes.indexOf(child), 1);
        return child;
      };
      element.replaceChild = function (next, previous) {
        const index = this.childNodes.indexOf(previous);
        this.childNodes[index] = next;
        return previous;
      };
      element.appendChild = function (child) {
        this.childNodes.push(child);
        return child;
      };
      return element;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    querySelector(selector) {
      return selector === "#app" ? root : null;
    },
  };
}

function getTextContent(node) {
  if (node.nodeType === 3) return node.textContent;
  return node.childNodes.map(getTextContent).join("");
}

function findByClass(node, className) {
  if (node.nodeType !== 1) return null;
  if ((node.attributes.get("class") ?? "").split(" ").includes(className)) return node;
  for (const child of node.childNodes) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

function pressKey(input, key, text) {
  input.value = text;
  const event = new Event("keydown");
  event.key = key;
  input.dispatchEvent(event);
}

test("adding a todo with Enter rerenders the TodoMVC page automatically", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const root = {
    childNodes: [],
    replaceChildren(...nodes) {
      this.childNodes = nodes;
    },
    get firstChild() {
      return this.childNodes[0] ?? null;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
    replaceChild(next, previous) {
      const index = this.childNodes.indexOf(previous);
      this.childNodes[index] = next;
      return previous;
    },
  };
  globalThis.document = createDocument(root);
  globalThis.window = {
    location: { hash: "#/" },
    addEventListener() {},
  };

  try {
    await import("../todo/app.js");
    const page = () => root.childNodes[0];
    const todoList = () => findByClass(page(), "todo-list");
    const input = findByClass(page(), "new-todo");

    assert.equal(todoList().childNodes.length, 0);
    assert.match(getTextContent(page()), /0 items left/);

    // Other keys and empty/whitespace input add nothing.
    pressKey(input, "a", "buy milk");
    pressKey(input, "Enter", "   ");
    assert.equal(todoState.get().todos.length, 0);
    assert.equal(todoList().childNodes.length, 0);

    pressKey(input, "Enter", "  buy milk ");
    assert.deepEqual(todoState.get().todos.map((todo) => todo.text), ["buy milk"]);
    assert.equal(todoList().childNodes.length, 1);
    assert.match(getTextContent(todoList()), /buy milk/);
    assert.match(getTextContent(page()), /1 item left/);
    assert.equal(input.value, "");

    // The page is patched in place, so the same input element stays mounted.
    assert.equal(findByClass(page(), "new-todo"), input);

    pressKey(input, "Enter", "walk dog");
    assert.equal(todoList().childNodes.length, 2);
    assert.equal(getTextContent(todoList().childNodes[1]), "walk dog");
    assert.match(getTextContent(page()), /2 items left/);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

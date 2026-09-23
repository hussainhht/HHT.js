import assert from "node:assert/strict";
import { test } from "node:test";
import { counterState } from "../todo/state.js";

function createDocument(root) {
  return {
    createElement(tagName) {
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
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

test("the mounted page rerenders automatically when state changes", async () => {
  const originalDocument = globalThis.document;
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

  try {
    await import("../todo/app.js");
    const firstRender = root.childNodes[0];
    assert.match(getTextContent(firstRender), /Count: 0/);

    counterState.set({ count: 3 });

    assert.equal(root.childNodes[0], firstRender);
    assert.match(getTextContent(root.childNodes[0]), /Count: 3/);

    const buttons = () => root.childNodes[0].childNodes[2].childNodes;
    buttons()[1].dispatchEvent(new Event("click"));
    assert.equal(counterState.get().count, 4);
    assert.match(getTextContent(root.childNodes[0]), /Count: 4/);

    buttons()[0].dispatchEvent(new Event("click"));
    assert.equal(counterState.get().count, 3);
    assert.match(getTextContent(root.childNodes[0]), /Count: 3/);

    buttons()[2].dispatchEvent(new Event("click"));
    assert.equal(counterState.get().count, 0);
    assert.match(getTextContent(root.childNodes[0]), /Count: 0/);
  } finally {
    globalThis.document = originalDocument;
  }
});

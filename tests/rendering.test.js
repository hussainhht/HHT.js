import assert from "node:assert/strict";
import { test } from "node:test";
import { appState, counterState } from "../todo/state.js";

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

test("the mounted page rerenders automatically when state changes", async () => {
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
  const hashListeners = [];
  globalThis.window = {
    location: { hash: "#/missing" },
    addEventListener(type, listener) {
      if (type === "hashchange") hashListeners.push(listener);
    },
  };
  const changeHash = (hash) => {
    window.location.hash = hash;
    for (const listener of hashListeners) listener();
  };

  try {
    await import("../todo/app.js");
    assert.match(getTextContent(root.childNodes[0]), /404 Not Found/);
    assert.equal(window.location.hash, "#/missing");

    changeHash("#/");
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

    const messageSection = root.childNodes[0].childNodes[3];
    const messageInput = messageSection.childNodes[1];
    assert.equal(messageSection.tagName, "SECTION");
    assert.equal(messageInput.attributes.get("type"), "text");
    assert.equal(messageInput.attributes.get("placeholder"), "Type a message");
    messageInput.value = "Working together";
    messageInput.dispatchEvent(new Event("input"));
    assert.equal(appState.get().message, "Working together");
    assert.equal(root.childNodes[0].childNodes[3].childNodes[1], messageInput);
    assert.match(getTextContent(root.childNodes[0]), /You typed: Working together/);

    buttons()[1].dispatchEvent(new Event("click"));
    assert.equal(counterState.get().count, 1);
    changeHash("#/active");
    assert.match(getTextContent(root.childNodes[0]), /Active items/);
    assert.match(getTextContent(root.childNodes[0]), /Count: 1/);
    assert.equal(root.childNodes[0].childNodes[3].childNodes[1].value, "Working together");
    changeHash("#/unknown");
    assert.match(getTextContent(root.childNodes[0]), /404 Not Found/);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

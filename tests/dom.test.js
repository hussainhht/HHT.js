import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, mount, renderElement } from "../framework/dom.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

function useDocument() {
  const root = {
    childNodes: [],
    appendChild(node) {
      this.childNodes.push(node);
      return node;
    },
  };

  globalThis.document = {
    createElement(tagName) {
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.attributes = new Map();
      element.childNodes = [];
      element.setAttribute = function (name, value) {
        this.attributes.set(name, String(value));
      };
      element.getAttribute = function (name) {
        return this.attributes.get(name) ?? null;
      };
      element.appendChild = function (node) {
        this.childNodes.push(node);
        return node;
      };
      return element;
    },
    createTextNode(value) {
      return { nodeType: 3, textContent: value };
    },
    querySelector(selector) {
      return selector === "#app" ? root : null;
    },
  };

  return root;
}

test("mounts a simple div", () => {
  const root = useDocument();

  mount("#app", createElement("div"));

  assert.equal(root.childNodes.length, 1);
  assert.equal(root.childNodes[0].tagName, "DIV");
  assert.deepEqual(root.childNodes[0].childNodes, []);
});

test("sets class, id, placeholder, and type attributes", () => {
  useDocument();

  const element = renderElement(createElement("input", {
    class: "task-input",
    id: "new-task",
    placeholder: "Add a task",
    type: "text",
  }));

  assert.equal(element.getAttribute("class"), "task-input");
  assert.equal(element.getAttribute("id"), "new-task");
  assert.equal(element.getAttribute("placeholder"), "Add a task");
  assert.equal(element.getAttribute("type"), "text");
});

test("renders nested elements at each depth", () => {
  useDocument();

  const element = renderElement(createElement("div", {}, [
    createElement("section", {}, [
      createElement("strong", {}, ["Nested"]),
    ]),
  ]));

  assert.equal(element.childNodes[0].tagName, "SECTION");
  assert.equal(element.childNodes[0].childNodes[0].tagName, "STRONG");
  assert.equal(element.childNodes[0].childNodes[0].childNodes[0].textContent, "Nested");
});

test("renders strings and numbers as text nodes", () => {
  useDocument();

  const element = renderElement(createElement("p", {}, ["Count: ", 3]));

  assert.deepEqual(element.childNodes.map(({ nodeType }) => nodeType), [3, 3]);
  assert.deepEqual(element.childNodes.map(({ textContent }) => textContent), ["Count: ", "3"]);
});

test("renders several sibling elements in order", () => {
  useDocument();

  const element = renderElement(createElement("ul", {}, [
    createElement("li", {}, ["First"]),
    createElement("li", {}, ["Second"]),
    createElement("li", {}, ["Third"]),
  ]));

  assert.deepEqual(element.childNodes.map(({ tagName }) => tagName), ["LI", "LI", "LI"]);
  assert.deepEqual(
    element.childNodes.map((child) => child.childNodes[0].textContent),
    ["First", "Second", "Third"],
  );
});

test("handles a button click", () => {
  useDocument();
  let clicks = 0;
  const button = renderElement(createElement("button", {
    onClick: () => { clicks += 1; },
  }, ["Add"]));

  button.dispatchEvent(new Event("click"));

  assert.equal(clicks, 1);
  assert.equal(button.getAttribute("onClick"), null);
});

test("passes the current input value to an input handler", () => {
  useDocument();
  const values = [];
  const input = renderElement(createElement("input", {
    onInput: (event) => { values.push(event.target.value); },
  }));

  input.value = "t";
  input.dispatchEvent(new Event("input"));
  input.value = "task";
  input.dispatchEvent(new Event("input"));

  assert.deepEqual(values, ["t", "task"]);
});

test("handles Enter on keydown", () => {
  useDocument();
  let submissions = 0;
  const input = renderElement(createElement("input", {
    onKeyDown: (event) => {
      if (event.key === "Enter") submissions += 1;
    },
  }));

  const otherKey = new Event("keydown");
  Object.defineProperty(otherKey, "key", { value: "a" });
  input.dispatchEvent(otherKey);
  const enter = new Event("keydown");
  Object.defineProperty(enter, "key", { value: "Enter" });
  input.dispatchEvent(enter);

  assert.equal(submissions, 1);
});

test("handles multiple events on the same page", () => {
  const root = useDocument();
  const received = [];
  mount("#app", createElement("main", {}, [
    createElement("input", {
      onInput: () => { received.push("input"); },
      onKeyDown: () => { received.push("keydown"); },
    }),
    createElement("button", {
      onClick: () => { received.push("click"); },
    }, ["Save"]),
  ]));

  const [input, button] = root.childNodes[0].childNodes;
  input.dispatchEvent(new Event("input"));
  input.dispatchEvent(new Event("keydown"));
  button.dispatchEvent(new Event("click"));

  assert.deepEqual(received, ["input", "keydown", "click"]);
});

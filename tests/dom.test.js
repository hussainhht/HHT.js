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
      return {
        nodeType: 1,
        tagName: tagName.toUpperCase(),
        attributes: new Map(),
        childNodes: [],
        setAttribute(name, value) {
          this.attributes.set(name, String(value));
        },
        getAttribute(name) {
          return this.attributes.get(name) ?? null;
        },
        appendChild(node) {
          this.childNodes.push(node);
          return node;
        },
      };
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

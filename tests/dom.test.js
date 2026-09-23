import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, mount, render, renderElement } from "../framework/dom.js";

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
    replaceChildren(...nodes) {
      this.childNodes = nodes;
    },
    replaceChild(next, previous) {
      const index = this.childNodes.indexOf(previous);
      this.childNodes[index] = next;
      return previous;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
  };

  globalThis.document = {
    createElement(tagName) {
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.value = "";
      element.checked = false;
      element.disabled = false;
      element.selected = false;
      element.attributes = new Map();
      element.childNodes = [];
      element.setAttribute = function (name, value) {
        this.attributes.set(name, String(value));
      };
      element.getAttribute = function (name) {
        return this.attributes.get(name) ?? null;
      };
      element.removeAttribute = function (name) {
        this.attributes.delete(name);
      };
      element.replaceChild = function (next, previous) {
        const index = this.childNodes.indexOf(previous);
        this.childNodes[index] = next;
        return previous;
      };
      element.removeChild = function (child) {
        this.childNodes.splice(this.childNodes.indexOf(child), 1);
        return child;
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


test("preserves input values when rendering a replacement tree", () => {
  const root = useDocument();
  const input = () => createElement("input", { id: "task-input" });

  render("#app", createElement("form", {}, [input()]));
  root.childNodes[0].childNodes[0].value = "Draft task";

  render("#app", createElement("form", {}, [input()]));

  assert.equal(root.childNodes[0].childNodes[0].value, "Draft task");
});

test("updates attributes when rendering a replacement tree", () => {
  const root = useDocument();
  const makeInput = (attrs) => createElement("input", {
    id: "task-input",
    ...attrs,
  });

  render("#app", makeInput({
    class: "compact",
    placeholder: "Short task",
    type: "text",
  }));
  render("#app", makeInput({
    class: "wide",
    placeholder: "Describe the task",
    type: "search",
  }));

  const input = root.childNodes[0];
  assert.equal(input.getAttribute("class"), "wide");
  assert.equal(input.getAttribute("placeholder"), "Describe the task");
  assert.equal(input.getAttribute("type"), "search");
});


test("reuses matching nodes and patches text and attributes", () => {
  const root = useDocument();

  render("#app", createElement("section", { class: "old" }, [
    createElement("p", {}, ["Before"]),
  ]));
  const section = root.childNodes[0];
  const paragraph = section.childNodes[0];

  render("#app", createElement("section", { class: "new" }, [
    createElement("p", {}, ["After"]),
  ]));

  assert.equal(root.childNodes[0], section);
  assert.equal(section.childNodes[0], paragraph);
  assert.equal(section.getAttribute("class"), "new");
  assert.equal(paragraph.childNodes[0].textContent, "After");
});

test("replaces changed child tags and removes stale attributes and children", () => {
  const root = useDocument();

  render("#app", createElement("div", { id: "old", title: "stale" }, [
    createElement("strong", {}, ["Old"]),
    createElement("span", {}, ["Remove me"]),
  ]));

  render("#app", createElement("div", { class: "current" }, [
    createElement("em", {}, ["New"]),
  ]));

  const div = root.childNodes[0];
  assert.equal(div.getAttribute("id"), null);
  assert.equal(div.getAttribute("title"), null);
  assert.equal(div.getAttribute("class"), "current");
  assert.equal(div.childNodes.length, 1);
  assert.equal(div.childNodes[0].tagName, "EM");
  assert.equal(div.childNodes[0].childNodes[0].textContent, "New");
});

test("replaces an event handler without keeping the old handler", () => {
  const root = useDocument();
  let oldCalls = 0;
  let newCalls = 0;
  const button = (handler) => createElement("button", { onClick: handler }, ["Save"]);

  render("#app", button(() => { oldCalls += 1; }));
  const originalButton = root.childNodes[0];
  render("#app", button(() => { newCalls += 1; }));

  assert.equal(root.childNodes[0], originalButton);
  root.childNodes[0].dispatchEvent(new Event("click"));
  assert.equal(oldCalls, 0);
  assert.equal(newCalls, 1);
});


test("flattens nested child arrays and skips conditional empty children", () => {
  const root = useDocument();
  const list = (showSecond) => createElement("ul", {}, [
    [createElement("li", {}, ["First"])],
    showSecond && [createElement("li", {}, ["Second"])],
    null,
    undefined,
  ]);

  render("#app", list(true));
  assert.deepEqual(root.childNodes[0].childNodes.map((item) => item.childNodes[0].textContent), ["First", "Second"]);

  render("#app", list(false));
  assert.deepEqual(root.childNodes[0].childNodes.map((item) => item.childNodes[0].textContent), ["First"]);
});

test("keeps input value and boolean properties in sync with attributes", () => {
  const root = useDocument();
  const input = (attrs) => createElement("input", { type: "checkbox", ...attrs });

  render("#app", input({ checked: true, disabled: false, value: "Draft" }));
  const element = root.childNodes[0];
  assert.equal(element.checked, true);
  assert.equal(element.disabled, false);
  assert.equal(element.getAttribute("checked"), "");
  assert.equal(element.getAttribute("disabled"), null);
  assert.equal(element.value, "Draft");

  element.checked = true;
  render("#app", input({ checked: false, disabled: true, value: "Saved" }));
  assert.equal(root.childNodes[0], element);
  assert.equal(element.checked, false);
  assert.equal(element.disabled, true);
  assert.equal(element.getAttribute("checked"), null);
  assert.equal(element.getAttribute("disabled"), "");
  assert.equal(element.value, "Saved");

  element.checked = true;
  element.value = "Browser changed";
  render("#app", input({ checked: false, disabled: true, value: "Saved" }));
  assert.equal(element.checked, false);
  assert.equal(element.value, "Saved");

  render("#app", input({}));
  assert.equal(element.disabled, false);
  assert.equal(element.value, "");
  assert.equal(element.getAttribute("disabled"), null);
  assert.equal(element.getAttribute("value"), null);

  render("#app", input({ value: null }));
  element.value = "Browser changed";
  render("#app", input({ value: null }));
  assert.equal(element.value, "");
  assert.equal(element.getAttribute("value"), null);
});

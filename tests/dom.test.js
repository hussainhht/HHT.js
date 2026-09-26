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
    created: 0,
    createElement(tagName) {
      this.created += 1;
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
      // Like the DOM: a node that is already a child is moved, not copied.
      element.insertBefore = function (node, reference) {
        const from = this.childNodes.indexOf(node);
        if (from !== -1) this.childNodes.splice(from, 1);
        const to = reference == null ? this.childNodes.length : this.childNodes.indexOf(reference);
        this.childNodes.splice(to, 0, node);
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

// --- Keyed children ---------------------------------------------------------

function keyedList(keys, attrs = () => ({})) {
  return createElement("ul", {}, keys.map((key) =>
    createElement("li", { key, ...attrs(key) }, [String(key)]),
  ));
}

function renderKeys(keys, attrs) {
  render("#app", keyedList(keys, attrs));
  return document.querySelector("#app").childNodes[0].childNodes;
}

const texts = (nodes) => nodes.map((node) => node.childNodes[0].textContent);

test("key is never rendered as a DOM attribute", () => {
  const root = useDocument();

  const li = renderElement(createElement("li", {
    key: "todo-1",
    id: "item",
    class: "todo",
    "data-id": "todo-1",
  }, ["Task"]));
  assert.equal(li.getAttribute("key"), null);
  assert.equal(li.getAttribute("class"), "todo");
  assert.equal(li.getAttribute("id"), "item");
  assert.equal(li.getAttribute("data-id"), "todo-1");

  render("#app", createElement("input", { key: 1, type: "checkbox", checked: true, value: "v" }));
  render("#app", createElement("input", { key: 2, type: "checkbox", checked: false, value: "w" }));
  render("#app", createElement("input", { type: "checkbox" }));
  const input = root.childNodes[0];
  assert.equal(input.getAttribute("key"), null);
  assert.equal(input.checked, false);
});

test("removing a keyed middle child keeps the other DOM nodes", () => {
  useDocument();
  const [a, b, c] = renderKeys(["a", "b", "c"]);
  document.created = 0;

  const after = renderKeys(["a", "c"]);

  assert.deepEqual(after, [a, c]);
  assert.equal(after.includes(b), false);
  assert.equal(document.created, 0);
  assert.deepEqual(texts(after), ["a", "c"]);
});

test("reordering keyed children moves the existing DOM nodes", () => {
  useDocument();
  const [a, b, c] = renderKeys(["a", "b", "c"]);
  document.created = 0;

  assert.deepEqual(renderKeys(["c", "a", "b"]), [c, a, b]);
  assert.deepEqual(renderKeys(["b", "c", "a"]), [b, c, a]);
  assert.equal(document.created, 0);
});

test("inserting a keyed child creates only that child", () => {
  useDocument();
  const [a, c] = renderKeys(["a", "c"]);
  document.created = 0;

  const after = renderKeys(["a", "b", "c"]);

  assert.equal(document.created, 1);
  assert.equal(after[0], a);
  assert.equal(after[2], c);
  assert.deepEqual(texts(after), ["a", "b", "c"]);
});

test("moving one keyed child keeps every node", () => {
  useDocument();
  const [a, b, c, d] = renderKeys(["a", "b", "c", "d"]);
  document.created = 0;

  assert.deepEqual(renderKeys(["a", "d", "b", "c"]), [a, d, b, c]);
  assert.deepEqual(renderKeys(["d", "c", "b", "a"]), [d, c, b, a]);
  assert.equal(document.created, 0);
});

test("a keyed list can grow from and shrink to empty", () => {
  useDocument();
  assert.deepEqual(renderKeys([]), []);
  const [x, y] = renderKeys(["x", "y"]);
  assert.deepEqual(texts([x, y]), ["x", "y"]);
  assert.deepEqual(renderKeys([]), []);
});

test("same key with changed attributes and text patches the same node", () => {
  const root = useDocument();
  const item = (className, text) => createElement("ul", {}, [
    createElement("li", { key: 1, class: className }, [text]),
    createElement("li", { key: 2 }, ["Other"]),
  ]);

  render("#app", item("active", "Task"));
  const [li] = root.childNodes[0].childNodes;
  const textNode = li.childNodes[0];

  render("#app", item("completed", "Task updated"));

  assert.equal(root.childNodes[0].childNodes[0], li);
  assert.equal(li.childNodes[0], textNode);
  assert.equal(li.getAttribute("class"), "completed");
  assert.equal(textNode.textContent, "Task updated");
});

test("a keyed child whose tag changes is rebuilt in the right place", () => {
  const root = useDocument();
  render("#app", createElement("div", {}, [
    createElement("p", { key: "a" }, ["A"]),
    createElement("p", { key: "b" }, ["B"]),
  ]));
  const [a] = root.childNodes[0].childNodes;

  render("#app", createElement("div", {}, [
    createElement("p", { key: "a" }, ["A"]),
    createElement("h2", { key: "b" }, ["B"]),
  ]));

  const [first, second] = root.childNodes[0].childNodes;
  assert.equal(first, a);
  assert.equal(second.tagName, "H2");
});

test("event handlers follow moved keyed elements without duplicating", () => {
  useDocument();
  const clicks = [];
  const handlers = (version) => (key) => ({ onClick: () => clicks.push(`${version}:${key}`) });

  const [a, b, c] = renderKeys(["a", "b", "c"], handlers("v1"));
  renderKeys(["c", "a", "b"], handlers("v2"));

  for (const node of [a, b, c]) node.dispatchEvent(new Event("click"));
  assert.deepEqual(clicks, ["v2:a", "v2:b", "v2:c"]);
});

test("DOM state stays with its keyed item when an earlier item is removed", () => {
  const root = useDocument();
  const inputs = (keys) => createElement("form", {}, keys.map((key) =>
    createElement("input", { key, name: key }),
  ));

  render("#app", inputs(["a", "b", "c"]));
  const c = root.childNodes[0].childNodes[2];
  c.value = "typed into c";

  render("#app", inputs(["a", "c"]));

  const [, second] = root.childNodes[0].childNodes;
  assert.equal(second, c);
  assert.equal(second.value, "typed into c");
});

test("duplicate sibling keys throw a clear error", () => {
  useDocument();
  assert.throws(
    () => createElement("ul", {}, [
      createElement("li", { key: 1 }, ["A"]),
      createElement("li", { key: 1 }, ["B"]),
    ]),
    { message: 'HHT.js: Duplicate key "1" found among sibling elements.' },
  );

  // Keys only need to be unique among siblings.
  assert.doesNotThrow(() => createElement("div", {}, [
    createElement("ul", { key: "x" }, [createElement("li", { key: 1 })]),
    createElement("ul", { key: "y" }, [createElement("li", { key: 1 })]),
  ]));
});

test("numeric and string keys are different keys", () => {
  useDocument();
  assert.doesNotThrow(() => keyedList([1, "1"]));

  const [one] = renderKeys([1]);
  document.created = 0;
  const [stringOne] = renderKeys(["1"]);

  assert.notEqual(stringOne, one, '1 and "1" do not match');
  assert.equal(document.created, 1);
});

test("a list where some children have no key is compared by position", () => {
  const root = useDocument();
  const mixed = (items) => createElement("ul", {}, items.map(([key, text]) =>
    createElement("li", key == null ? {} : { key }, [text]),
  ));

  render("#app", mixed([["a", "A"], [null, "B"], ["c", "C"]]));
  const [a, b] = root.childNodes[0].childNodes;

  render("#app", mixed([["a", "A"], ["c", "C"]]));

  const after = root.childNodes[0].childNodes;
  assert.equal(after[0], a);
  assert.equal(after[1], b, "second position reused, as in unkeyed lists");
  assert.equal(after[1].childNodes[0].textContent, "C");
  assert.equal(after.length, 2);
});

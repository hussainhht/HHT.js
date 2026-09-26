import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, render, unmount } from "../framework/index.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

// Fake element that counts native listener operations: `adds` and `removes`
// per element, and in `totals` for the whole document.
function useRoot() {
  const totals = { adds: 0, removes: 0 };

  function makeElement(tagName) {
    const element = new EventTarget();
    const add = element.addEventListener.bind(element);
    const remove = element.removeEventListener.bind(element);

    Object.assign(element, {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      childNodes: [],
      attributes: new Map(),
      style: {},
      adds: 0,
      removes: 0,
      addEventListener(type, listener) {
        this.adds += 1;
        totals.adds += 1;
        add(type, listener);
      },
      removeEventListener(type, listener) {
        this.removes += 1;
        totals.removes += 1;
        remove(type, listener);
      },
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      removeAttribute(name) {
        this.attributes.delete(name);
      },
      appendChild(child) {
        this.childNodes.push(child);
        return child;
      },
      removeChild(child) {
        this.childNodes.splice(this.childNodes.indexOf(child), 1);
        return child;
      },
      replaceChildren(...nodes) {
        this.childNodes = nodes;
      },
      replaceChild(next, previous) {
        this.childNodes[this.childNodes.indexOf(previous)] = next;
        return previous;
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

  globalThis.document = {
    createElement: makeElement,
    createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  };
  const root = makeElement("div");
  return { root, totals };
}

const click = (element) => element.dispatchEvent(new Event("click"));

function renderButton(root, attrs) {
  render(root, createElement("button", attrs, ["Go"]));
  return root.firstChild;
}

test("the first handler attaches one native listener and runs", () => {
  const { root } = useRoot();
  const calls = [];
  const button = renderButton(root, { onClick: () => calls.push("A") });

  click(button);

  assert.deepEqual(calls, ["A"]);
  assert.equal(button.adds, 1);
  assert.equal(button.removes, 0);
});

test("handler A → B: only B runs, and the native listener is kept", () => {
  const { root } = useRoot();
  const calls = [];
  const button = renderButton(root, { onClick: () => calls.push("A") });
  renderButton(root, { onClick: () => calls.push("B") });

  click(button);

  assert.deepEqual(calls, ["B"]);
  assert.deepEqual([button.adds, button.removes], [1, 0]);
});

test("the same handler again causes no native listener operations", () => {
  const { root } = useRoot();
  const handler = () => {};
  const button = renderButton(root, { onClick: handler });
  renderButton(root, { onClick: handler });
  renderButton(root, { onClick: handler });

  assert.deepEqual([button.adds, button.removes], [1, 0]);
});

test("A → B → C, then removed, then re-added: listener ops only when attaching or removing", () => {
  const { root } = useRoot();
  const calls = [];
  const button = renderButton(root, { onClick: () => calls.push("A") });
  renderButton(root, { onClick: () => calls.push("B") });
  renderButton(root, { onClick: () => calls.push("C") });
  assert.deepEqual([button.adds, button.removes], [1, 0], "1 add, 0 removes for A → B → C");
  click(button);

  renderButton(root, {});
  assert.deepEqual([button.adds, button.removes], [1, 1], "removed when onClick is gone");
  click(button);

  renderButton(root, { onClick: () => calls.push("D") });
  assert.deepEqual([button.adds, button.removes], [2, 1], "attached once again");
  click(button);

  assert.deepEqual(calls, ["C", "D"], "one active listener at a time");
});

test("handler → null or undefined removes the native listener; null → handler adds it", () => {
  for (const none of [null, undefined]) {
    const { root } = useRoot();
    const calls = [];
    const button = renderButton(root, { onClick: () => calls.push("x") });
    renderButton(root, { onClick: none });
    click(button);
    assert.deepEqual(calls, [], String(none));
    assert.deepEqual([button.adds, button.removes], [1, 1]);

    renderButton(root, { onClick: none });
    assert.deepEqual([button.adds, button.removes], [1, 1], "nothing to remove twice");

    renderButton(root, { onClick: () => calls.push("y") });
    click(button);
    assert.deepEqual(calls, ["y"]);
    assert.deepEqual([button.adds, button.removes], [2, 1]);
  }
});

test("inline arrow handlers on every render cause no listener churn", () => {
  const { root, totals } = useRoot();
  let value = 0;
  const saved = [];
  const View = () => createElement("button", { onClick: () => saved.push(value) }, ["Save"]);

  render(root, View());
  const button = root.firstChild;
  for (value = 1; value <= 5; value += 1) render(root, View());
  click(button);

  assert.deepEqual(saved, [6], "the latest callback sees the latest value");
  assert.deepEqual([totals.adds, totals.removes], [1, 0]);
});

test("several event types on one element are stored independently", () => {
  const { root } = useRoot();
  const calls = [];
  const handleKeyDown = () => calls.push("keydown");
  const handleBlur = () => calls.push("blur");
  const input = (inputTag) => createElement("input", {
    onInput: () => calls.push(inputTag),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
  });

  render(root, input("input-1"));
  const element = root.firstChild;
  render(root, input("input-2"));
  for (const type of ["input", "keydown", "blur"]) element.dispatchEvent(new Event(type));

  assert.deepEqual(calls, ["input-2", "keydown", "blur"]);
  assert.deepEqual([element.adds, element.removes], [3, 0]);

  render(root, createElement("input", { onKeyDown: handleKeyDown, onBlur: handleBlur }));
  calls.length = 0;
  for (const type of ["input", "keydown", "blur"]) element.dispatchEvent(new Event(type));
  assert.deepEqual(calls, ["keydown", "blur"], "removing onInput leaves the others");
  assert.deepEqual([element.adds, element.removes], [3, 1]);
});

test("two attributes for the same event stay independent", () => {
  const { root } = useRoot();
  const calls = [];
  const view = (withSecond) => createElement("input", {
    onKeyDown: () => calls.push("first"),
    onKeydown: withSecond ? () => calls.push("second") : null,
  });

  render(root, view(true));
  const input = root.firstChild;
  input.dispatchEvent(new Event("keydown"));
  render(root, view(false));
  input.dispatchEvent(new Event("keydown"));

  assert.deepEqual(calls, ["first", "second", "first"]);
});

test("handlers get the native event object and `this`", () => {
  const { root } = useRoot();
  let seen;
  const button = renderButton(root, {
    onClick(event) {
      seen = { event, self: this };
    },
  });
  const event = new Event("click");
  button.dispatchEvent(event);

  assert.equal(seen.event, event);
  assert.equal(seen.self, button);
});

test("rerendering many elements with new inline handlers adds and removes no listeners", () => {
  const { root, totals } = useRoot();
  const clicks = [];
  const list = (version) => createElement("ul", {}, Array.from({ length: 20 }, (_, index) =>
    createElement("li", { onClick: () => clicks.push(`${version}:${index}`) }, [String(index)]),
  ));

  render(root, list("v1"));
  assert.deepEqual([totals.adds, totals.removes], [20, 0]);

  render(root, list("v2"));
  render(root, list("v3"));

  assert.deepEqual([totals.adds, totals.removes], [20, 0], "0 extra adds, 0 removes");
  click(root.firstChild.childNodes[7]);
  assert.deepEqual(clicks, ["v3:7"]);
});

test("keyed reorder keeps nodes and native listeners, with the new callbacks", () => {
  const { root, totals } = useRoot();
  const clicks = [];
  const list = (keys, version) => createElement("ul", {}, keys.map((key) =>
    createElement("li", { key, onClick: () => clicks.push(`${version}:${key}`) }, [key]),
  ));

  render(root, list(["a", "b", "c"], "v1"));
  const [a, b, c] = root.firstChild.childNodes;
  render(root, list(["c", "a", "b"], "v2"));

  assert.deepEqual(root.firstChild.childNodes, [c, a, b]);
  assert.deepEqual([totals.adds, totals.removes], [3, 0]);
  for (const item of [a, b, c]) click(item);
  assert.deepEqual(clicks, ["v2:a", "v2:b", "v2:c"], "each runs once, with the new callback");
});

test("removing a keyed item leaves the others' listeners untouched", () => {
  const { root, totals } = useRoot();
  const clicks = [];
  const list = (keys) => createElement("ul", {}, keys.map((key) =>
    createElement("li", { key, onClick: () => clicks.push(key) }, [key]),
  ));

  render(root, list(["a", "b", "c"]));
  const [a, b, c] = root.firstChild.childNodes;
  render(root, list(["a", "c"]));

  assert.deepEqual(root.firstChild.childNodes, [a, c]);
  assert.equal(root.firstChild.childNodes.includes(b), false, "B is gone");
  assert.deepEqual([a.adds, a.removes, c.adds, c.removes], [1, 0, 1, 0]);
  assert.deepEqual([totals.adds, totals.removes], [3, 0]);
  click(a);
  click(c);
  assert.deepEqual(clicks, ["a", "c"]);
});

test("changing style and handler in one render updates both on the same node", () => {
  const { root } = useRoot();
  const calls = [];
  const button = renderButton(root, {
    style: { transform: "translateX(10px)" },
    onClick: () => calls.push("A"),
  });
  renderButton(root, {
    style: { transform: "translateX(20px)" },
    onClick: () => calls.push("B"),
  });

  assert.equal(root.firstChild, button);
  assert.equal(button.style.transform, "translateX(20px)");
  click(button);
  assert.deepEqual(calls, ["B"]);
  assert.deepEqual([button.adds, button.removes], [1, 0]);
});

test("a handler change does not call the element's ref again", () => {
  const { root } = useRoot();
  const refCalls = [];
  const ref = (element) => refCalls.push(element);

  const button = renderButton(root, { ref, onClick: () => {} });
  renderButton(root, { ref, onClick: () => {} });
  renderButton(root, { ref, onClick: null });

  assert.deepEqual(refCalls, [button]);
});

test("replaced and unmounted elements are simply dropped", () => {
  const { root, totals } = useRoot();
  const calls = [];
  render(root, createElement("div", {}, [createElement("p", { onClick: () => calls.push("p") })]));
  const p = root.firstChild.childNodes[0];

  render(root, createElement("div", {}, [createElement("h2", { onClick: () => calls.push("h2") })]));
  const h2 = root.firstChild.childNodes[0];
  click(h2);
  unmount(root);

  assert.notEqual(h2, p);
  assert.deepEqual(calls, ["h2"]);
  assert.deepEqual([totals.adds, totals.removes], [2, 0], "no cleanup work for removed nodes");
});

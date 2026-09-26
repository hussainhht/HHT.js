import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement, mount, render, unmount } from "../framework/index.js";

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

// Fake page with parentNode tracking, so tests can check whether an element
// is attached (connected to document.body) when its ref runs.
function usePage(...rootIds) {
  const attach = (parent, child) => {
    if (child.parentNode && child.parentNode !== parent) detach(child);
    child.parentNode = parent;
  };
  const detach = (child) => {
    const siblings = child.parentNode.childNodes;
    const index = siblings.indexOf(child);
    if (index !== -1) siblings.splice(index, 1);
    child.parentNode = null;
  };

  const document = {
    created: 0,
    createElement(tagName) {
      document.created += 1;
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.parentNode = null;
      element.childNodes = [];
      element.attributes = new Map();
      Object.defineProperty(element, "firstChild", {
        get() {
          return this.childNodes[0] ?? null;
        },
      });
      Object.defineProperty(element, "isConnected", {
        get() {
          let node = this;
          while (node && node !== document.body) node = node.parentNode;
          return node === document.body;
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
        attach(this, child);
        this.childNodes.push(child);
        return child;
      };
      element.removeChild = function (child) {
        detach(child);
        return child;
      };
      element.replaceChild = function (next, previous) {
        this.childNodes[this.childNodes.indexOf(previous)] = next;
        previous.parentNode = null;
        next.parentNode = this;
        return previous;
      };
      element.replaceChildren = function (...nodes) {
        for (const child of this.childNodes) child.parentNode = null;
        this.childNodes = [];
        for (const node of nodes) this.appendChild(node);
      };
      element.insertBefore = function (child, reference) {
        const from = this.childNodes.indexOf(child);
        if (from !== -1) this.childNodes.splice(from, 1);
        const to = reference == null ? this.childNodes.length : this.childNodes.indexOf(reference);
        this.childNodes.splice(to, 0, child);
        child.parentNode = this;
        return child;
      };
      return element;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text, parentNode: null };
    },
    querySelector(selector) {
      return document.body.childNodes.find(
        (root) => `#${root.attributes.get("id")}` === selector,
      ) ?? null;
    },
  };
  globalThis.document = document;

  document.body = document.createElement("body");
  for (const id of rootIds) {
    const root = document.createElement("div");
    root.setAttribute("id", id);
    document.body.appendChild(root);
  }
  return document;
}

// A ref callback that records every call as [name, element-or-null].
function recorder() {
  const calls = [];
  const ref = (name) => (element) => calls.push([name, element]);
  return { calls, ref };
}

test("a ref receives the finished, attached element after render", () => {
  usePage("app");
  let seen;
  render("#app", createElement("section", {}, [
    createElement("button", {
      class: "save",
      ref: (element) => {
        seen = {
          element,
          connected: element.isConnected,
          className: element.getAttribute("class"),
          text: element.childNodes[0]?.textContent,
          // A sibling created after the button already exists.
          sibling: element.parentNode.childNodes[1]?.tagName,
        };
      },
    }, ["Save"]),
    createElement("p", {}, ["after"]),
  ]));

  const button = document.querySelector("#app").childNodes[0].childNodes[0];
  assert.equal(seen.element, button);
  assert.equal(seen.element.tagName, "BUTTON");
  assert.equal(seen.connected, true, "already inside the page");
  assert.equal(seen.className, "save");
  assert.equal(seen.text, "Save");
  assert.equal(seen.sibling, "P", "the whole render is done");
});

test("ref is not rendered as an attribute", () => {
  usePage("app");
  const noop = () => {};
  render("#app", createElement("div", { ref: noop, key: "k", class: "box" }));
  render("#app", createElement("div", { ref: () => {}, key: "k", class: "box2" }));

  const div = document.querySelector("#app").childNodes[0];
  assert.deepEqual([...div.attributes.keys()], ["class"]);
});

test("re-rendering with the same ref does not call it again", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const refA = ref("A");

  render("#app", createElement("div", { ref: refA, class: "one" }));
  const div = document.querySelector("#app").childNodes[0];
  render("#app", createElement("div", { ref: refA, class: "two" }));
  render("#app", createElement("div", { ref: refA, class: "three" }));

  assert.deepEqual(calls, [["A", div]]);
  assert.equal(div.getAttribute("class"), "three");
});

test("changing the ref callback releases the old one and gives the node to the new one", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const refA = ref("A");
  const refB = ref("B");

  render("#app", createElement("div", { ref: refA, class: "a" }));
  const div = document.querySelector("#app").childNodes[0];
  calls.length = 0;
  document.created = 0;

  render("#app", createElement("div", { ref: refB, class: "b" }));

  assert.deepEqual(calls, [["A", null], ["B", div]]);
  assert.equal(document.querySelector("#app").childNodes[0], div, "same node");
  assert.equal(document.created, 0);
  assert.equal(div.getAttribute("class"), "b");
});

test("adding or removing a ref on a kept element", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const refA = ref("A");

  render("#app", createElement("div", {}));
  const div = document.querySelector("#app").childNodes[0];
  render("#app", createElement("div", { ref: refA }));
  render("#app", createElement("div", { ref: null }));
  render("#app", createElement("div", { ref: undefined }));

  assert.deepEqual(calls, [["A", div], ["A", null]]);
});

test("removing an element calls its ref with null", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const view = (showBadge) => createElement("div", {}, [
    createElement("span", {}, ["always"]),
    showBadge && createElement("b", { ref: ref("badge") }, ["!"]),
  ]);

  render("#app", view(true));
  const badge = document.querySelector("#app").childNodes[0].childNodes[1];
  render("#app", view(false));

  assert.deepEqual(calls, [["badge", badge], ["badge", null]]);
});

test("replacing an element (tag change) releases the old ref and assigns the new one", () => {
  usePage("app");
  const { calls, ref } = recorder();

  render("#app", createElement("ul", {}, [createElement("div", { key: "x", ref: ref("old") })]));
  const oldEl = document.querySelector("#app").childNodes[0].childNodes[0];
  calls.length = 0;

  render("#app", createElement("ul", {}, [createElement("span", { key: "x", ref: ref("new") })]));
  const newEl = document.querySelector("#app").childNodes[0].childNodes[0];

  assert.notEqual(newEl, oldEl);
  assert.deepEqual(calls, [["old", null], ["new", newEl]]);
});

test("the same callback ends up with the new element when its element is replaced", () => {
  usePage("app");
  let current;
  const trackRef = (element) => {
    current = element;
  };

  render("#app", createElement("div", {}, [createElement("p", { ref: trackRef })]));
  render("#app", createElement("div", {}, [createElement("h2", { ref: trackRef })]));

  const h2 = document.querySelector("#app").childNodes[0].childNodes[0];
  assert.equal(h2.tagName, "H2");
  assert.equal(current, h2, "cleanup ran before the new assignment");

  render("#app", createElement("div", {}, ["text instead"]));
  assert.equal(current, null, "element replaced by text");
});

test("unmount releases every ref in the tree, children first", () => {
  usePage("app");
  const { calls, ref } = recorder();
  let player = "unset";

  render("#app", createElement("main", { ref: ref("main") }, [
    createElement("div", {
      key: "player-1",
      class: "player",
      ref: (element) => {
        player = element;
      },
    }),
    createElement("section", { ref: ref("section") }, [
      createElement("i", { ref: ref("childA") }),
      createElement("i", { ref: ref("childB") }),
    ]),
  ]));
  assert.equal(player.getAttribute("class"), "player");
  calls.length = 0;

  unmount("#app");

  assert.equal(player, null);
  assert.deepEqual(calls, [
    ["childA", null],
    ["childB", null],
    ["section", null],
    ["main", null],
  ]);

  calls.length = 0;
  unmount("#app");
  assert.deepEqual(calls, [], "nothing left to release");
});

test("refs are assigned children first on creation", () => {
  usePage("app");
  const { calls, ref } = recorder();

  render("#app", createElement("section", { ref: ref("parent") }, [
    createElement("i", { ref: ref("childA") }),
    createElement("i", { ref: ref("childB") }),
  ]));

  assert.deepEqual(calls.map(([name]) => name), ["childA", "childB", "parent"]);
});

test("removing a subtree releases nested refs, children first", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const view = (withPanel) => createElement("div", {}, [
    withPanel && createElement("section", { ref: ref("panel") }, [
      createElement("i", { ref: ref("icon") }),
      createElement("p", {}, [createElement("b", { ref: ref("deep") })]),
    ]),
  ]);

  render("#app", view(true));
  calls.length = 0;
  render("#app", view(false));

  assert.deepEqual(calls, [["icon", null], ["deep", null], ["panel", null]]);
});

test("keyed moves keep refs without cleanup or reassignment", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const refs = { a: ref("a"), b: ref("b"), c: ref("c") };
  const list = (keys) => createElement("ul", {}, keys.map((key) =>
    createElement("li", { key, ref: refs[key] }, [key]),
  ));

  render("#app", list(["a", "b", "c"]));
  const [a, b, c] = document.querySelector("#app").childNodes[0].childNodes;
  assert.deepEqual(calls, [["a", a], ["b", b], ["c", c]]);
  calls.length = 0;

  render("#app", list(["c", "a", "b"]));
  render("#app", list(["b", "c", "a"]));

  assert.deepEqual(calls, [], "moving is not destroying");
});

test("keyed removal releases only the removed item's ref", () => {
  usePage("app");
  const { calls, ref } = recorder();
  const refs = { a: ref("a"), b: ref("b"), c: ref("c") };
  const list = (keys) => createElement("ul", {}, keys.map((key) =>
    createElement("li", { key, ref: refs[key] }, [key]),
  ));

  render("#app", list(["a", "b", "c"]));
  calls.length = 0;
  render("#app", list(["a", "c"]));
  assert.deepEqual(calls, [["b", null]]);

  calls.length = 0;
  render("#app", list(["a", "b", "c"]));
  const b = document.querySelector("#app").childNodes[0].childNodes[1];
  assert.deepEqual(calls, [["b", b]], "a re-added item gets its ref again");
});

test("several refs work independently", () => {
  usePage("hud", "game");
  let player;
  let hud;
  let chat;
  const playerRef = (element) => {
    player = element;
  };
  const hudRef = (element) => {
    hud = element;
  };
  const chatRef = (element) => {
    chat = element;
  };
  const hudView = (lives) => createElement("span", { ref: hudRef }, ["Lives: ", lives]);

  render("#hud", hudView(3));
  render("#game", createElement("div", {}, [
    createElement("div", { class: "player", ref: playerRef }),
    createElement("ul", { class: "chat", ref: chatRef }),
  ]));
  const before = { player, hud, chat };
  assert.equal(player.getAttribute("class"), "player");
  assert.equal(chat.getAttribute("class"), "chat");
  assert.equal(hud.tagName, "SPAN");

  render("#hud", hudView(2));
  assert.deepEqual({ player, hud, chat }, before);

  unmount("#hud");
  assert.equal(hud, null);
  assert.equal(player, before.player, "other root untouched");
  assert.equal(chat, before.chat);
});

test("invalid ref values throw a clear error", () => {
  usePage("app");
  for (const ref of ["player", {}, 42, true, { current: null }]) {
    assert.throws(() => createElement("div", { ref }), {
      message: "HHT.js: ref must be a function, null, or undefined.",
    });
  }
  assert.doesNotThrow(() => render("#app", createElement("div", { ref: null })));
  assert.doesNotThrow(() => render("#app", createElement("div", { ref: undefined })));
});

test("refs work in a root that is not attached to the page", () => {
  usePage();
  const root = document.createElement("div");
  let seen;
  let connected;

  render(root, createElement("div", {
    ref: (element) => {
      seen = element;
      connected = element?.isConnected;
    },
  }));

  assert.equal(seen, root.childNodes[0]);
  assert.equal(seen.parentNode, root);
  assert.equal(connected, false);

  unmount(root);
  assert.equal(seen, null);
});

test("mount() calls refs too", () => {
  usePage("app");
  let seen;
  mount("#app", createElement("p", { ref: (element) => { seen = element; } }));
  assert.equal(seen, document.querySelector("#app").childNodes[0]);
});

test("content removed from outside HHT.js has its refs released on the next render", () => {
  usePage("app");
  const { calls, ref } = recorder();
  render("#app", createElement("div", { ref: ref("old") }));
  document.querySelector("#app").replaceChildren();
  calls.length = 0;

  render("#app", createElement("div", { ref: ref("new") }));
  const div = document.querySelector("#app").childNodes[0];

  assert.deepEqual(calls, [["old", null], ["new", div]]);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import * as hht from "../framework/index.js";
import {
  createElement,
  createRouter,
  mount,
  render,
  state,
  unmount,
} from "../framework/index.js";
import * as dom from "../framework/dom.js";
import * as router from "../framework/router.js";
import * as store from "../framework/store.js";

test("the entry point exports exactly the public API", () => {
  assert.deepEqual(Object.keys(hht).sort(), [
    "createElement",
    "createRouter",
    "mount",
    "render",
    "state",
    "unmount",
  ]);
  for (const [name, value] of Object.entries(hht)) {
    assert.equal(typeof value, "function", name);
  }
  assert.equal(hht.default, undefined, "no default export / hht namespace");
});

test("the entry point re-exports the implementation, not copies", () => {
  assert.equal(createElement, dom.createElement);
  assert.equal(render, dom.render);
  assert.equal(mount, dom.mount);
  assert.equal(unmount, dom.unmount);
  assert.equal(state, store.state);
  assert.equal(createRouter, router.createRouter);
});

test("internal helpers stay out of the public API", () => {
  for (const name of ["renderElement", "isEvent", "addEvent", "notFound"]) {
    assert.equal(name in hht, false, name);
  }
});

// Minimal browser stand-ins: elements are EventTargets so clicks can be
// dispatched, and the hash router only needs location.hash + hashchange.
function useBrowser(initialHash) {
  const root = {
    childNodes: [],
    get firstChild() {
      return this.childNodes[0] ?? null;
    },
    replaceChildren(...nodes) {
      this.childNodes = nodes;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
    replaceChild(next, previous) {
      this.childNodes[this.childNodes.indexOf(previous)] = next;
      return previous;
    },
  };
  const hashListeners = [];
  const originals = { document: globalThis.document, window: globalThis.window };

  globalThis.document = {
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
      return element;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    querySelector(selector) {
      return selector === "#app" ? root : null;
    },
  };
  globalThis.window = {
    location: { hash: initialHash },
    addEventListener(type, listener) {
      if (type === "hashchange") hashListeners.push(listener);
    },
  };

  return {
    root,
    changeHash(hash) {
      window.location.hash = hash;
      for (const listener of hashListeners) listener();
    },
    restore() {
      globalThis.document = originals.document;
      globalThis.window = originals.window;
    },
  };
}

function text(node) {
  return node.nodeType === 3 ? node.textContent : node.childNodes.map(text).join("");
}

test("a user can build a routed, stateful page from the entry point alone", () => {
  const browser = useBrowser("#/");

  try {
    const clicks = state(0);
    const appRouter = createRouter();
    appRouter.register("/").register("/about");

    const renderRoute = (path) =>
      path === "/about"
        ? createElement("h1", {}, ["About"])
        : createElement("main", {}, [
            createElement("h1", {}, ["Home"]),
            createElement("p", { id: "clicks" }, ["Clicks: ", clicks.get()]),
            createElement(
              "button",
              { onClick: () => clicks.set((n) => n + 1) },
              ["+"],
            ),
          ]);
    const renderApp = () => render("#app", appRouter.getCurrentView(renderRoute));

    clicks.subscribe(renderApp);
    appRouter.subscribe(renderApp);
    appRouter.start();
    renderApp();

    const page = () => browser.root.childNodes[0];
    assert.equal(text(page()), "HomeClicks: 0+");

    const button = page().childNodes[2];
    button.dispatchEvent(new Event("click"));
    button.dispatchEvent(new Event("click"));
    assert.equal(text(page()), "HomeClicks: 2+");
    assert.equal(page().childNodes[2], button, "patched in place");

    browser.changeHash("#/about");
    assert.equal(appRouter.getCurrentRoute(), "/about");
    assert.equal(text(page()), "About");

    browser.changeHash("#/missing");
    assert.match(text(page()), /404 Not Found/);
  } finally {
    browser.restore();
  }
});

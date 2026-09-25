// Fake DOM for tests that run the real TodoMVC app (todo/app.js) in Node.
// Elements are EventTargets, so tests can dispatch the same events a browser
// would and inspect the patched tree afterwards.

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

export function getTextContent(node) {
  if (node.nodeType === 3) return node.textContent;
  return node.childNodes.map(getTextContent).join("");
}

export function findByClass(node, className) {
  if (node.nodeType !== 1) return null;
  if ((node.attributes.get("class") ?? "").split(" ").includes(className)) return node;
  for (const child of node.childNodes) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

export function pressKey(input, key, text) {
  input.value = text;
  const event = new Event("keydown");
  event.key = key;
  input.dispatchEvent(event);
}

export function clickCheckbox(checkbox) {
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event("change"));
}

let loadCount = 0;

// Installs the fake `document` and `window` and mounts the app at `hash`.
// Each test file runs in its own process, so state starts fresh per file.
//
// `reload()` simulates a browser refresh: it starts a new copy of todo/app.js
// (new router, reads the hash again) on a new root. Only app.js is reloaded;
// state.js is shared, standing in for todos that survive the refresh. Don't
// change state after a reload: the earlier app copies are still subscribed.
export async function mountTodoApp({ hash = "#/" } = {}) {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let root;
  let hashListeners;

  async function load(startHash) {
    root = {
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
    hashListeners = [];
    globalThis.document = createDocument(root);
    globalThis.window = {
      location: { hash: startHash },
      addEventListener(type, listener) {
        if (type === "hashchange") hashListeners.push(listener);
      },
    };

    loadCount += 1;
    await import(
      loadCount === 1 ? "../todo/app.js" : `../todo/app.js?load=${loadCount}`
    );
  }

  await load(hash);

  return {
    page: () => root.childNodes[0],
    // Same as clicking a link: the hash changes, then `hashchange` fires.
    navigate(nextHash) {
      window.location.hash = nextHash;
      for (const listener of hashListeners) listener();
    },
    reload: (nextHash = window.location.hash) => load(nextHash),
    restore() {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    },
  };
}

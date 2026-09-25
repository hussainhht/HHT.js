// Fake DOM for tests that run the real TodoMVC app (todo/app.js) in Node.
// Elements are EventTargets, so tests can dispatch the same events a browser
// would and inspect the patched tree afterwards.

// Supports the two selector forms the app uses: a tag name ("li") or a single
// class (".edit").
function matches(element, selector) {
  if (element?.nodeType !== 1) return false;
  if (selector.startsWith(".")) {
    const classes = (element.attributes.get("class") ?? "").split(" ");
    return classes.includes(selector.slice(1));
  }
  return element.tagName === selector.toUpperCase();
}

function createDocument(root) {
  const document = {
    activeElement: null,
    createElement(tagName) {
      const element = new EventTarget();
      element.nodeType = 1;
      element.tagName = tagName.toUpperCase();
      element.value = "";
      // Real inputs always have `checked`; the framework only syncs it when
      // the property exists.
      if (element.tagName === "INPUT") element.checked = false;
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
        next.parentNode = this;
        return previous;
      };
      element.appendChild = function (child) {
        this.childNodes.push(child);
        child.parentNode = this;
        return child;
      };
      element.closest = function (selector) {
        let node = this;
        while (node && !matches(node, selector)) node = node.parentNode;
        return node ?? null;
      };
      element.querySelector = function (selector) {
        for (const child of this.childNodes) {
          if (matches(child, selector)) return child;
          const found = child.nodeType === 1 && child.querySelector(selector);
          if (found) return found;
        }
        return null;
      };
      element.focus = function () {
        document.activeElement = this;
      };
      // Like a browser, blur() on the focused element fires a "blur" event.
      element.blur = function () {
        if (document.activeElement !== this) return;
        document.activeElement = null;
        this.dispatchEvent(new Event("blur"));
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
  return document;
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

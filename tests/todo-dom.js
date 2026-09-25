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

// Installs the fake `document` and `window` and mounts the app. Each test file
// runs in its own process, so the app and its state start fresh per file.
export async function mountTodoApp() {
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
  globalThis.window = {
    location: { hash: "#/" },
    addEventListener() {},
  };

  await import("../todo/app.js");

  return {
    page: () => root.childNodes[0],
    restore() {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    },
  };
}

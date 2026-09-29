import { isEvent, setEventHandler } from "./events.js";

const mountedTrees = new WeakMap();
// Present means "on" whatever the value (`disabled="false"` is still disabled),
// so `false`/`null`/`undefined` remove the attribute and a string is written as given.
const booleanAttributes = new Set([
  "allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls",
  "default", "defer", "disabled", "formnovalidate", "hidden", "inert", "ismap",
  "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline",
  "readonly", "required", "reversed", "selected",
]);

// The property can differ from the attribute (a ticked checkbox leaves the
// attribute alone), so these are also written as properties and re-synced on
// every render. The other boolean attributes are reflected by the browser.
const booleanProperties = new Set(["checked", "disabled", "selected", "muted"]);

function isOn(value) {
  return value !== false && value != null;
}

function normalizeChildren(children) {
  const list = Array.isArray(children) ? children : [children];
  return list.flat(Infinity).filter((child) => child != null && typeof child !== "boolean");
}

function getKey(child) {
  return typeof child === "object" ? child.attrs?.key : undefined;
}

// Compared like Map keys: 1 and "1" are different.
function checkUniqueKeys(children) {
  const seen = new Set();
  for (const child of children) {
    const key = getKey(child);
    if (key == null) continue;
    if (seen.has(key)) {
      throw new Error(`HHT.js: Duplicate key "${String(key)}" found among sibling elements.`);
    }
    seen.add(key);
  }
}

// Checked before any DOM work so `onClick: enabled && save` fails at once
// instead of silently attaching nothing.
function checkEventHandlers(attrs) {
  if (attrs == null) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (isEvent(name) && value != null && typeof value !== "function") {
      throw new Error(`HHT.js: Event handler "${name}" must be a function, null, or undefined.`);
    }
  }
}

function checkRef(ref) {
  if (ref != null && typeof ref !== "function") {
    throw new Error("HHT.js: ref must be a function, null, or undefined.");
  }
}

function isStyleObject(style) {
  return typeof style === "object" && style !== null && !Array.isArray(style);
}

function checkStyle(style) {
  if (style != null && typeof style !== "string" && !isStyleObject(style)) {
    throw new Error("HHT.js: style must be a string, object, null, or undefined.");
  }
}

// Ref calls are collected while the DOM is built or patched and run once
// render(), mount() or unmount() has finished, so a ref sees its element in
// place. All ref(null) calls run first, so a callback moved from an old
// element to a new one ends up holding the new one.
let refCleanups = [];
let refAssignments = [];

function resetRefs() {
  refCleanups = [];
  refAssignments = [];
}

function flushRefs() {
  const cleanups = refCleanups;
  const assignments = refAssignments;
  resetRefs();
  for (const ref of cleanups) ref(null);
  for (const [ref, element] of assignments) ref(element);
}

// Children before parents.
function releaseRefs(tree) {
  if (typeof tree !== "object") return;
  for (const child of tree.children) releaseRefs(child);
  if (tree.attrs.ref) refCleanups.push(tree.attrs.ref);
}

// Custom properties ("--player-x") only work through setProperty(). No units
// are ever added.
function setStyleProperty(style, name, value) {
  if (value == null) removeStyleProperty(style, name);
  else if (name.startsWith("--")) style.setProperty(name, String(value));
  else style[name] = value;
}

function removeStyleProperty(style, name) {
  if (name.startsWith("--")) style.removeProperty(name);
  else style[name] = "";
}

// Only removes styles the previous `style` value set, so properties written
// through a ref are left alone.
function updateStyle(element, oldStyle, newStyle) {
  if (oldStyle === newStyle || (oldStyle == null && newStyle == null)) return;

  const oldIsObject = isStyleObject(oldStyle);

  if (!isStyleObject(newStyle)) {
    if (typeof newStyle === "string") {
      element.setAttribute("style", newStyle); // replaces all inline styles
    } else if (oldIsObject) {
      for (const name of Object.keys(oldStyle)) removeStyleProperty(element.style, name);
    } else {
      element.removeAttribute("style"); // old value was a string
    }
    return;
  }

  if (typeof oldStyle === "string") element.removeAttribute("style");
  const previous = oldIsObject ? oldStyle : {};

  for (const name of Object.keys(previous)) {
    if (!Object.hasOwn(newStyle, name)) removeStyleProperty(element.style, name);
  }
  for (const [name, value] of Object.entries(newStyle)) {
    if (value !== previous[name]) setStyleProperty(element.style, name, value);
  }
}

function removeDomAttribute(element, name) {
  if (booleanProperties.has(name) && name in element) element[name] = false;
  if (name === "value" && "value" in element) element.value = "";
  element.removeAttribute(name);
}

function setDomAttribute(element, name, value) {
  if (booleanAttributes.has(name)) {
    const on = isOn(value);
    if (booleanProperties.has(name) && name in element) element[name] = on;
    if (!on) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? "" : value);
  } else if (value == null) {
    removeDomAttribute(element, name);
  } else if (name === "value" && "value" in element) {
    element.value = String(value);
    element.setAttribute(name, value);
  } else {
    element.setAttribute(name, value);
  }
}

export function createElement(tag, attrs = {}, children = []) {
  checkRef(attrs?.ref);
  checkStyle(attrs?.style);
  checkEventHandlers(attrs);
  const normalized = normalizeChildren(children);
  checkUniqueKeys(normalized);
  return {
    tag,
    attrs,
    children: normalized,
  };
}

export function renderElement(node) {
  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }

  const element = document.createElement(node.tag);

  for (const [name, value] of Object.entries(node.attrs)) {
    if (name === "key" || name === "ref" || name === "style") continue;
    if (isEvent(name)) {
      setEventHandler(element, name, value);
    } else {
      setDomAttribute(element, name, value);
    }
  }
  updateStyle(element, undefined, node.attrs.style);

  for (const child of node.children) {
    element.appendChild(renderElement(child));
  }

  if (node.attrs.ref) refAssignments.push([node.attrs.ref, element]);

  return element;
}

// Resolves to the element itself, so render history is kept per element:
// "#app" and document.querySelector("#app") are the same root.
function getRoot(target) {
  if (typeof target === "string") {
    let root;
    try {
      root = document.querySelector(target);
    } catch {
      throw new Error(`HHT.js: Mount target "${target}" is not a valid CSS selector.`);
    }

    if (!root) {
      throw new Error(`HHT.js: Mount target "${target}" was not found.`);
    }

    return root;
  }

  // nodeType 1 = element; not `instanceof Element`, so other frames work too.
  if (target !== null && typeof target === "object" && target.nodeType === 1) {
    return target;
  }

  throw new Error("HHT.js: Mount target must be a CSS selector string or a DOM element.");
}

function replaceNode(parent, currentNode, previousTree, nextTree) {
  releaseRefs(previousTree);
  const nextNode = renderElement(nextTree);
  parent.replaceChild(nextNode, currentNode);
  return nextNode;
}

function updateAttributes(element, previous = {}, next = {}) {
  for (const [name, value] of Object.entries(previous)) {
    if (name === "key" || name === "ref" || name === "style" || Object.hasOwn(next, name)) continue;

    if (isEvent(name)) {
      setEventHandler(element, name, null);
    } else {
      removeDomAttribute(element, name);
    }
  }

  updateStyle(element, previous.style, next.style);

  for (const [name, value] of Object.entries(next)) {
    if (name === "key" || name === "ref" || name === "style") continue;
    const oldValue = previous[name];
    if (oldValue === value) {
      if (name === "value" && "value" in element && element.value !== (value == null ? "" : String(value))) {
        element.value = value == null ? "" : String(value);
      } else if (booleanProperties.has(name) && name in element && element[name] !== isOn(value)) {
        element[name] = isOn(value);
      }
      continue;
    }

    if (isEvent(name)) {
      setEventHandler(element, name, value);
    } else {
      setDomAttribute(element, name, value);
    }
  }
}

// moveBefore() keeps focus and other element state; insertBefore() is the fallback.
function moveNode(parent, node, reference) {
  if (typeof parent.moveBefore === "function" && node.isConnected) {
    parent.moveBefore(node, reference);
  } else {
    parent.insertBefore(node, reference);
  }
}

// Removed keys are dropped first, so deleting an item never moves its
// neighbours; then each new child is patched or created and moved into place
// only if it is not already there.
function patchKeyedChildren(element, previous, next) {
  const oldByKey = new Map();
  previous.forEach((tree, index) => {
    oldByKey.set(getKey(tree), { tree, node: element.childNodes[index] });
  });

  const nextKeys = new Set(next.map(getKey));
  for (const [key, old] of oldByKey) {
    if (!nextKeys.has(key)) {
      releaseRefs(old.tree);
      element.removeChild(old.node);
      oldByKey.delete(key);
    }
  }

  next.forEach((nextTree, index) => {
    const old = oldByKey.get(getKey(nextTree));
    const node = old
      ? patchNode(element, old.node, old.tree, nextTree)
      : renderElement(nextTree);
    const current = element.childNodes[index];

    if (current === node) return;
    if (!current) element.appendChild(node);
    else if (old) moveNode(element, node, current);
    else element.insertBefore(node, current);
  });
}

// Keyed only if every child, old and new, has a key; otherwise by position.
function isKeyedList(previous, next) {
  const all = [...previous, ...next];
  return all.length > 0 && all.every((child) => getKey(child) != null);
}

function patchChildren(element, previous = [], next = []) {
  if (isKeyedList(previous, next)) {
    patchKeyedChildren(element, previous, next);
    return;
  }

  previous.slice(next.length).forEach(releaseRefs);
  while (element.childNodes.length > next.length) {
    element.removeChild(element.childNodes[element.childNodes.length - 1]);
  }

  for (let index = 0; index < next.length; index += 1) {
    const currentNode = element.childNodes[index];

    if (!currentNode) {
      element.appendChild(renderElement(next[index]));
    } else {
      patchNode(element, currentNode, previous[index], next[index]);
    }
  }
}

function patchNode(parent, currentNode, previousTree, nextTree) {
  const previousIsText = typeof previousTree === "string" || typeof previousTree === "number";
  const nextIsText = typeof nextTree === "string" || typeof nextTree === "number";

  if (previousIsText && nextIsText && currentNode.nodeType === 3) {
    const text = String(nextTree);
    if (currentNode.textContent !== text) currentNode.textContent = text;
    return currentNode;
  }

  if (previousIsText || nextIsText) {
    return replaceNode(parent, currentNode, previousTree, nextTree);
  }

  if (previousTree.tag.toLowerCase() !== nextTree.tag.toLowerCase()) {
    return replaceNode(parent, currentNode, previousTree, nextTree);
  }

  updateAttributes(currentNode, previousTree.attrs, nextTree.attrs);
  patchChildren(currentNode, previousTree.children, nextTree.children);

  // Refs are only called again if the callback itself changed.
  const previousRef = previousTree.attrs.ref;
  const nextRef = nextTree.attrs.ref;
  if (previousRef !== nextRef) {
    if (previousRef) refCleanups.push(previousRef);
    if (nextRef) refAssignments.push([nextRef, currentNode]);
  }
  return currentNode;
}

export function mount(target, node) {
  const root = getRoot(target);
  resetRefs();
  root.appendChild(renderElement(node));
  flushRefs();
}

export function render(target, node) {
  const root = getRoot(target);
  const previousTree = mountedTrees.get(root);
  const currentNode = root.firstChild ?? root.childNodes[0];
  resetRefs();

  if (previousTree && currentNode) {
    patchNode(root, currentNode, previousTree, node);
    while (root.childNodes.length > 1) {
      root.removeChild(root.childNodes[root.childNodes.length - 1]);
    }
  } else {
    // Old content was removed from outside HHT.js.
    if (previousTree) releaseRefs(previousTree);
    root.replaceChildren(renderElement(node));
  }

  mountedTrees.set(root, node);
  flushRefs();
}

// Only refs from render() are released; mount() does not track its content.
export function unmount(target) {
  const root = getRoot(target);
  const previousTree = mountedTrees.get(root);
  resetRefs();
  if (previousTree) releaseRefs(previousTree);
  root.replaceChildren();
  mountedTrees.delete(root);
  flushRefs();
}

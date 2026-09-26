import { isEvent, addEvent } from "./events.js";

const mountedTrees = new WeakMap();
const booleanAttributes = new Set(["checked", "disabled", "selected"]);

function normalizeChildren(children) {
  const list = Array.isArray(children) ? children : [children];
  return list.flat(Infinity).filter((child) => child != null && typeof child !== "boolean");
}

// `key` identifies an element among its siblings. It is only read by the
// renderer and never becomes a DOM attribute. Text children have no key.
function getKey(child) {
  return typeof child === "object" ? child.attrs?.key : undefined;
}

// Keys are compared like Map keys, so 1 and "1" are different keys.
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

// `ref` is a callback that receives the real element. Like `key`, it is read
// by the renderer and never becomes a DOM attribute.
function checkRef(ref) {
  if (ref != null && typeof ref !== "function") {
    throw new Error("HHT.js: ref must be a function, null, or undefined.");
  }
}

// `style` is a CSS string (set as the whole attribute) or an object of
// properties (set one by one on element.style). Arrays are not style objects.
function isStyleObject(style) {
  return typeof style === "object" && style !== null && !Array.isArray(style);
}

function checkStyle(style) {
  if (style != null && typeof style !== "string" && !isStyleObject(style)) {
    throw new Error("HHT.js: style must be a string, object, null, or undefined.");
  }
}

// Ref calls are collected while the DOM is built or patched, and run when
// render(), mount() or unmount() has finished, so a ref always sees its
// element in place. All ref(null) cleanups run before the new ref(element)
// calls, so a callback moved from an old element to a new one ends up with
// the new one.
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

// Queues ref(null) for every ref in a removed tree, children before parents.
function releaseRefs(tree) {
  if (typeof tree !== "object") return;
  for (const child of tree.children) releaseRefs(child);
  if (tree.attrs.ref) refCleanups.push(tree.attrs.ref);
}

// Custom properties ("--player-x") only work through setProperty(). Values are
// written as given: HHT.js never adds units such as "px".
function setStyleProperty(style, name, value) {
  if (value == null) removeStyleProperty(style, name);
  else if (name.startsWith("--")) style.setProperty(name, String(value));
  else style[name] = value;
}

function removeStyleProperty(style, name) {
  if (name.startsWith("--")) style.removeProperty(name);
  else style[name] = "";
}

// Updates inline styles from the previous `style` value to the next one.
// Object to object only writes the properties that changed. HHT.js only
// removes styles that the previous `style` value set, so styles written
// through a ref on properties the vnode never mentions are left alone.
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
  if (booleanAttributes.has(name) && name in element) element[name] = false;
  if (name === "value" && "value" in element) element.value = "";
  element.removeAttribute(name);
}

function setDomAttribute(element, name, value) {
  if (value == null) {
    removeDomAttribute(element, name);
  } else if (booleanAttributes.has(name)) {
    const enabled = Boolean(value);
    if (name in element) element[name] = enabled;
    if (enabled) element.setAttribute(name, "");
    else element.removeAttribute(name);
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
      addEvent(element, name, value);
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

// A target is a CSS selector or a DOM element. Either way the result is the
// element itself, so render history (mountedTrees) is kept per element: "#app"
// and document.querySelector("#app") are the same root.
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

  // nodeType 1 = element. Checked by value (not `instanceof Element`) so
  // elements from other frames work too.
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
      element.removeEventListener(name.slice(2).toLowerCase(), value);
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
      } else if (booleanAttributes.has(name) && name in element && element[name] !== Boolean(value)) {
        element[name] = Boolean(value);
      }
      continue;
    }

    if (isEvent(name)) {
      if (oldValue) {
        element.removeEventListener(name.slice(2).toLowerCase(), oldValue);
      }
      addEvent(element, name, value);
    } else {
      setDomAttribute(element, name, value);
    }
  }
}

// Moves an existing child. moveBefore() (in newer browsers) keeps focus and
// other element state; insertBefore() is the fallback everywhere else.
function moveNode(parent, node, reference) {
  if (typeof parent.moveBefore === "function" && node.isConnected) {
    parent.moveBefore(node, reference);
  } else {
    parent.insertBefore(node, reference);
  }
}

// Keyed lists: match old and new children by key instead of by position.
// Removed keys are dropped first, so deleting an item never moves the items
// around it; then each new child is patched (same key) or created (new key)
// and moved into place only if it is not already there.
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

// A child list is keyed only if every child, old and new, has a key.
// Otherwise the whole list is compared by position, as before.
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

  // Same element kept: refs are only called if the callback itself changed.
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
    // The old content was removed from outside HHT.js: release its refs.
    if (previousTree) releaseRefs(previousTree);
    root.replaceChildren(renderElement(node));
  }

  mountedTrees.set(root, node);
  flushRefs();
}

// Empties the root (whether its content came from render() or mount()) and
// forgets its previous tree, so the next render() starts fresh. Refs in the
// rendered tree are called with null. The root element itself stays in the
// page. Safe to call on an empty root.
export function unmount(target) {
  const root = getRoot(target);
  const previousTree = mountedTrees.get(root);
  resetRefs();
  if (previousTree) releaseRefs(previousTree);
  root.replaceChildren();
  mountedTrees.delete(root);
  flushRefs();
}

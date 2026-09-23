import { isEvent, addEvent } from "./events.js";

const mountedTrees = new WeakMap();

export function createElement(tag, attrs = {}, children = []) {
  return {
    tag,
    attrs,
    children,
  };
}

export function renderElement(node) {
  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }

  const element = document.createElement(node.tag);

  for (const [name, value] of Object.entries(node.attrs)) {
    if (isEvent(name)) {
      addEvent(element, name, value);
    } else {
      element.setAttribute(name, value);
    }
  }

  for (const child of node.children) {
    element.appendChild(renderElement(child));
  }

  return element;
}

function getRoot(target) {
  const root = document.querySelector(target);

  if (!root) {
    throw new Error(`HHT.js: Mount target "${target}" was not found.`);
  }

  return root;
}

function replaceNode(parent, currentNode, nextTree) {
  const nextNode = renderElement(nextTree);
  parent.replaceChild(nextNode, currentNode);
  return nextNode;
}

function updateAttributes(element, previous = {}, next = {}) {
  for (const [name, value] of Object.entries(previous)) {
    if (Object.hasOwn(next, name)) continue;

    if (isEvent(name)) {
      element.removeEventListener(name.slice(2).toLowerCase(), value);
    } else {
      element.removeAttribute(name);
    }
  }

  for (const [name, value] of Object.entries(next)) {
    const oldValue = previous[name];
    if (oldValue === value) continue;

    if (isEvent(name)) {
      if (oldValue) {
        element.removeEventListener(name.slice(2).toLowerCase(), oldValue);
      }
      addEvent(element, name, value);
    } else if (name === "value" && "value" in element) {
      element.value = String(value);
      element.setAttribute(name, value);
    } else {
      element.setAttribute(name, value);
    }
  }
}

function patchChildren(element, previous = [], next = []) {
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
    return replaceNode(parent, currentNode, nextTree);
  }

  if (previousTree.tag.toLowerCase() !== nextTree.tag.toLowerCase()) {
    return replaceNode(parent, currentNode, nextTree);
  }

  updateAttributes(currentNode, previousTree.attrs, nextTree.attrs);
  patchChildren(currentNode, previousTree.children, nextTree.children);
  return currentNode;
}

export function mount(target, node) {
  getRoot(target).appendChild(renderElement(node));
}

export function render(target, node) {
  const root = getRoot(target);
  const previousTree = mountedTrees.get(root);
  const currentNode = root.firstChild ?? root.childNodes[0];

  if (previousTree && currentNode) {
    patchNode(root, currentNode, previousTree, node);
    while (root.childNodes.length > 1) {
      root.removeChild(root.childNodes[root.childNodes.length - 1]);
    }
  } else {
    root.replaceChildren(renderElement(node));
  }

  mountedTrees.set(root, node);
}

import { isEvent, addEvent } from "./events.js";

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

export function mount(target, node) {
  const root = document.querySelector(target);

  if (!root) {
    throw new Error(`HHT.js: Mount target "${target}" was not found.`);
  }

  root.appendChild(renderElement(node));
}

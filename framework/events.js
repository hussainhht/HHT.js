export function isEvent(name) {
  return name.startsWith("on");
}

export function addEvent(element, name, handler) {
  const eventName = name.slice(2).toLowerCase();

  element.addEventListener(eventName, handler);
}

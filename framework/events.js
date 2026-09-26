export function isEvent(name) {
  return name.startsWith("on");
}

export function addEvent(element, name, handler) {
  const eventName = name.slice(2).toLowerCase();

  element.addEventListener(eventName, handler);
}

// Listens to an event on any event target (window, document, an element...)
// and returns a function that stops listening. `options` is passed to the
// browser unchanged (boolean capture flag or { capture, once, passive, signal }).
export function on(target, eventName, handler, options) {
  if (
    target == null ||
    typeof target.addEventListener !== "function" ||
    typeof target.removeEventListener !== "function"
  ) {
    throw new Error("HHT.js: Event target must support addEventListener() and removeEventListener().");
  }
  if (typeof eventName !== "string" || eventName === "") {
    throw new Error("HHT.js: Event name must be a non-empty string.");
  }
  if (typeof handler !== "function") {
    throw new Error("HHT.js: Event handler must be a function.");
  }

  // A new wrapper per call, so registering the same handler twice gives two
  // independent listeners (the browser would otherwise ignore the second).
  // A normal function keeps `this` as the target, as with addEventListener.
  const listener = function (event) {
    return handler.call(this, event);
  };
  target.addEventListener(eventName, listener, options);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    target.removeEventListener(eventName, listener, options);
  };
}

export function isEvent(name) {
  return name.startsWith("on");
}

// Declarative handlers (`onClick: fn`). Each element gets one stable native
// listener per `on…` attribute, which calls whatever handler the latest render
// passed. A new function on every render (an inline arrow) then only updates
// `record.handler`, instead of removing and re-adding the browser listener.
// The WeakMap does not keep removed elements alive.
const handlersByElement = new WeakMap();

// Sets the handler for the `on…` attribute `name` ("onClick") on `element`:
// a function attaches or updates it, null/undefined removes it.
export function setEventHandler(element, name, handler) {
  const eventName = name.slice(2).toLowerCase();
  let records = handlersByElement.get(element);
  const record = records?.get(name);

  if (handler == null) {
    if (record) {
      element.removeEventListener(eventName, record.listener);
      records.delete(name);
    }
  } else if (record) {
    record.handler = handler;
  } else {
    const newRecord = { handler, listener: null };
    // A normal function keeps `this` as the element, as with addEventListener.
    newRecord.listener = function (event) {
      return newRecord.handler.call(this, event);
    };
    if (!records) {
      records = new Map();
      handlersByElement.set(element, records);
    }
    records.set(name, newRecord);
    element.addEventListener(eventName, newRecord.listener);
  }
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

export function isEvent(name) {
  return name.startsWith("on");
}

// One stable native listener per `on…` attribute, calling whatever handler the
// latest render passed: a new inline arrow each render only updates
// `record.handler` instead of removing and re-adding the listener.
// A WeakMap, so removed elements are not kept alive.
const handlersByElement = new WeakMap();

// A function attaches or updates the handler; null/undefined removes it.
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

// `options` is passed to the browser unchanged. Returns a function that stops
// listening.
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

  // A new wrapper per call: the browser would ignore a second registration of
  // the same function, but each on() call should be independent.
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

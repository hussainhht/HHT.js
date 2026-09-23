export function state(initialValue) {
  let value = initialValue;

  const listeners = [];

  return {
    get() {
      return value;
    },

    set(newValue) {
      if (typeof newValue === "function") {
        value = newValue(value);
      } else {
        value = newValue;
      }

      for (const listener of listeners) {
        listener(value);
      }
    },

    subscribe(listener) {
      listeners.push(listener);
    },
  };
}

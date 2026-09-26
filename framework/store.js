export function state(initialValue) {
  let value = initialValue;

  // One record per subscribe() call, so subscribing the same function twice
  // gives two independent subscriptions. The array is replaced, never
  // mutated, so a notification loop that is already running is not affected
  // by listeners being added or removed during it.
  let subscriptions = [];

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

      // Listeners added during this loop start with the next set(); listeners
      // removed during it are skipped from that point on.
      for (const subscription of subscriptions) {
        if (subscription.active) subscription.listener(value);
      }
    },

    // Returns a function that removes this subscription. Calling it again
    // does nothing.
    subscribe(listener) {
      const subscription = { listener, active: true };
      subscriptions = [...subscriptions, subscription];

      return () => {
        subscription.active = false;
        subscriptions = subscriptions.filter((item) => item !== subscription);
      };
    },
  };
}

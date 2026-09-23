import { appState, counterState } from "./state.js";

export function increaseCount() {
  counterState.set((current) => ({
    ...current,
    count: current.count + 1,
  }));
}

export function decreaseCount() {
  counterState.set((current) => ({
    ...current,
    count: current.count - 1,
  }));
}

export function resetCount() {
  counterState.set((current) => ({
    ...current,
    count: 0,
  }));
}

export function setMessage(message) {
  appState.set((current) => ({
    ...current,
    message,
  }));
}

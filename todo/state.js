import { state } from "../framework/index.js";

export const appState = state({ title: "Hello HHT.js", message: "" });
export const counterState = state({ count: 0 });

// The current filter is not stored here; it comes from the router.
export const todoState = state({ todos: [], editingId: null });

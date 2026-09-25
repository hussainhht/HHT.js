import { state } from "../framework/store.js";

export const appState = state({ title: "Hello HHT.js", message: "" });
export const counterState = state({ count: 0 });

// TodoMVC state, following the Stage 12 design in the README: the todo list
// plus the ID of the todo being edited (kept out of the todo objects). The
// current filter is not stored here; it comes from the router.
export const todoState = state({ todos: [], editingId: null });

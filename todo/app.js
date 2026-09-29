import { createRouter, render } from "../framework/index.js";
import { routePaths } from "./routes.js";
import { todoState } from "./state.js";
import { loadTodos, saveTodos } from "./storage.js";
import { createTodoPage } from "./view.js";

const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path));

function renderApp() {
  render("#app", router.getCurrentView(createTodoPage));
}

// Before anything subscribes, so startup triggers neither a render nor a save.
todoState.set((current) => ({
  ...current,
  todos: loadTodos(),
  editingId: null,
}));

// Actions build a new array whenever the list changes, so a reference check
// skips saves for edit-mode-only updates.
let savedTodos = todoState.get().todos;
todoState.subscribe(({ todos }) => {
  if (todos === savedTodos) return;
  savedTodos = todos;
  saveTodos(todos);
});

todoState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();

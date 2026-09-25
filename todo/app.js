import { render } from "../framework/dom.js";
import { createRouter } from "../framework/router.js";
import { routePaths } from "./routes.js";
import { todoState } from "./state.js";
import { loadTodos, saveTodos } from "./storage.js";
import { createTodoPage } from "./view.js";

const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path));

function renderApp() {
  render("#app", router.getCurrentView(createTodoPage));
}

// Restore saved todos before anything subscribes, so startup doesn't trigger
// a render or a save. Edit mode always starts off.
todoState.set((current) => ({
  ...current,
  todos: loadTodos(),
  editingId: null,
}));

// Actions always build a new todos array when the list changes, so comparing
// references is enough to skip saves for edit-mode-only updates.
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

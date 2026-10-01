import { createRouter, render } from "../framework/index.js";
import { routePaths } from "./routes.js";
import { themeState, todoState } from "./state.js";
import { loadTheme, loadTodos, saveTheme, saveTodos } from "./storage.js";
import { createTodoPage } from "./view.js";

const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path));

function renderApp() {
  render("#app", router.getCurrentView(createTodoPage));
}

// The stylesheet reads the theme from <html>, outside the rendered tree.
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// Before anything subscribes, so startup triggers neither a render nor a save.
todoState.set((current) => ({
  ...current,
  todos: loadTodos(),
  editingId: null,
}));
themeState.set({ theme: loadTheme() });
applyTheme(themeState.get().theme);

// Actions build a new array whenever the list changes, so a reference check
// skips saves for edit-mode-only updates.
let savedTodos = todoState.get().todos;
todoState.subscribe(({ todos }) => {
  if (todos === savedTodos) return;
  savedTodos = todos;
  saveTodos(todos);
});

// Saved only when the user switches it, so a visitor who never chooses keeps
// following the system setting.
themeState.subscribe(({ theme }) => {
  applyTheme(theme);
  saveTheme(theme);
});

todoState.subscribe(renderApp);
themeState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();

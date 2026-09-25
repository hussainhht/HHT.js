// Saves todos to localStorage so they survive a refresh. This is app code,
// not part of the framework: the framework's store knows nothing about
// storage, and app.js connects the two.
//
// Only the todo list is saved. Edit mode is UI state and should not come back
// after a refresh, and the current filter already survives in the URL hash.

// TodoMVC implementations use a "todos-<framework>" key.
const STORAGE_KEY = "todos-hhtjs";

function isTodo(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.completed === "boolean"
  );
}

// localStorage only holds strings, so todos are stored as JSON. Reading it can
// fail in several ways (storage disabled or blocked, a value that isn't
// JSON, data from an older format), and in each case the app should simply
// start with no todos rather than crash.
export function loadTodos() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isTodo) : [];
  } catch {
    return [];
  }
}

// Writing can fail too (storage full, blocked, or unavailable). The app keeps
// working in memory; the todos just won't survive a refresh.
export function saveTodos(todos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Nothing useful to do here; see above.
  }
}

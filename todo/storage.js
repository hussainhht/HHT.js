// App code, not framework: only the todo list is saved. Edit mode is not
// restored and the filter already lives in the URL hash.

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

// Blocked storage, invalid JSON or an older format all mean: start empty.
export function loadTodos() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isTodo) : [];
  } catch {
    return [];
  }
}

export function saveTodos(todos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Storage full or blocked: the app keeps working in memory.
  }
}

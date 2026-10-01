// App code, not framework: only the todo list and the theme are saved. Edit
// mode is not restored and the filter already lives in the URL hash.

const STORAGE_KEY = "todos-hhtjs";
// Also read and written by docs.html, so both pages share one choice.
const THEME_KEY = "theme-hhtjs";

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

// A saved choice wins; until there is one, the system setting decides. Blocked
// storage or an unknown value also mean: follow the system.
export function loadTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the system setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage full or blocked: the theme only lasts until the page is closed.
  }
}

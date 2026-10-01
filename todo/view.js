import { createElement } from "../framework/index.js";
import {
  addTodo,
  cancelEditing,
  clearCompleted,
  createTodo,
  deleteTodo,
  saveEdit,
  startEditing,
  toggleAll,
  toggleTheme,
  toggleTodo,
} from "./actions.js";
import { routePaths } from "./routes.js";
import { themeState, todoState } from "./state.js";

export function createTodoApp(children = []) {
  return createElement("section", { class: "todoapp" }, children);
}

export function createHeader() {
  return createElement("header", { class: "header" }, [
    createElement("h1", {}, ["todos"]),
    createNewTodoInput(),
  ]);
}

// Uncontrolled input: the typed text lives only in the DOM element.
function getNewTodoText(event) {
  return event.target.value;
}

// `isComposing`: Enter confirms an input-method character, not the todo.
function handleNewTodoKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  const text = getNewTodoText(event).trim();
  if (text === "") return;

  // Cleared first so it doesn't depend on the render keeping this element.
  event.target.value = "";
  addTodo(createTodo(text));
}

export function createNewTodoInput() {
  return createElement("input", {
    class: "new-todo",
    placeholder: "What needs to be done?",
    autofocus: "",
    onKeydown: handleNewTodoKeydown,
  });
}

export function createMainSection(
  children = [],
  { allCompleted = false } = {},
) {
  return createElement("section", { class: "main" }, [
    createElement("input", {
      id: "toggle-all",
      class: "toggle-all",
      type: "checkbox",
      checked: allCompleted,
      onChange: toggleAll,
    }),
    createElement("label", { for: "toggle-all" }, ["Mark all as complete"]),
    children,
  ]);
}

export function createTodoList(items = []) {
  return createElement("ul", { class: "todo-list" }, items);
}

// Only used as the edit input's `ref` while editing: the ref changes from null
// to this function when editing starts, so the input is focused once visible.
function focusElement(element) {
  element?.focus();
}

// Browsers keep focus on an input that gets hidden, so it is blurred by hand.
function handleEditKeydown(event, id) {
  if (event.isComposing) return;
  if (event.key === "Enter") saveEdit(id, event.target.value);
  else if (event.key === "Escape") cancelEditing();
  else return;
  event.target.blur();
}

// After Enter or Escape the todo is no longer being edited, so the blur that
// follows must not save again (after Escape it would save discarded text).
function handleEditBlur(event, id) {
  if (todoState.get().editingId !== id) return;
  saveEdit(id, event.target.value);
}

export function createTodoItem(todo, isEditing = false) {
  const classes = [todo.completed && "completed", isEditing && "editing"]
    .filter(Boolean)
    .join(" ");
  return createElement(
    "li",
    { key: todo.id, "data-id": todo.id, class: classes || null },
    [
      createElement("div", { class: "view" }, [
        createElement("input", {
          class: "toggle",
          type: "checkbox",
          checked: todo.completed,
          onChange: () => toggleTodo(todo.id),
        }),
        createElement("label", { onDblclick: () => startEditing(todo.id) }, [
          todo.text,
        ]),
        createElement("button", {
          class: "destroy",
          onClick: () => deleteTodo(todo.id),
        }),
      ]),
      // Controlled on purpose: a cancelled edit is reset by the next render.
      createElement("input", {
        class: "edit",
        ref: isEditing ? focusElement : null,
        value: todo.text,
        onKeydown: (event) => handleEditKeydown(event, todo.id),
        onBlur: (event) => handleEditBlur(event, todo.id),
      }),
    ],
  );
}

export function createFooter(children = []) {
  return createElement("footer", { class: "footer" }, children);
}

export function createTodoCount(count) {
  return createElement("span", { class: "todo-count" }, [
    createElement("strong", {}, [count]),
    count === 1 ? " item left" : " items left",
  ]);
}

const filterLinks = [
  { label: "All", path: routePaths.home },
  { label: "Active", path: routePaths.active },
  { label: "Completed", path: routePaths.completed },
];

export function createFilters(currentRoute = routePaths.home) {
  return createElement(
    "ul",
    { class: "filters" },
    filterLinks.map(({ label, path }) =>
      createElement("li", {}, [
        createElement(
          "a",
          {
            href: `#${path}`,
            class: path === currentRoute ? "selected" : null,
          },
          [label],
        ),
      ]),
    ),
  );
}

export function createClearCompleted(completedCount) {
  if (completedCount === 0) return null;
  return createElement(
    "button",
    { class: "clear-completed", onClick: clearCompleted },
    ["Clear completed"],
  );
}

export function createInfoFooter() {
  return createElement("footer", { class: "info" }, [
    createElement("p", {}, ["Double-click to edit a todo"]),
  ]);
}

// A switch: `aria-pressed` carries the state, so the label stays "Dark mode".
export function createThemeToggle(theme = "light") {
  return createElement(
    "button",
    {
      class: "theme-toggle",
      type: "button",
      "aria-pressed": String(theme === "dark"),
      onClick: toggleTheme,
    },
    [
      createElement("span", { class: "theme-toggle-track" }),
      createElement("span", { class: "theme-toggle-label" }, ["Dark mode"]),
    ],
  );
}

// Only filters what is rendered; state keeps every todo.
function filterTodos(todos, route) {
  if (route === routePaths.active) {
    return todos.filter((todo) => !todo.completed);
  }
  if (route === routePaths.completed) {
    return todos.filter((todo) => todo.completed);
  }
  return todos;
}

// render() takes a single root, so the app and info footer share a div.
export function createTodoPage(route = routePaths.home) {
  const { todos, editingId } = todoState.get();
  const { theme } = themeState.get();
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;
  const allCompleted = todos.length > 0 && activeCount === 0;

  if (route == routePaths.husaain) {
    return createElement("h1", {}, "hello hussain");
  }

  return createElement("div", {}, [
    createThemeToggle(theme),
    createTodoApp([
      createHeader(),
      createMainSection(
        [
          createTodoList(
            filterTodos(todos, route).map((todo) =>
              createTodoItem(todo, todo.id === editingId),
            ),
          ),
        ],
        { allCompleted },
      ),
      createFooter([
        createTodoCount(activeCount),
        createFilters(route),
        createClearCompleted(completedCount),
      ]),
    ]),
    createInfoFooter(),
  ]);
}

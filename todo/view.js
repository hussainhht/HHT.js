import { createElement } from "../framework/dom.js";
import { addTodo, createTodo } from "./actions.js";
import { routePaths } from "./routes.js";
import { todoState } from "./state.js";

// Root of the TodoMVC layout. TodoMVC CSS targets `section.todoapp`,
// so the class name must match exactly. Children are added in later steps.
export function createTodoApp(children = []) {
  return createElement("section", { class: "todoapp" }, children);
}

// TodoMVC puts the title and the new-todo input side by side inside
// `header.header`.
export function createHeader() {
  return createElement("header", { class: "header" }, [
    createElement("h1", {}, ["todos"]),
    createNewTodoInput(),
  ]);
}

// The new-todo input is uncontrolled: what the user types lives only in the
// DOM element, not in state, and is read from the event when it is needed.
function getNewTodoText(event) {
  return event.target.value;
}

// Only Enter submits. `isComposing` is true while an input method (e.g. for
// Japanese or Chinese) is still building a character, where Enter confirms
// the character rather than the todo.
function handleNewTodoKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  // Trimmed so "  buy milk " is saved cleanly and whitespace-only input
  // counts as empty.
  const text = getNewTodoText(event).trim();
  if (text === "") return;

  // Cleared before the state update: adding the todo re-renders the page, so
  // clearing first doesn't depend on the render keeping this same element.
  event.target.value = "";
  addTodo(createTodo(text));
}

// Input for adding todos. `input.new-todo` is the class TodoMVC CSS and
// tests look for.
export function createNewTodoInput() {
  return createElement("input", {
    class: "new-todo",
    placeholder: "What needs to be done?",
    autofocus: "",
    onKeydown: handleNewTodoKeydown,
  });
}

// Middle part of the app. In TodoMVC, `section.main` holds the toggle-all
// checkbox (id + label pair) followed by the todo list, passed in as children.
export function createMainSection(children = []) {
  return createElement("section", { class: "main" }, [
    createElement("input", {
      id: "toggle-all",
      class: "toggle-all",
      type: "checkbox",
    }),
    createElement("label", { for: "toggle-all" }, ["Mark all as complete"]),
    children,
  ]);
}

// `ul.todo-list` goes inside the main section; each todo becomes an `li`
// passed in as children.
export function createTodoList(items = []) {
  return createElement("ul", { class: "todo-list" }, items);
}

// One todo row, following TodoMVC markup: a `.view` with checkbox, label and
// delete button, plus a hidden `.edit` input used later for editing.
// `completed` class drives the strikethrough styling; `editing` swaps the
// `.view` for the `.edit` input.
export function createTodoItem(todo, isEditing = false) {
  const classes = [todo.completed && "completed", isEditing && "editing"]
    .filter(Boolean)
    .join(" ");
  return createElement("li", { "data-id": todo.id, class: classes || null }, [
    createElement("div", { class: "view" }, [
      createElement("input", {
        class: "toggle",
        type: "checkbox",
        checked: todo.completed,
      }),
      createElement("label", {}, [todo.text]),
      createElement("button", { class: "destroy" }),
    ]),
    createElement("input", { class: "edit", value: todo.text }),
  ]);
}

// Bottom bar of the app. `footer.footer` holds the item counter, the filter
// links and the clear-completed button, passed in as children.
export function createFooter(children = []) {
  return createElement("footer", { class: "footer" }, children);
}

// "N items left" counter. TodoMVC wraps the number in `strong` inside
// `span.todo-count`, and uses "item" for exactly one.
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

// Filter links as `ul.filters`. The link for the current route gets the
// `selected` class, which TodoMVC CSS uses to draw the highlight border.
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

// `button.clear-completed` sits at the right of the footer. TodoMVC only
// shows it when at least one todo is completed, so return nothing otherwise.
export function createClearCompleted(completedCount) {
  if (completedCount === 0) return null;
  return createElement("button", { class: "clear-completed" }, [
    "Clear completed",
  ]);
}

// Info text below the app. It is a sibling of `section.todoapp`, not a
// child, and uses `footer.info` for its styling.
export function createInfoFooter() {
  return createElement("footer", { class: "info" }, [
    createElement("p", {}, ["Double-click to edit a todo"]),
  ]);
}

// Full TodoMVC page. `render` mounts a single root, so the app and the info
// footer are wrapped in a plain div.
export function createTodoPage(route = routePaths.home) {
  const { todos } = todoState.get();
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return createElement("div", {}, [
    createTodoApp([
      createHeader(),
      createMainSection([
        createTodoList(todos.map((todo) => createTodoItem(todo))),
      ]),
      createFooter([
        createTodoCount(activeCount),
        createFilters(route),
        createClearCompleted(completedCount),
      ]),
    ]),
    createInfoFooter(),
  ]);
}

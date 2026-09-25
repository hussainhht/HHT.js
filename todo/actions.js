import { appState, counterState, todoState } from "./state.js";

export function increaseCount() {
  counterState.set((current) => ({
    ...current,
    count: current.count + 1,
  }));
}

export function decreaseCount() {
  counterState.set((current) => ({
    ...current,
    count: current.count - 1,
  }));
}

export function resetCount() {
  counterState.set((current) => ({
    ...current,
    count: 0,
  }));
}

export function setMessage(message) {
  appState.set((current) => ({
    ...current,
    message,
  }));
}

// Todo IDs must stay unique across page reloads once todos are saved, so a
// counter that restarts at 1 is not enough. Timestamp + random suffix is
// unique in practice and, unlike crypto.randomUUID(), also works when the
// page is served over plain http from a non-localhost address.
function createTodoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Builds a todo in the shape described in the README: { id, text, completed }.
export function createTodo(text) {
  return { id: createTodoId(), text, completed: false };
}

// New todos go at the end of the list, as in TodoMVC.
export function addTodo(todo) {
  todoState.set((current) => ({
    ...current,
    todos: [...current.todos, todo],
  }));
}

// Flips `completed` on the todo with this ID. Every other todo keeps the same
// object; the changed one is copied so state is never mutated in place.
export function toggleTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  }));
}

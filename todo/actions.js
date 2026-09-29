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

// Unique across reloads (a counter would restart). Not crypto.randomUUID(),
// which is unavailable over plain http from a non-localhost address.
function createTodoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTodo(text) {
  return { id: createTodoId(), text, completed: false };
}

export function addTodo(todo) {
  todoState.set((current) => ({
    ...current,
    todos: [...current.todos, todo],
  }));
}

export function toggleTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  }));
}

// Also ends edit mode if this todo was being edited.
export function deleteTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.filter((todo) => todo.id !== id),
    editingId: current.editingId === id ? null : current.editingId,
  }));
}

export function clearCompleted() {
  todoState.set((current) => {
    const todos = current.todos.filter((todo) => !todo.completed);
    const editingKept = todos.some((todo) => todo.id === current.editingId);
    return {
      ...current,
      todos,
      editingId: editingKept ? current.editingId : null,
    };
  });
}

// Acts on every todo, not just the ones the current filter shows.
export function toggleAll() {
  todoState.set((current) => {
    const completed = !current.todos.every((todo) => todo.completed);
    return {
      ...current,
      todos: current.todos.map((todo) =>
        todo.completed === completed ? todo : { ...todo, completed },
      ),
    };
  });
}

export function startEditing(id) {
  todoState.set((current) => ({ ...current, editingId: id }));
}

export function cancelEditing() {
  todoState.set((current) => ({ ...current, editingId: null }));
}

// A todo edited down to nothing is deleted, as TodoMVC requires.
export function saveEdit(id, text) {
  const trimmed = text.trim();
  if (trimmed === "") {
    deleteTodo(id);
    return;
  }
  todoState.set((current) => ({
    ...current,
    todos: current.todos.map((todo) =>
      todo.id === id ? { ...todo, text: trimmed } : todo,
    ),
    editingId: null,
  }));
}

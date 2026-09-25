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

// Removes the todo with this ID. If it was the one being edited, edit mode
// ends too, so `editingId` never points at a todo that no longer exists.
export function deleteTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.filter((todo) => todo.id !== id),
    editingId: current.editingId === id ? null : current.editingId,
  }));
}

// Removes every completed todo and keeps the active ones in their order. Like
// deleteTodo, it ends edit mode if the todo being edited was removed.
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

// Toggle-all: if every todo is already completed, make them all active;
// otherwise complete them all. It acts on every todo, not just the ones the
// current filter shows, as in TodoMVC.
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

// Edit mode: `editingId` names the one todo being edited (null for none).
export function startEditing(id) {
  todoState.set((current) => ({ ...current, editingId: id }));
}

// Leaves edit mode without saving; the todo keeps its old text.
export function cancelEditing() {
  todoState.set((current) => ({ ...current, editingId: null }));
}

// Saves an edit and leaves edit mode. The text is trimmed, and a todo edited
// down to nothing is deleted, as TodoMVC requires.
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

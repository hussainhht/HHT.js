# Stage 11 — TodoMVC Study Notes

This document records the behavior and structure that HHT.js should reproduce when the TodoMVC application is built.

## Reference used

The study is based on the official TodoMVC application specification and the TodoMVC React example. The project requirement also says the TodoMVC implementation must be a functional copy and that non-visual details such as IDs and classes matter.

## 1. What the application can do

The TodoMVC application supports the following user actions and behaviors:

- Add a new todo by typing in the main input and pressing **Enter**.
- Ignore a new todo if, after trimming whitespace, the title is empty.
- Mark one todo as completed or active with its checkbox.
- Mark all todos completed or active with the toggle-all control.
- Delete a todo with the destroy button.
- Enter edit mode by double-clicking a todo label.
- Save an edit with **Enter**.
- Save an edit when the edit input loses focus (`blur`).
- Cancel an edit with **Escape**, restoring the previous title.
- Delete a todo if an edited title becomes empty after trimming.
- Filter todos by **All**, **Active**, and **Completed**.
- Show which filter is currently selected.
- Show the number of active todos remaining.
- Use singular/plural counter text correctly: `1 item left`, otherwise `N items left`.
- Show **Clear completed** only when completed todos exist.
- Remove all completed todos with **Clear completed** while leaving active todos untouched.
- Persist todos across refreshes using `localStorage`.
- Preserve the current route/filter after refresh.

## 2. Important HTML structure

A TodoMVC implementation should follow this general structure closely:

```html
<section class="todoapp">
  <header class="header">
    <h1>todos</h1>
    <input class="new-todo" placeholder="What needs to be done?" autofocus>
  </header>

  <section class="main">
    <input id="toggle-all" class="toggle-all" type="checkbox">
    <label for="toggle-all">Mark all as complete</label>

    <ul class="todo-list">
      <li>
        <div class="view">
          <input class="toggle" type="checkbox">
          <label>Todo title</label>
          <button class="destroy"></button>
        </div>
        <input class="edit">
      </li>
    </ul>
  </section>

  <footer class="footer">
    <span class="todo-count">
      <strong>1</strong> item left
    </span>

    <ul class="filters">
      <li><a class="selected" href="#/">All</a></li>
      <li><a href="#/active">Active</a></li>
      <li><a href="#/completed">Completed</a></li>
    </ul>

    <button class="clear-completed">Clear completed</button>
  </footer>
</section>

<footer class="info">
  <p>Double-click to edit a todo</p>
</footer>
```

The exact implementation can vary by framework version, but the important TodoMVC classes, state classes, controls, routes, and behavior should be preserved.

## 3. Important classes

| Class | Purpose |
| --- | --- |
| `.todoapp` | Main TodoMVC application container. |
| `.header` | Contains the title and new-todo input. |
| `.new-todo` | Input used to create todos. |
| `.main` | Contains toggle-all and the todo list. Hidden/omitted when no todos exist. |
| `.toggle-all` | Checkbox/control for completing or activating every todo. |
| `.todo-list` | `<ul>` containing todo items. |
| `.view` | Normal read-mode content for a todo. |
| `.toggle` | Checkbox for one todo. |
| `.destroy` | Delete button for one todo; normally revealed on hover. |
| `.edit` | Input shown while editing a todo. |
| `.completed` | Applied to a todo `<li>` when that todo is completed. |
| `.editing` | Applied to a todo `<li>` while it is in edit mode. |
| `.footer` | Counter, filters, and clear-completed controls. |
| `.todo-count` | Remaining-active-items counter. |
| `.filters` | All / Active / Completed filter list. |
| `.selected` | Applied to the currently selected filter link. |
| `.clear-completed` | Button that removes all completed todos. |
| `.info` | Informational text beneath the application. |

## 4. Important IDs

The important ID used by the standard TodoMVC structure is:

```html
id="toggle-all"
```

It connects the toggle-all checkbox to its label using:

```html
<label for="toggle-all">...</label>
```

Some older TodoMVC templates use IDs such as `main` and `footer`; modern implementations commonly use the corresponding classes. For HHT.js, the final app should be checked against the exact reference/template used by the project auditor rather than inventing unnecessary IDs.

## 5. Filters and routes

TodoMVC has three filters:

| Filter | Hash route | Visible todos |
| --- | --- | --- |
| All | `#/` | Every todo |
| Active | `#/active` | Todos where `completed === false` |
| Completed | `#/completed` | Todos where `completed === true` |

The active filter link receives the `.selected` class.

Filtering must not delete todos from state. It only changes which todos are rendered. For example, if the user is on **Active** and completes an item, that item should immediately disappear from the Active view but remain in the application state.

## 6. Completed todo styling

When a todo is completed, its parent `<li>` receives:

```html
class="completed"
```

The standard TodoMVC CSS uses this state class to visually distinguish completed items, normally including a strike-through/muted appearance on the label.

If a todo becomes active again, the `.completed` class is removed.

## 7. Editing behavior

Editing starts when the todo's `<label>` is double-clicked.

While editing:

```html
<li class="editing">
```

The normal `.view` is hidden by TodoMVC styling and the `.edit` input is shown and focused. The input starts with the todo's current title.

Required edit behavior:

- **Enter** → trim and save the edited value, then leave edit mode.
- **Blur** → trim and save the edited value, then leave edit mode.
- **Escape** → cancel the edit and restore the old value.
- Empty value after trimming → delete the todo instead of saving an empty title.
- Editing state itself should not be persisted to `localStorage`.

## 8. Item counter

The counter counts only **active** todos, not total todos.

Examples:

```text
0 items left
1 item left
2 items left
```

The numeric value is inside `<strong>`:

```html
<span class="todo-count">
  <strong>2</strong> items left
</span>
```

Therefore the count can be derived from the todo array:

```js
activeCount = todos.filter(todo => !todo.completed).length;
```

It should not need to be stored as separate state.

## 9. Clear completed behavior

The `.clear-completed` button is visible only when at least one completed todo exists.

When clicked:

- all todos where `completed === true` are removed;
- active todos remain;
- the active-item counter updates;
- toggle-all state updates;
- the current route/filter continues to work.

When no completed todos remain, the button disappears.

## 10. Toggle-all behavior

The toggle-all control represents the aggregate completion state of the todo list.

Behavior:

- If not every todo is completed, activating toggle-all completes all todos.
- If every todo is completed, activating it again makes all todos active.
- When individual todos are changed, toggle-all must update too.
- It is checked when all existing todos are completed.
- After completed todos are cleared, its checked state must be recalculated.

## 11. When the todo list becomes empty

When there are no todos:

- the main todo-list section is hidden or not rendered;
- the footer containing the counter and filters is hidden or not rendered;
- the new-todo input remains visible so a new todo can be created;
- toggle-all is not shown as an active list control;
- clear-completed is not shown.

This keeps the empty application visually focused on the input.

## 12. Refresh / persistence behavior

Todos must survive a browser refresh through `localStorage`.

A todo should persist at least:

```js
{
  id: "unique-id",
  title: "Learn HHT.js",
  completed: false
}
```

The TodoMVC specification recommends keys equivalent to `id`, `title`, and `completed`. Edit-mode UI state should not be persisted.

The current filter route should also remain correct after refresh. For example, refreshing on `#/completed` should still display the Completed filter and mark it selected.

## 13. URL/filter checks

### `#/`

- Shows all todos.
- **All** has `.selected`.

### `#/active`

- Shows only incomplete todos.
- **Active** has `.selected`.
- Completing a visible todo removes it immediately from this filtered view without deleting it from state.

### `#/completed`

- Shows only completed todos.
- **Completed** has `.selected`.
- Making a completed todo active removes it immediately from this filtered view without deleting it from state.

A direct refresh on each route must restore the corresponding view.

## 14. What HHT.js needs to support for TodoMVC

From this study, TodoMVC will exercise all four required framework features:

```text
DOM abstraction
  -> create the TodoMVC element tree and state-dependent classes

Event handling
  -> keydown, input/change, click, double-click, blur

State management
  -> todos, completion, editing state, reactive rendering

Routing
  -> #/, #/active, #/completed and selected-filter rendering
```

The most important implementation rule for later stages is to keep derived information out of state where possible. Counts, `allCompleted`, `completedCount`, and filtered lists can all be calculated from the todo data and current route.

## Stage 11 result

All Stage 11 study tasks are complete. The information in this file should be used as the behavioral/structural reference when implementing Stages 12–22.

# HHT.js

HHT.js is a small JavaScript framework for building web pages, written from scratch with no dependencies. You describe the page with plain JavaScript objects; HHT.js creates the real elements and, when your state changes, updates only the parts of the page that differ.

The repository also contains a complete [TodoMVC](https://todomvc.com/) application built with HHT.js.

📖 **Full documentation: [docs/documentation.md](docs/documentation.md)**

## Core features

- **DOM abstraction**: `createElement(tag, attrs, children)` builds virtual nodes; attributes use their HTML names (`class`, `for`, `data-*`), with support for boolean attributes and inline styles (string or object).
- **Rendering with diffing**: `render(target, vnode)` builds the page the first time and patches only what changed afterwards. Keyed lists (`key`) and element refs (`ref`) are supported.
- **Events**: `onClick`, `onInput`, `onKeydown`, … next to the other attributes, plus `on(target, event, handler)` for `window`, `document` and other targets.
- **State**: `state(initialValue)` with `get()`, `set(value | updater)` and `subscribe(listener)`.
- **Routing**: `createRouter()`, a hash router for URLs such as `#/`, `#/active`, `#/completed`, with a built-in 404 view.

## Installation

Requires [Node.js](https://nodejs.org/) 20.19+ (or 22.12+).

```bash
npm install
```

## Running

```bash
npm run dev    # starts Vite; open the printed address (usually http://localhost:5173/)
npm test       # runs the test suite with Node's built-in test runner
```

A development server is needed because the framework is written as ES modules, which browsers don't load from `file://` pages.

## Basic example

```js
import { createElement, render, state } from "./framework/index.js";

const count = state(0);

function App() {
  return createElement("button", { onClick: () => count.set((n) => n + 1) }, [
    "Clicked ",
    count.get(),
    " times",
  ]);
}

function renderApp() {
  render("#app", App());
}

count.subscribe(renderApp); // re-render whenever the state changes
renderApp();                // first render
```

HHT.js uses **named exports only**, all from `framework/index.js`. There is no default export and no `hht` object. `state.set()` does not re-render on its own: you subscribe your render function, as above. The documentation explains why.

## Project structure

```text
mini-framework/
├── index.html            loads the TodoMVC app
├── package.json          scripts: dev, test
├── framework/            HHT.js
│   ├── index.js          public API (the only file apps import)
│   ├── dom.js            createElement, render, mount, unmount, diffing
│   ├── events.js         on… handlers and on()
│   ├── store.js          state()
│   └── router.js         createRouter()
├── todo/                 TodoMVC built with HHT.js
│   ├── app.js            entry point: router, subscriptions, first render
│   ├── state.js          shared state
│   ├── actions.js        state updates
│   ├── view.js           the page, as virtual nodes
│   ├── routes.js         route paths
│   ├── storage.js        localStorage persistence
│   └── demo-app.js, page.js   earlier counter demo (used by tests only)
├── tests/                framework and TodoMVC tests
└── docs/
    ├── documentation.md          full framework manual
    ├── documentation-audit.md    documentation audit report
    ├── project.md                original project brief
    ├── TodoMVC-Study.md          TodoMVC behaviour notes
    └── Design.md                 historical early design (not the current API)
```

## TodoMVC

`npm run dev` opens the TodoMVC app. It supports adding, editing (double-click; Enter/blur saves, Escape cancels), completing, deleting, toggle-all, clear completed, the item counter, and the All / Active / Completed filters (`#/`, `#/active`, `#/completed`). It uses the official `todomvc-app-css` stylesheet.

### Todo data model

Each todo holds only the data needed to represent the task:

```js
{ id: string, text: string, completed: boolean }
```

Edit mode is not stored inside the todos. The app keeps the ID of the todo being edited separately, so the TodoMVC state is `{ todos, editingId }` (`todo/state.js`). Values that can be derived (the item count, the filtered list) are computed in the view, not stored.

### Persistence

Todos survive a page refresh; edit mode does not.

- **Todos** are saved to `localStorage` under the key `todos-hhtjs` (TodoMVC's `todos-<framework>` naming), in the same `{ id, text, completed }` shape.
- **Edit mode** (`editingId`) is not saved: a refresh always starts with no todo being edited.
- **The current filter** is not saved either: it lives in the URL hash, so a refresh restores it through the router.

Persistence is app code (`todo/storage.js`), not part of the framework. `todo/app.js` loads saved todos once at startup and saves whenever the todo list changes. If storage is unavailable, full, or holds invalid data, the app starts with an empty list and keeps working in memory.

## Documentation

- [Framework documentation](docs/documentation.md): everything you need to use HHT.js
- [Project brief](docs/project.md): the original assignment

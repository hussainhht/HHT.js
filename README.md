<p align="center">
  <img src="docs/favicon.svg" alt="HHT.js logo" width="120" height="120" />
</p>

<h1 align="center">HHT.js</h1>

ٍHHT.js is a small JavaScript fraٍmework for building web pages, written from scratch with no dependencies. You describe the page with plain JavaScript objects; HHT.js creates the real elements and, when your state changes, updates only the parts of the page that differ.

The repository also contains a complete [TodoMVC](https://todomvc.com/) application built with HHT.js.

📖 **Documentation**

- **[Documentation page](#documentation-page-docshtml)** (`docs.html`): the guide as a web page. Run `npm run dev` and open [http://localhost:5173/docs.html](http://localhost:5173/docs.html).
- **[Full manual](docs/documentation.md)** (`docs/documentation.md`): the complete reference, readable on GitHub.

## Core featu**DOM abstraction**: `createElement(tag, attrs, children)` builds virtual nodes; attributes use their HTML names (`class`, `for`, `data-*`), with support for boolean attributes and inline styles (string or object).

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

A development server is needed because the framework is written as ES modules, which browsers don't load from `file://` pages. The same applies to `docs.html`, so don't open it by double-clicking the file.

| Address                             | Page                   |
| ----------------------------------- | ---------------------- |
| `http://localhost:5173/`          | the TodoMVC app        |
| `http://localhost:5173/docs.html` | the documentation page |

If port 5173 is busy, Vite picks the next free one and prints it. To open the documentation directly when the server starts:

```bash
npm run dev -- --open /docs.html
```

## Documentation page (`docs.html`)

`docs.html` is the HHT.js guide as a single web page, served by the same dev server as the TodoMVC app.

**How to open it**

1. Run `npm install` once, then `npm run dev`.
2. Open `/docs.html` on the address Vite prints, usually [http://localhost:5173/docs.html](http://localhost:5173/docs.html).

**What it offers**

- A sidebar grouped as *Start here*, *Building UI*, *Routing*, *Examples* and *Understand more*, with a search box to find a section.
- Code samples with a **Copy** button.
- **Light and dark mode**, switched with the button in the header. The first visit follows your system setting; after that your choice is remembered.
- A menu button on narrow screens, so it also works on a phone.

Its files are `docs.html` (content), `docs/documentation.css` (styles) and `docs/documentation.js` (copy buttons, search, theme and menu). The theme choice is stored in `localStorage` under `theme-hhtjs`, the same key the TodoMVC app uses, so both pages always show the same theme.

`docs.html` is the quick guide. For the complete reference (diffing, keys, refs, forms, limitations, the full API), read [docs/documentation.md](docs/documentation.md).

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

HHT.js uses **named exports only**, all from `framework/index.js`. `state.set()` does not re-render on its own: you subscribe your render function, as above. The documentation explains why.

## Project structure

```text
mini-framework/
├── index.html            loads the TodoMVC app
├── docs.html             the documentation page (open it at /docs.html)
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
│   ├── storage.js        localStorage persistence (todos and theme)
│   ├── theme.css         dark-mode styles for the TodoMVC app
│   └── demo-app.js, page.js   earlier counter demo (used by tests only)
├── tests/                framework and TodoMVC tests
└── docs/
    ├── favicon.svg               the HHT.js logo (also the docs page icon)
    ├── documentation.css         styles for docs.html
    ├── documentation.js          scripts for docs.html
    ├── documentation.md          full framework manual
    ├── documentation-audit.md    documentation audit report
    ├── project.md                original project brief
    ├── TodoMVC-Study.md          TodoMVC behaviour notes
    ├── Design.md                 early design notes (historical, not the current API)
    └── Todo.md                   project roadmap checklist
```

## TodoMVC

`npm run dev` opens the TodoMVC app. It supports adding, editing (double-click; Enter/blur saves, Escape cancels), completing, deleting, toggle-all, clear completed, the item counter, and the All / Active / Completed filters (`#/`, `#/active`, `#/completed`). It also has a **Dark mode** switch. It uses the official `todomvc-app-css` stylesheet, plus `todo/theme.css` for the dark theme.

### Todo data model

Each todo holds only the data needed to represent the task:

```js
{ id: string, text: string, completed: boolean }
```

Edit mode is not stored inside the todos. The app keeps the ID of the todo being edited separately, so the TodoMVC state is `{ todos, editingId }` (`todo/state.js`). Values that can be derived (the item count, the filtered list) are computed in the view, not stored.

### Persistence

Todos and the theme survive a page refresh; edit mode does not.

- **Todos** are saved to `localStorage` under the key `todos-hhtjs` (TodoMVC's `todos-<framework>` naming), in the same `{ id, text, completed }` shape.
- **The theme** (`"light"` or `"dark"`) is saved under `theme-hhtjs`. Without a saved choice, the system setting decides. `docs.html` reads and writes the same key.
- **Edit mode** (`editingId`) is not saved: a refresh always starts with no todo being edited.
- **The current filter** is not saved either: it lives in the URL hash, so a refresh restores it through the router.

Persistence is app code (`todo/storage.js`), not part of the framework. `todo/app.js` loads saved todos once at startup and saves whenever the todo list changes. If storage is unavailable, full, or holds invalid data, the app starts with an empty list and keeps working in memory.

## Documentation

- [Documentation page](#documentation-page-docshtml) (`docs.html`): the guide in the browser, at `/docs.html` while `npm run dev` is running
- [Framework documentation](docs/documentation.md): everything you need to use HHT.js
- [Project brief](docs/project.md): the original assignment
- [Design notes](docs/Design.md): early ideas, kept for history (not the current API)
- [Roadmap](docs/Todo.md): the project checklist

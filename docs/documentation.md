# HHT.js Documentation

HHT.js is a small JavaScript framework for building web pages. It gives you:

- a way to **describe elements** with plain JavaScript instead of calling `document.createElement()` yourself;
- a way to **attach events** by writing `onClick`, `onInput`, … next to the other attributes;
- a small **state** container that tells you when data changes;
- a **renderer** that updates only the parts of the page that changed;
- a **hash router** for URLs such as `#/`, `#/active` and `#/completed`.

The TodoMVC app in `todo/` is built entirely with HHT.js and is the best larger example to read after this guide.

---

## Contents

1. [Installation](#installation)
2. [Running the project](#running-the-project)
3. [Importing HHT.js](#importing-hhtjs)
4. [Your first page](#your-first-page)
5. [Creating elements](#creating-elements)
6. [Attributes](#attributes)
7. [Children and nesting](#children-and-nesting)
8. [Events](#events)
9. [State](#state)
10. [Rendering](#rendering)
11. [Connecting state to rendering](#connecting-state-to-rendering)
12. [How rendering works](#how-rendering-works)
13. [Routing](#routing)
14. [Why HHT.js is a framework](#why-hhtjs-is-a-framework)
15. [Complete example: counter](#complete-example-counter)
16. [Complete example: pages with routing](#complete-example-pages-with-routing)
17. [API reference](#api-reference)
18. [Current limitations](#current-limitations)

---

## Installation

You need [Node.js](https://nodejs.org/) (which includes `npm`). From the project root folder, run:

```bash
npm install
```

This installs the development server (Vite) and the TodoMVC stylesheet (`todomvc-app-css`). HHT.js itself has no dependencies.

## Running the project

From the project root folder:

```bash
npm run dev
```

Vite prints a local address (usually `http://localhost:5173/`). Open it in your browser to see the TodoMVC app.

To run the automated tests:

```bash
npm test
```

> **Why a dev server?** HHT.js is written as JavaScript modules (`import` / `export`). Browsers refuse to load modules from a page opened directly from disk (`file://...`), so the page has to be served over `http://`. Vite does that for you.

---

## Importing HHT.js

Everything you need is exported from **one file**, `framework/index.js`, the public entry point of HHT.js:

```js
import {
  createElement,
  render,
  mount,
  state,
  createRouter,
} from "./framework/index.js";
```

Import only the functions you use, for example `import { createElement, render } from "./framework/index.js";`. HHT.js uses **named exports** only: there is no `hht` object and no default export.

The path is relative to **your** file. The examples in this guide assume your JavaScript file sits in the project root (next to `index.html`). From a file inside `todo/`, write `"../framework/index.js"` instead, as `todo/app.js` does.

| Export | Use it to |
| --- | --- |
| `createElement` | Describe an element ([Creating elements](#creating-elements)) |
| `render` | Show and update your app on the page ([Rendering](#rendering)) |
| `mount` | Insert content once, without updates ([Rendering](#rendering)) |
| `state` | Create a piece of state ([State](#state)) |
| `createRouter` | Create a hash router ([Routing](#routing)) |

### How the framework is organised

You don't need to know this to use HHT.js. `index.js` only re-exports functions from the files that implement them:

| File | Contains |
| --- | --- |
| `framework/index.js` | The public API: the five functions above |
| `framework/dom.js` | Virtual nodes, rendering and the diff (`createElement`, `render`, `mount`) |
| `framework/store.js` | State (`state`) |
| `framework/router.js` | The hash router (`createRouter`) |
| `framework/events.js` | Turns `on…` attributes into event listeners, used by `dom.js` |

Some of these files also export **internal helpers** (`renderElement`, `notFound`, `isEvent`, `addEvent`). The framework uses them itself, and the tests check them, but they are not part of the public API: they are not exported from `index.js` and may change without notice.

---

## Your first page

1. In the project root, create `hello.html`:

   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <title>Hello HHT.js</title>
       <script type="module" src="/hello.js"></script>
     </head>
     <body>
       <div id="app"></div>
     </body>
   </html>
   ```
2. In the project root, create `hello.js`:

   ```js
   import { createElement, render } from "./framework/index.js";

   render("#app", createElement("h1", { class: "title" }, ["Hello, HHT.js!"]));
   ```
3. Run `npm run dev` and open `http://localhost:5173/hello.html`.

You should see a heading that says **Hello, HHT.js!**. The rest of this guide explains each piece.

---

## Creating elements

```js
createElement(tag, attrs, children)
```

| Parameter    | Type                      | Default    | Meaning                                                                |
| ------------ | ------------------------- | ---------- | ---------------------------------------------------------------------- |
| `tag`      | string                    | (required) | The HTML tag name, e.g.`"div"`, `"button"`, `"input"`            |
| `attrs`    | object                    | `{}`     | Attributes and event handlers, e.g.`{ class: "title", onClick: fn }` |
| `children` | array (or a single child) | `[]`     | What goes inside the element: text, numbers, other elements            |

**Returns:** a *virtual node*: a plain JavaScript object that **describes** an element. It is not a real DOM element yet and nothing appears on the page until you pass it to [`render()`](#rendering).

```js
import { createElement } from "./framework/index.js";

const title = createElement("h1", { class: "title" }, ["Hello"]);

console.log(title);
// { tag: "h1", attrs: { class: "title" }, children: ["Hello"] }
```

Elements with no attributes or children can leave those arguments out:

```js
createElement("hr");                  // <hr>
createElement("p", {}, ["Just text"]); // <p>Just text</p>
```

> **Important:** children go in **one array**, the third argument. `createElement("p", {}, "a", "b")` only uses `"a"`; the `"b"` is ignored. Write `createElement("p", {}, ["a", "b"])` instead.
>
> If you have no attributes, pass `{}`, not `null`.

---

## Attributes

Attributes go in the second argument, as an object. The keys are the **HTML attribute names**, exactly as you would write them in HTML.

```js
createElement("input", {
  id: "new-task",
  class: "task-input",
  type: "text",
  placeholder: "What needs to be done?",
});
// <input id="new-task" class="task-input" type="text" placeholder="What needs to be done?">
```

Keys that contain a dash need quotes:

```js
createElement("li", { "data-id": "42", "aria-label": "Task 42" }, ["Buy milk"]);
```

### Use HTML names, not DOM property names

HHT.js sets attributes with the browser's `setAttribute()`, so use the HTML spelling:

| Write this | Not this      |
| ---------- | ------------- |
| `class`  | `className` |
| `for`    | `htmlFor`   |

### Removing an attribute: `null` or `undefined`

If an attribute's value is `null` or `undefined`, HHT.js leaves it off (or removes it on the next render). This is the easiest way to add an attribute only sometimes:

```js
createElement("a", {
  href: "#/active",
  class: isSelected ? "selected" : null, // no class attribute at all when not selected
}, ["Active"]);
```

### Classes

`class` is a normal string. To combine several conditional classes, build the string yourself (this is what TodoMVC does in `todo/view.js`):

```js
const classes = [todo.completed && "completed", isEditing && "editing"]
  .filter(Boolean)
  .join(" ");

createElement("li", { class: classes || null }, [todo.text]);
```

### `value`, `checked`, `disabled`, `selected`

These four are special. HHT.js sets them as **DOM properties** (for example `input.checked = true`) as well as attributes, because that is what the browser actually displays. They also stay in sync on every render (see [Forms](#forms-controlled-and-uncontrolled-inputs)).

`checked`, `disabled` and `selected` take real booleans:

```js
createElement("input", { type: "checkbox", checked: true });   // ticked
createElement("input", { type: "checkbox", checked: false });  // not ticked
createElement("button", { disabled: count === 0 }, ["Reset"]); // disabled only when count is 0
```

`value` takes a string or number:

```js
createElement("input", { type: "text", value: "Draft" });
```

### Other boolean attributes (`hidden`, `readonly`, `required`, `autofocus`, …)

Only `checked`, `disabled` and `selected` understand `true`/`false`. For every other attribute, `false` is turned into the text `"false"`, and the browser treats **any** value of a boolean attribute as "on". So:

```js
createElement("p", { hidden: false }, ["Oops"]); // ⚠️ still hidden!
```

Use `""` to turn it on and `null` to turn it off:

```js
createElement("p", { hidden: isVisible ? null : "" }, ["Now correct"]);
createElement("input", { class: "new-todo", autofocus: "" });  // from todo/view.js
```

### Inline styles

`style` works as a **string**, like in HTML:

```js
createElement("div", { style: "color: red; transform: translate(40px, 0)" });
```

Style **objects** (`style: { color: "red" }`) are not supported: they produce `style="[object Object]"`.

### Attributes that start with `on`

Any attribute name that starts with `on` is treated as an **event handler**, not an attribute. See [Events](#events).

---

## Children and nesting

The third argument of `createElement` is the list of children.

### Text

Strings become text:

```js
createElement("p", {}, ["Hello World"]);
// <p>Hello World</p>
```

Text is always shown **as text**, never parsed as HTML, so user input cannot inject markup:

```js
createElement("p", {}, ["<strong>Hello</strong>"]);
// shows the characters <strong>Hello</strong> on the page
```

### Numbers

Numbers are converted to text:

```js
createElement("p", {}, ["Score: ", 10]);
// <p>Score: 10</p>
```

### Mixing text and elements

```js
createElement("p", {}, [
  "Welcome ",
  createElement("strong", {}, ["Alice"]),
  "!",
]);
// <p>Welcome <strong>Alice</strong>!</p>
```

### Nested elements

A child can be another `createElement(...)`, which can have its own children, as deep as you like. Indenting the code the same way as the HTML makes the structure easy to read:

```js
createElement("div", { class: "card" }, [
  createElement("header", {}, [
    createElement("h1", {}, ["Todos"]),
  ]),
  createElement("main", {}, [
    createElement("p", {}, ["Welcome"]),
  ]),
]);
```

```html
<div class="card">
  <header><h1>Todos</h1></header>
  <main><p>Welcome</p></main>
</div>
```

### Arrays of children (lists)

Arrays inside the children list are **flattened**, so you can use `map()` directly:

```js
const todos = ["Buy milk", "Walk dog"];

createElement("ul", { class: "todo-list" }, [
  todos.map((text) => createElement("li", {}, [text])),
]);
// <ul class="todo-list"><li>Buy milk</li><li>Walk dog</li></ul>
```

You can also pass the mapped array as the children argument itself:

```js
createElement("ul", {}, todos.map((text) => createElement("li", {}, [text])));
```

### Conditional children

`null`, `undefined`, `true` and `false` children are **skipped**. This lets you show something only when a condition is true:

```js
createElement("div", {}, [
  isLoggedIn && createElement("p", {}, ["Welcome back!"]),
  error ? createElement("p", { class: "error" }, [error]) : null,
]);
```

A function may also return `null` to mean "nothing". TodoMVC's `createClearCompleted` does this when there is nothing to clear:

```js
function createClearCompleted(completedCount) {
  if (completedCount === 0) return null;
  return createElement("button", { class: "clear-completed" }, ["Clear completed"]);
}
```

> **Watch out for `0`.** Numbers are rendered, so `items.length && createElement(...)` shows the text `0` when the list is empty. Use `items.length > 0 && ...` instead.

### Summary

| Child value                                  | Result                                    |
| -------------------------------------------- | ----------------------------------------- |
| `"text"`                                   | Text node                                 |
| `42`, `0`                                | Text node`"42"`, `"0"`                |
| `createElement(...)`                       | Element                                   |
| `[a, b, [c]]`                              | Flattened into`a, b, c`                 |
| `null`, `undefined`, `true`, `false` | Nothing                                   |
| A function                                   | **Not supported** (causes an error) |

---

## Events

To react to the user, add an attribute whose name is **`on` + the event name**, and give it a function:

```js
createElement(
  "button",
  {
    onClick: () => {
      console.log("Clicked");
    },
  },
  ["Click me"],
);
```

You never call `addEventListener()` yourself. When HHT.js creates the element, it sees that `onClick` starts with `on`, works out the event name (`click`) and attaches your function to the element for you.

### The event object

Your function receives the browser's normal **event object**, so everything you know about browser events still applies:

```js
createElement("input", {
  onInput: (event) => {
    console.log(event.target.value); // what the user has typed so far
  },
});
```

```js
createElement("input", {
  class: "new-todo",
  onKeydown: (event) => {
    if (event.key === "Enter") {
      console.log("Submit:", event.target.value);
    }
  },
});
```

### Event names

HHT.js removes the `on` and **lower-cases** the rest. The result must be a real browser event name:

| You write                        | Event listened to |
| -------------------------------- | ----------------- |
| `onClick`                      | `click`         |
| `onDblClick` or `onDblclick` | `dblclick`      |
| `onInput`                      | `input`         |
| `onChange`                     | `change`        |
| `onSubmit`                     | `submit`        |
| `onKeyDown` or `onKeydown`   | `keydown`       |
| `onKeyUp` or `onKeyup`       | `keyup`         |
| `onFocus`                      | `focus`         |
| `onBlur`                       | `blur`          |
| `onMouseEnter`                 | `mouseenter`    |
| `onScroll`                     | `scroll`        |

Any other DOM event works the same way.

> ⚠️ **Double-click is `onDblClick`, not `onDoubleClick`.** The browser event is called `dblclick`. `onDoubleClick` would listen for an event named `doubleclick`, which does not exist, so your handler would silently never run.

### Several events on one element

```js
createElement("input", {
  class: "edit",
  onKeydown: handleKeydown,
  onBlur: handleBlur,
});
```

### Forms and `preventDefault`

Browsers reload the page when a form is submitted. Stop that yourself in the handler:

```js
createElement("form", {
  onSubmit: (event) => {
    event.preventDefault();
    // handle the form here
  },
}, [
  createElement("input", { name: "title" }),
  createElement("button", { type: "submit" }, ["Save"]),
]);
```

### Handlers and re-rendering

When the page is rendered again (see [Rendering](#rendering)), HHT.js compares each handler with the one from the previous render. If it is a different function, the old one is removed and the new one is added, so **a handler never runs twice**. To remove a handler, leave the `on…` attribute out or set it to `null`.

> Do not write `onClick: condition && handler`: when `condition` is `false` the browser throws an error. Use `onClick: condition ? handler : null`.

### What events cannot do yet

- Events can only be attached to elements you create with `createElement`. Listening on `window` or `document` (for example global keyboard shortcuts) is not handled by HHT.js; use the browser's `window.addEventListener()` for that.
- There is no way to pass listener options such as `once`, `capture` or `passive`.

You are working on my `HHT.js` mini-framework project.

Your task is to write real user documentation that matches the framework's ACTUAL implementation.

Do not redesign the framework.
Do not implement new features.
Do not document planned features as if they already exist.

The source code is the source of truth.

# Goal

Create a clear Markdown documentation file that allows a completely new user to use HHT.js without reading the framework source code.

Create or replace:

```text
docs/documentation.md
```

# Step 1 — Inspect the real framework first

Before writing documentation, read:

```text
framework/
todo/
tests/
README.md
docs/
package.json
index.html
```

Pay special attention to:

```text
framework/dom.js
framework/events.js
framework/store.js
framework/router.js
```

Also inspect how TodoMVC actually uses the framework.

Do not assume the API from `docs/Design.md` is correct.

If `Design.md` says something exists but the source code does not implement it, document the real implementation instead.

For example, verify whether these actually exist before documenting them:

```js
hht.div()
hht.button()
hht.state()
hht.router()
```

Do not document them if they do not exist.

# Step 2 — Discover the actual public API

Find every function that a framework user is actually expected to use.

For each public API function, document:

- Function name
- Import path
- Parameters
- Return value
- What it does
- A working example
- Important limitations or behavior

Expected areas include:

```text
DOM
State
Events
Rendering
Routing
```

But use the real names found in the source code.

# Step 3 — Explain how to install and run the project

Add a section explaining how a user can run the project from the root folder.

Inspect `package.json` and use the actual commands.

Example structure:

```md
## Installation

```bash
npm install
```

## Running the project

```bash
npm run dev
```

```

Only include commands that really exist.

# Step 4 — Explain importing HHT.js

Show the actual import syntax currently required by the project.

Do not invent a single `hht` object unless one actually exists.

For example, if the real API currently requires:

```js
import { createElement, render } from "./framework/dom.js";
import { state } from "./framework/store.js";
import { createRouter } from "./framework/router.js";
```

then document that exact API.

# Step 5 — Document DOM creation

Explain how to create an element.

Use the actual `createElement()` signature.

Explain:

- tag
- attributes
- children

Include a simple example such as:

```js
const title = createElement(
  "h1",
  { class: "title" },
  ["Hello"]
);
```

Make sure every example is valid with the current implementation.

# Step 6 — Document attributes

Explain how attributes are passed.

Include examples for supported attributes such as:

```text
class
id
type
placeholder
value
checked
disabled
```

Clearly mention any important implementation limitations.

Do not claim that unsupported features work.

# Step 7 — Document child elements

Explain:

- text children
- number children
- nested elements
- arrays of children
- conditional children
- null / undefined / boolean behavior

Use examples that match the actual implementation.

Example:

```js
createElement("div", {}, [
  createElement("h1", {}, ["Todos"]),
  createElement("p", {}, ["Welcome"])
]);
```

Explain the structure clearly for a beginner.

# Step 8 — Document events

Explain how HHT.js users declare events.

Use the real `on*` attribute system.

Example:

```js
createElement(
  "button",
  {
    onClick: () => {
      console.log("Clicked");
    }
  },
  ["Click me"]
);
```

Explain that HHT.js internally handles the native browser event listener.

Explain that handlers receive the native event object:

```js
createElement(
  "input",
  {
    onInput: (event) => {
      console.log(event.target.value);
    }
  }
);
```

Document only event names that the current implementation actually supports.

If there are naming limitations such as `onDblClick` instead of `onDoubleClick`, explain them honestly.

# Step 9 — Document state management

Explain the actual state API.

Include:

```js
const count = state(0);
```

Reading:

```js
count.get();
```

Updating:

```js
count.set(1);
```

Updater functions:

```js
count.set(current => current + 1);
```

Subscriptions:

```js
count.subscribe(value => {
  console.log(value);
});
```

If subscriptions currently cannot be removed, say so clearly.

Do not document unsubscribe until it actually exists.

# Step 10 — Explain state and rendering correctly

This is very important.

Do NOT claim that calling:

```js
state.set(...)
```

automatically updates the DOM unless the framework itself actually does that.

Explain the real flow.

For example, if the current architecture requires:

```js
function renderApp() {
  render("#app", App());
}

count.subscribe(renderApp);
```

then show that.

Explain the actual architecture:

```text
event
  ↓
state.set()
  ↓
subscriber runs
  ↓
new virtual DOM tree is created
  ↓
render() compares old and new trees
  ↓
real DOM is patched
```

Explain that HHT.js currently uses a small Virtual DOM and index-based diffing if that is still true in the source code.

# Step 11 — Document rendering

Explain the actual difference between:

```text
mount()
render()
renderElement()
```

if they are public.

Do not hide confusing behavior.

If `mount()` appends while `render()` manages updates, explain it.

If one function is intended mainly as an internal helper, make that clear.

Show the recommended way a user should render an application based on how the current TodoMVC works.

# Step 12 — Document routing

Explain the real routing API.

Use the actual `createRouter()` implementation.

Show how to:

- create a router
- register routes
- start the router
- navigate
- get the current route
- react to route changes
- render a view for a route

Example only if it matches the current implementation:

```js
const router = createRouter();

router.register("/");
router.register("/active");
router.register("/completed");

router.start();
```

Show actual hash URLs such as:

```text
#/
#/active
#/completed
```

Do not document route parameters if they are not implemented.

# Step 13 — Explain the Virtual DOM

Add a beginner-friendly section:

```md
## How Rendering Works
```

Explain that HHT.js uses JavaScript objects to represent elements before creating/updating the real DOM.

Example:

```js
createElement("p", {}, ["Hello"]);
```

conceptually produces something like:

```js
{
  tag: "p",
  attrs: {},
  children: ["Hello"]
}
```

Then explain:

```text
Virtual DOM tree
      ↓
render()
      ↓
compare with previous tree
      ↓
update only necessary real DOM parts
```

Keep this explanation simple.

# Step 14 — Explain inversion of control

The original project asks users to understand why a framework is different from a library.

Add a section:

```md
## Why HHT.js Is a Framework
```

Explain inversion of control using HHT.js.

For example:

Instead of application code manually changing DOM elements everywhere, the application describes the UI and provides event handlers/state updates, while HHT.js decides how to create and patch the DOM.

Do not overclaim automatic behavior the framework does not have.

# Step 15 — Build one complete small example

Add a complete counter example that uses only the real HHT.js API.

The example should demonstrate:

- creating elements
- attributes
- nested elements
- events
- state
- state updates
- subscription
- rendering

Example behavior:

```text
Counter: 0

[ - ] [ Reset ] [ + ]
```

A user should be able to copy the example into the project and run it.

Verify the code against the actual implementation before including it.

# Step 16 — Add a routing example

Create another small example demonstrating:

```text
Home
About
```

or similar.

Show:

```text
route registration
navigation
rendering based on the current route
```

Again, use only APIs that really exist.

# Step 17 — Add API Reference

At the end create:

```md
## API Reference
```

Use a table like:

```md
| API | Purpose |
|---|---|
| `createElement()` | Creates a virtual DOM node |
| `render()` | Renders or patches a tree into the page |
| `state()` | Creates application state |
| `createRouter()` | Creates a hash router |
```

Use the complete real public API.

# Step 18 — Add Current Limitations

Create:

```md
## Current Limitations
```

Document important current limitations honestly.

Examples, only if still true:

- children are diffed by index instead of keys;
- subscriptions cannot currently be removed;
- `render()` expects a CSS selector;
- style objects are not supported;
- global `window` events are not handled by the framework;
- route parameters are not supported.

This section is important because users should not have to discover limitations by reading source code.

# Step 19 — Remove documentation lies

Review:

```text
README.md
docs/Design.md
docs/documentation.md
```

Do not modify the source code.

The main task is `docs/documentation.md`.

However, if `docs/Design.md` contains old planned APIs that conflict with the real framework, add a clear warning at the top of `Design.md`:

```md
> This file contains early design ideas and may not match the current HHT.js API.
> See `documentation.md` for the current user documentation.
```

Do not rewrite the entire design file unless necessary.

# Documentation Style

Write for someone who knows basic JavaScript but has never used HHT.js.

Use:

- simple English
- short explanations
- working code examples
- clear headings
- small diagrams where useful

Do not use unnecessarily complicated terminology without explaining it.

When introducing terms such as:

```text
Virtual DOM
state
subscription
routing
inversion of control
```

explain them in beginner-friendly language.

# Important Rules

1. The source code is the source of truth.
2. Every code example must work with the current implementation.
3. Do not document planned features as existing features.
4. Do not change framework behavior.
5. Do not add new framework features.
6. Do not install packages.
7. Do not rename APIs.
8. Do not redesign the architecture.
9. Do not hide current limitations.
10. Do not copy examples from `Design.md` without verifying them.
11. Prefer examples taken from or validated against the existing TodoMVC/tests.
12. Keep documentation consistent from beginning to end.

# Validation

After writing the documentation:

1. Run the existing test suite.
2. Confirm all tests still pass.
3. Review every code example in `docs/documentation.md`.
4. Verify each function/import exists.
5. Verify every claimed behavior exists.
6. Search the documentation for stale APIs such as:

```text
hht.div
hht.button
hht.input
hht.state
hht.router
createState
function children
route parameters
```

If any of those are not implemented, they must not be presented as working APIs.

# Final Output

Create:

```text
docs/documentation.md
```

Do not modify framework source files.

In your final response give me:

- the file created or updated;
- the sections added;
- any documentation/API mismatch you found;
- whether all existing tests still pass.

---

## State

**State** is the data your page shows: a counter value, a list of todos, the text in a search box. When the state changes, the page should change.

HHT.js gives you a small container for one piece of state:

```js
import { state } from "./framework/index.js";

const count = state(0);
```

`state(initialValue)` returns an object with three methods.

### Reading: `get()`

```js
count.get(); // 0
```

### Updating: `set()`

Give `set()` a new value:

```js
count.set(1);
count.get(); // 1
```

Or give it an **updater function**. HHT.js calls it with the current value and stores whatever it returns. Use this when the new value depends on the old one:

```js
count.set((current) => current + 1);
count.get(); // 2
```

### Listening for changes: `subscribe()`

`subscribe(listener)` registers a function that HHT.js calls **every time** `set()` is called, with the new value:

```js
count.subscribe((value) => {
  console.log("count is now", value);
});

count.set(5); // logs "count is now 5"
```

Details worth knowing:

- Listeners run **immediately and synchronously**, inside `set()`, in the order you subscribed them.
- Listeners run on **every** `set()`, even when the new value is the same as the old one.
- **Subscriptions cannot be removed.** `subscribe()` returns nothing. Subscribe once, at start-up, for things that live as long as the page.

### Any kind of value

```js
const name = state("Alice");
const isOpen = state(false);
const todos = state([]);
const user = state({ name: "Alice", online: false });
```

The only exception is a **function**: `set(fn)` is always treated as an updater, so you cannot store a function as the value.

### Objects and arrays: always create a new one

`get()` returns the stored object itself, not a copy. If you change it directly, nothing is notified and the page does not update:

```js
todos.get().push({ text: "Oops" }); // ❌ changes the data silently, no update
```

Instead, build a **new** array or object in an updater. This is how every action in `todo/actions.js` works:

```js
// add
todos.set((current) => [...current, { id: "1", text: "Learn HHT.js", completed: false }]);

// change one item
todos.set((current) =>
  current.map((todo) => (todo.id === "1" ? { ...todo, completed: true } : todo)),
);

// remove one item
todos.set((current) => current.filter((todo) => todo.id !== "1"));

// update one field of an object
user.set((current) => ({ ...current, online: true }));
```

### Sharing state between files

Create the state in its own module and import it wherever you need it. Every file gets the **same** object, so all parts of the app see the same data. TodoMVC does this in `todo/state.js`:

```js
// state.js
import { state } from "./framework/index.js";

export const todoState = state({ todos: [], editingId: null });
```

```js
// any other file
import { todoState } from "./state.js";

todoState.get().todos;
```

---

## Rendering

**Rendering** means turning your virtual nodes into real elements on the page.

### `render(target, vnode)` — use this one

```js
import { createElement, render } from "./framework/index.js";

render("#app", createElement("h1", {}, ["Hello"]));
```

| Parameter  | Meaning                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `target` | A**CSS selector string** for the container, e.g. `"#app"`. It must already exist in the page. |
| `vnode`  | **One** virtual node, the root of what you want to show.                                        |

What it does:

- **First call for a target:** builds the real elements and puts them inside the container, **replacing anything that was there before**.
- **Every later call for the same target:** compares the new virtual node with the previous one and changes **only what is different** on the real page. Elements that did not change are kept, so an input keeps its focus, cursor position and typed text.
- If the selector matches nothing, it throws `HHT.js: Mount target "#app" was not found.`

`render()` takes a single root. To show several things side by side, wrap them in one element (TodoMVC wraps its app and info footer in a `div`):

```js
render("#app", createElement("div", {}, [
  createElement("section", { class: "todoapp" }, [/* ... */]),
  createElement("footer", { class: "info" }, [/* ... */]),
]));
```

You can render into several different containers; each one remembers its own previous tree:

```js
render("#header", Header());
render("#main", Main());
```

### `mount(target, vnode)` — one-time insert only

```js
import { createElement, mount } from "./framework/index.js";

mount("#app", createElement("p", {}, ["Static content"]));
```

`mount()` builds the elements and **appends** them to the container. It does not remember what it inserted, so:

- calling `mount()` again adds a **second copy**;
- a later `render()` on the same container ignores what `mount()` put there and replaces it.

Use `mount()` only for content that never changes. For anything that updates, use `render()` from the start. The TodoMVC app only uses `render()`.

### `renderElement(vnode)`: internal

`render()` and `mount()` both use an internal helper, `renderElement`, that turns a virtual node into a real DOM element. It is **not** part of the public API and is not exported from `framework/index.js`. Applications should use `render()`.

---

## Connecting state to rendering

This is the most important section in this guide.

**Calling `set()` does not change the page by itself.** A state object only calls its subscribers. You connect state to the page by subscribing a function that calls `render()`:

```js
import { createElement, render, state } from "./framework/index.js";

const count = state(0);

// 1. A function that describes the page for the CURRENT state.
function App() {
  return createElement("p", {}, ["Count: ", count.get()]);
}

// 2. A function that renders it.
function renderApp() {
  render("#app", App());
}

// 3. Re-render whenever the state changes.
count.subscribe(renderApp);

// 4. Draw the page the first time.
renderApp();
```

If your page uses several states (and a router), subscribe `renderApp` to **each** of them. This is exactly how `todo/app.js` works:

```js
todoState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();
```

### What happens when the user clicks

```text
user clicks a button
  ↓
your onClick handler calls count.set(...)
  ↓
state stores the new value and calls its subscribers
  ↓
renderApp() runs
  ↓
App() builds a NEW virtual tree from the current state
  ↓
render() compares it with the previous tree
  ↓
only the changed parts of the real page are updated
```

All of this happens synchronously: when `set()` returns, the page is already up to date. TodoMVC relies on this to focus the edit box right after entering edit mode:

```js
function handleLabelDblclick(event, id) {
  startEditing(id); // calls todoState.set(...) → page re-renders immediately
  event.target.closest("li").querySelector(".edit").focus();
}
```

Each `set()` causes one full render. If a handler calls `set()` three times, the page renders three times. Where possible, make one `set()` with an updater that does all the changes.

### Forms: controlled and uncontrolled inputs

There are two ways to handle an input.

**Uncontrolled:** don't pass `value`. The browser keeps what the user types, and re-renders never touch it. Read the value from the event when you need it. TodoMVC's new-todo box works this way:

```js
createElement("input", {
  class: "new-todo",
  placeholder: "What needs to be done?",
  onKeydown: (event) => {
    if (event.key !== "Enter") return;
    const text = event.target.value.trim();
    if (text === "") return;
    event.target.value = ""; // clear the box
    addTodo(text);
  },
});
```

**Controlled:** pass `value` from state and update the state on every keystroke. The state is always the source of truth:

```js
const message = state("");

createElement("input", {
  value: message.get(),
  onInput: (event) => message.set(event.target.value),
});
```

On every render, HHT.js sets the input back to the `value` you passed if the two differ. So if you pass `value` but **don't** update the state in `onInput`, the next render (caused by anything) resets what the user typed. The same applies to `checked` on checkboxes.

---

## How Rendering Works

This section explains what happens inside `render()`. You don't need it to use HHT.js, but it explains why the rules above exist.

### The Virtual DOM

The page in your browser is made of **DOM elements**. Creating and changing them is fairly slow, and changing them by hand everywhere quickly becomes messy.

So HHT.js first describes the page with plain JavaScript objects, one per element. This description is called a **Virtual DOM**: a lightweight copy of the page that exists only in JavaScript.

```js
createElement("p", { class: "note" }, ["Hello"]);
```

produces:

```js
{
  tag: "p",
  attrs: { class: "note" },
  children: ["Hello"]
}
```

A whole page is a tree of these objects:

```js
createElement("ul", {}, [
  createElement("li", {}, ["Milk"]),
  createElement("li", {}, ["Eggs"]),
]);
```

```js
{
  tag: "ul",
  attrs: {},
  children: [
    { tag: "li", attrs: {}, children: ["Milk"] },
    { tag: "li", attrs: {}, children: ["Eggs"] }
  ]
}
```

### Comparing old and new ("diffing")

```text
your App() function
      ↓
new Virtual DOM tree
      ↓
render()
      ↓
compare with the tree from the previous render
      ↓
update only the real DOM parts that changed
```

For each element, `render()` compares the new description with the old one:

| Situation                            | What HHT.js does to the real page                                         |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Same tag                             | Keeps the element; updates only changed attributes, handlers and children |
| Text changed                         | Changes just the text                                                     |
| Different tag (e.g.`p` → `div`) | Throws the old element away and builds a new one                          |
| New list has more children           | Adds the extra ones at the end                                            |
| New list has fewer children          | Removes the extra ones from the end                                       |

### Children are matched by position

HHT.js matches children by their **position** in the list: the 1st new child is compared with the 1st old child, the 2nd with the 2nd, and so on. It does not know which item is "the same item" (there are no *keys*).

This matters when you remove an item from the **middle** of a list:

```text
old:  [ A ][ B ][ C ]
new:  [ A ][ C ]

position 1: A → A    unchanged
position 2: B → C    the element that showed B is updated to show C
position 3: C → —    the last element is removed
```

The result on screen is correct, and TodoMVC's delete, filter and clear-completed features rely on this. But it means:

- an element can end up showing a different item than before. If the user had focused the checkbox of item B, focus stays on that element, which now shows C;
- in long lists, removing the first item updates every item after it.

Two more things follow from this:

- keep the **tag** of an element stable between renders, because switching tags rebuilds the whole subtree;
- conditional children (`null`, `false`, …) are removed **before** comparing. When one appears or disappears, every child after it shifts one position. The result is still correct; it just updates more elements.

---

## Routing

**Routing** keeps the page in sync with the URL. In HHT.js the route is the part of the address after `#`:

```text
http://localhost:5173/#/            →  route "/"
http://localhost:5173/#/active      →  route "/active"
http://localhost:5173/#/completed   →  route "/completed"
```

This is called **hash routing**. Changing the part after `#` never reloads the page, and the browser's back/forward buttons, bookmarks and refresh all work.

### Create a router and register routes

```js
import { createRouter } from "./framework/index.js";

const router = createRouter();

router.register("/");
router.register("/active");
router.register("/completed");
```

`register()` returns the router, so calls can be chained:

```js
router.register("/").register("/active").register("/completed");
```

Paths are cleaned up for you: `"active"`, `"/active"`, `"#/active"` and `"/active/"` are all stored as `"/active"`.

### Start the router

```js
router.start();
```

`start()`:

1. starts listening for URL changes (`hashchange`);
2. if the URL has no `#` part yet, sets it to `#/`;
3. reads the current URL, so refreshing on `#/completed` restores `/completed`.

Call it once, after you have subscribed to the router (see below).

### Read the current route

```js
router.getCurrentRoute(); // e.g. "/active"
```

This returns the current path even if it is not registered.

### Render a view for the route

```js
router.getCurrentView(renderRoute)
```

`renderRoute` is **your** function. It receives the current path and returns a virtual node.

- If the current path **is registered**, `getCurrentView` calls `renderRoute(path)` and returns its result.
- If it is **not registered**, it returns a built-in "404 Not Found" page instead, without calling your function.

```js
function renderRoute(path) {
  if (path === "/about") return createElement("h1", {}, ["About"]);
  return createElement("h1", {}, ["Home"]);
}

render("#app", router.getCurrentView(renderRoute));
```

TodoMVC uses **one** view function for all three routes and uses the path as a filter:

```js
render("#app", router.getCurrentView(createTodoPage));
// createTodoPage("/active") shows only the active todos
```

### React to route changes

```js
router.subscribe((path) => {
  console.log("route is now", path);
});
```

This works like a state subscription: the listener runs every time the route is set, and it cannot be removed. Subscribe your render function so the page follows the URL:

```js
router.subscribe(renderApp);
router.start();
renderApp();
```

### Navigate

Usually a normal link is all you need:

```js
createElement("a", { href: "#/active" }, ["Active"]);
```

From code (for example after a button click), use `navigate()`:

```js
router.navigate("/active");
```

`navigate()` changes the URL to `#/active`. The browser then fires `hashchange`, the router updates its current route and your subscribers run. The browser fires that event just after `navigate()` returns, so `getCurrentRoute()` shows the new path once the event has run, not on the line right after `navigate()`. If you navigate to the route you are already on, the subscribers run straight away.

### The built-in 404 view

For a path that is not registered, `getCurrentView` returns this page instead of calling your function:

```html
<main class="not-found">
  <h1>404 Not Found</h1>
  <p>No route matches /whatever.</p>
</main>
```

You get it automatically; there is nothing to import. It cannot be replaced with your own 404 page. (It is built by an internal helper, `notFound`, which is not part of the public API.)

### What the router does not do

- No route parameters (`/todos/:id`): each path must be registered exactly.
- No query strings: `#/active?x=1` is treated as the unknown route `/active?x=1`.
- No history-API URLs (`/active` without `#`).
- No way to stop the router or remove listeners.

---

## Why HHT.js Is a Framework

A **library** is code **you** call when you want something. You stay in control of when and how everything happens. For example, with plain DOM code you decide exactly which element to change:

```js
// Plain DOM: your code does all the work
button.addEventListener("click", () => {
  count += 1;
  document.querySelector("#count").textContent = `Count: ${count}`;
});
```

A **framework** turns this around. You give it pieces (a description of the page, event handlers, state changes) and **the framework calls your code** at the right moments and decides how the page is updated. This is called **inversion of control**: control over *when* and *how* things happen moves from your code to the framework.

In HHT.js:

| You write                                                       | HHT.js does                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `App()`: what the page should look like for the current state | Creates the real elements, and on every update works out the smallest set of DOM changes      |
| `onClick: handler`                                            | Attaches the listener and calls your handler with the event; swaps or removes it on re-render |
| `count.set(...)`                                              | Stores the value and calls your subscribers                                                   |
| `router.register("/active")` and a view function              | Watches the URL and tells you when it changes; shows a 404 page for unknown routes            |

```js
// HHT.js: you describe, the framework updates
function App() {
  return createElement("p", { id: "count" }, ["Count: ", count.get()]);
}
```

Your code never looks up an element to change its text. It says what the page should look like, and HHT.js makes the page match.

HHT.js is deliberately small, so one connection is still up to you: you decide **which state** triggers a re-render by subscribing your render function to it (see [Connecting state to rendering](#connecting-state-to-rendering)). After that, the framework is in charge.

---

## Complete example: counter

This example uses elements, attributes, nesting, events, state, updater functions, a subscription and rendering.

```text
Counter: 0

[ - ] [ Reset ] [ + ]
```

**`counter.html`** (project root):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HHT.js Counter</title>
    <script type="module" src="/counter.js"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

**`counter.js`** (project root):

```js
import { createElement, render, state } from "./framework/index.js";

// State: the single number this page shows.
const count = state(0);

// Event handlers only change state. They never touch the DOM.
function decrease() {
  count.set((current) => current - 1);
}

function increase() {
  count.set((current) => current + 1);
}

function reset() {
  count.set(0);
}

// View: describes the page for the current state.
function Counter() {
  const value = count.get();

  return createElement("main", { class: "counter" }, [
    createElement("h1", { id: "count" }, ["Counter: ", value]),
    createElement("div", { class: "buttons" }, [
      createElement("button", { type: "button", onClick: decrease }, ["-"]),
      createElement(
        "button",
        { type: "button", disabled: value === 0, onClick: reset },
        ["Reset"],
      ),
      createElement("button", { type: "button", onClick: increase }, ["+"]),
    ]),
    value < 0 && createElement("p", { class: "warning" }, ["Below zero!"]),
  ]);
}

// Rendering: draw now, and again after every state change.
function renderApp() {
  render("#app", Counter());
}

count.subscribe(renderApp);
renderApp();
```

Run `npm run dev` and open `http://localhost:5173/counter.html`.

What to notice:

- The handlers only call `count.set(...)`. The page updates because `renderApp` is subscribed to `count`.
- **Reset** is `disabled` exactly when the count is `0`.
- The warning paragraph appears only when the count is negative (`false` children are skipped).
- On each click, the `h1`, the buttons and the `main` element stay the same DOM elements. Only the number text, the `disabled` state and the warning change.

---

## Complete example: pages with routing

This example has a **Home** and an **About** page, navigation links, a button that navigates from code, and a 404 page for unknown URLs. It also combines routing with state: the click counter on Home survives page switches because the state lives outside the view.

**`pages.html`** (project root):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HHT.js Pages</title>
    <script type="module" src="/pages.js"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

**`pages.js`** (project root):

```js
import { createElement, createRouter, render, state } from "./framework/index.js";

const router = createRouter();
router.register("/").register("/about");

const likes = state(0);

const links = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
];

// Navigation bar: the link for the current route gets class="selected".
function Nav(currentPath) {
  return createElement(
    "nav",
    {},
    links.map(({ label, path }) =>
      createElement(
        "a",
        { href: `#${path}`, class: path === currentPath ? "selected" : null },
        [label],
      ),
    ),
  );
}

function Home() {
  return createElement("section", { class: "home" }, [
    createElement("h1", {}, ["Home"]),
    createElement("p", {}, ["Likes: ", likes.get()]),
    createElement(
      "button",
      { type: "button", onClick: () => likes.set((n) => n + 1) },
      ["Like"],
    ),
  ]);
}

function About() {
  return createElement("section", { class: "about" }, [
    createElement("h1", {}, ["About"]),
    createElement("p", {}, ["This page is rendered by HHT.js."]),
    createElement(
      "button",
      { type: "button", onClick: () => router.navigate("/") },
      ["Back to Home"],
    ),
  ]);
}

// Called by router.getCurrentView() only for registered paths.
function renderRoute(path) {
  if (path === "/about") return About();
  return Home();
}

function App() {
  return createElement("div", {}, [
    Nav(router.getCurrentRoute()),
    router.getCurrentView(renderRoute),
  ]);
}

function renderApp() {
  render("#app", App());
}

likes.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();
```

Open `http://localhost:5173/pages.html` and try:

- click **About** and **Home** in the nav: the URL changes to `#/about` / `#/` and the page switches without reloading;
- click **Like** a few times, go to About and back: the count is kept;
- click **Back to Home** on the About page (navigation from code);
- use the browser's back and forward buttons;
- refresh on `#/about`: you stay on About;
- type `#/nope` in the address bar: you get the 404 page, with the nav still shown.

---

## API Reference

### Public API

Import all of these from `framework/index.js`:

```js
import { createElement, render, mount, state, createRouter } from "./framework/index.js";
```

#### Elements and rendering

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `createElement(tag, attrs = {}, children = [])` | `tag`: string; `attrs`: object of attributes and `on…` handlers; `children`: array (nested arrays flattened; `null`/`undefined`/booleans skipped) or a single child | Virtual node `{ tag, attrs, children }` | Describes an element |
| `render(target, vnode)` | `target`: CSS selector string; `vnode`: one virtual node | nothing | First call: replaces the container's content. Later calls: updates only what changed. **Use this to show and update your app.** |
| `mount(target, vnode)` | `target`: CSS selector string; `vnode`: one virtual node | nothing | Appends the elements once; no updates, no tracking |

#### State

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `state(initialValue)` | any value | state object | Creates a piece of state |
| `stateObject.get()` | – | current value | Reads the value (the stored object itself, not a copy) |
| `stateObject.set(valueOrUpdater)` | a new value, or `(current) => newValue` | nothing | Replaces the value, then calls every subscriber synchronously |
| `stateObject.subscribe(listener)` | `(value) => {}` | nothing | Calls `listener` after every `set()`. Cannot be removed. |

#### Routing

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `createRouter()` | – | router object | Creates a hash router (starts at route `"/"`) |
| `router.register(path)` | path string | the router (chainable) | Marks a path as a known route |
| `router.start()` | – | nothing | Listens for URL changes, sets `#/` if no hash, reads the current URL |
| `router.navigate(path)` | path string | nothing | Changes the URL to `#path` |
| `router.getCurrentRoute()` | – | path string, e.g. `"/active"` | Current path (registered or not) |
| `router.getCurrentView(renderRoute)` | `(path) => vnode` | virtual node | `renderRoute(path)` for registered paths, otherwise the built-in 404 view |
| `router.subscribe(listener)` | `(path) => {}` | nothing | Calls `listener` whenever the route is set. Cannot be removed. |

### Internal modules (not public API)

These are exported from their own files so the framework modules (and the framework's tests) can use them. They are **not** exported from `framework/index.js`, and applications should not rely on them.

| Internal export | File | Used for |
| --- | --- | --- |
| `renderElement(vnode)` | `framework/dom.js` | Building a real DOM node from a virtual node, inside `render` and `mount` |
| `notFound(path)` | `framework/router.js` | Building the 404 page returned by `getCurrentView` |
| `isEvent(name)`, `addEvent(element, name, handler)` | `framework/events.js` | Detecting `on…` attributes and attaching the listener, inside `dom.js` |

### Attribute and event rules at a glance

| Key in`attrs`                          | Behavior                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `onXxx` (any key starting with `on`) | Event listener for event`xxx` (lower-cased). `null`/missing removes it.      |
| `checked`, `disabled`, `selected`  | Boolean: set as DOM property and attribute; re-synced every render               |
| `value`                                | Set as DOM property and attribute; re-synced every render if the user changed it |
| value`null` or `undefined`           | Attribute is not set / is removed                                                |
| anything else                            | `setAttribute(key, value)`: use HTML names (`class`, `for`, `data-*`)    |

---

## Current Limitations

These are true of the current version. Plan around them.

**Elements and attributes**

- Children must be passed as **one array** (third argument). Extra arguments are ignored.
- **Function children** (e.g. `() => count.get()`) are not supported and cause an error.
- `attrs` must be an object; `null` causes an error. Use `{}`.
- Only `checked`, `disabled` and `selected` understand `true`/`false`. For other boolean attributes (`hidden`, `readonly`, `required`, …) use `""` for on and `null` for off.
- `style` must be a string. Style objects are not supported.
- `class` must be a string (no arrays or objects).
- Every attribute whose name starts with `on` is treated as an event.
- A controlled `<select>` (`value` on the `select`) is not selected correctly on its first render, because the value is set before the `<option>`s are added. Use `selected: true` on the right `<option>` instead.

**Events**

- The event name is the lower-cased text after `on`. Use `onDblClick` (not `onDoubleClick`). Custom events must have all-lowercase names.
- A handler value of `false` causes an error; use `null` for "no handler".
- No event options (`once`, `capture`, `passive`).
- No framework support for `window`/`document` events (global keyboard shortcuts, resize). Use `window.addEventListener()` directly for those.
- Inline arrow functions are new on every render, so HHT.js removes and re-adds those listeners on each render. This is correct but does extra work.

**State**

- **`set()` does not update the page by itself.** You must `subscribe` a render function.
- **Subscriptions cannot be removed** (state and router).
- Subscribers run on every `set()`, even when the value did not change.
- Updates are not batched: each `set()` means one full render.
- A function cannot be stored as a state value (it is treated as an updater).
- State is not protected: changing the object returned by `get()` changes the state silently, without notifying subscribers.

**Rendering**

- `render()` and `mount()` accept a **CSS selector string** only, not a DOM element.
- `render()` takes a single root node.
- Every render rebuilds the **whole** virtual tree for that container and compares all of it, even if only one value changed. For large pages, split the page into several containers rendered separately.
- Children are compared **by position, not by key**. Removing an item from the middle of a list updates every item after it, and a focused element can end up showing a different item.
- Changing an element's tag rebuilds that element and everything inside it.
- `mount()` does not support updates; there is no `unmount()`.
- There is no built-in way to get a reference to a rendered element. Use the event's `event.target` (as TodoMVC does) or `document.querySelector()`.

**Routing**

- Hash URLs only (`#/path`).
- No route parameters (`/todos/:id`) and no query strings.
- The 404 view cannot be customised through `getCurrentView`.
- The router cannot be stopped.

# HHT.js Documentation

This is the complete manual for **HHT.js**, a small JavaScript framework for building web pages. It describes the framework **as it is implemented today** in the `framework/` folder. You should be able to use every feature of HHT.js from this document alone, without reading the framework's source code.

---

## Contents

1. [Introduction](#introduction)
2. [Why HHT.js Exists](#why-hhtjs-exists)
3. [Installation](#installation)
4. [Running the Project](#running-the-project)
5. [Importing HHT.js](#importing-hhtjs)
6. [Quick Start](#quick-start)
7. [Virtual Nodes](#virtual-nodes)
8. [Creating Elements](#creating-elements)
9. [Children](#children)
10. [Attributes](#attributes)
11. [Styles](#styles)
12. [Events](#events)
13. [Global Events](#global-events)
14. [State](#state)
15. [Connecting State to Rendering](#connecting-state-to-rendering)
16. [Rendering](#rendering)
17. [Virtual DOM and Diffing](#virtual-dom-and-diffing)
18. [Keys](#keys)
19. [Refs](#refs)
20. [Forms](#forms)
21. [Routing](#routing)
22. [Architecture](#architecture)
23. [Why HHT.js Is a Framework](#why-hhtjs-is-a-framework)
24. [TodoMVC Example](#todomvc-example)
25. [Complete Examples](#complete-examples)
26. [Error Handling](#error-handling)
27. [Current Limitations](#current-limitations)
28. [Possible Future Features](#possible-future-features)
29. [Public API Reference](#public-api-reference)

---

## Introduction

HHT.js gives you five things:

| Feature                   | What you get                                                                                                                                | Main function                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **DOM abstraction** | Describe elements with plain JavaScript objects instead of calling`document.createElement()` yourself                                     | `createElement()`                      |
| **Rendering**       | Turn those descriptions into real elements, and on later renders change only what is different                                              | `render()`, `mount()`, `unmount()` |
| **Events**          | Attach event handlers by writing`onClick`, `onInput`, … next to the other attributes, plus a helper for `window`/`document` events | `on…` attributes, `on()`            |
| **State**           | A small container for a value that tells its subscribers when it changes                                                                    | `state()`                              |
| **Routing**         | A hash router for URLs such as`#/`, `#/active` and `#/completed`                                                                      | `createRouter()`                       |

The whole public API is **seven functions**, all imported from `framework/index.js`.

The TodoMVC application in `todo/` is built entirely with HHT.js. It is used throughout this guide as the real-world example (see [TodoMVC Example](#todomvc-example)).

---

## Why HHT.js Exists

HHT.js was written as a learning project: the goal is a framework that is small enough to read in one sitting, yet complete enough to build a real application (TodoMVC) with it.

Its design goals are:

- **Small.** Five source files. There is no build step inside the framework and no dependency.
- **Understandable.** Every feature is plain JavaScript: objects, arrays and functions. There is no special syntax (no JSX, no templates) and no compiler.
- **Explicit.** Nothing happens behind your back. State does not re-render the page on its own: *you* subscribe your render function to the state (see [Connecting State to Rendering](#connecting-state-to-rendering)). Once you have seen that one line, you know how every update in your app happens.
- **Beginner-friendly.** Attributes use their normal HTML names (`class`, `for`), handlers receive the browser's normal event object, and mistakes that are easy to make (a handler that is not a function, a duplicate list key, a missing container) throw an error that starts with `HHT.js:` and says what is wrong.
- **Lightweight.** No components, no lifecycle hooks, no automatic dependency tracking. You build your page from functions that return virtual nodes.

HHT.js is not trying to compete with larger frameworks. It deliberately leaves out many features they have; see [Current Limitations](#current-limitations).

---

## Installation

You need [Node.js](https://nodejs.org/) **20.19 or newer** (or 22.12+), which includes `npm`. This is the version the development server (Vite 7) requires.

From the project root folder, run:

```bash
npm install
```

This installs:

- **Vite**, the development server;
- **`todomvc-app-css`**, the official TodoMVC stylesheet used by the TodoMVC app.

HHT.js itself has no dependencies. The framework is the five files in `framework/`.

## Running the Project

From the project root folder:

```bash
npm run dev
```

Vite prints a local address, usually `http://localhost:5173/`. Open it in your browser to see the TodoMVC app (`index.html` loads `todo/app.js`).

To run the automated tests (Node's built-in test runner, no browser needed):

```bash
npm test
```

These are the only two scripts in `package.json`. There is no build script: the framework runs in the browser as it is.

> **Why a dev server?** HHT.js is written as JavaScript modules (`import` / `export`). Browsers refuse to load modules from a page opened directly from disk (`file://...`), so the page must be served over `http://`. `index.html` also loads the stylesheet from `/node_modules/…`, so the server must serve the project root. `npm run dev` does both.

---

## Importing HHT.js

Everything you need is exported from **one file**, `framework/index.js`, using **named exports**:

```js
import {
  createElement,
  render,
  mount,
  unmount,
  state,
  createRouter,
  on,
} from "./framework/index.js";
```

Import only what you use:

```js
import { createElement, render } from "./framework/index.js";
```

There is **no default export and no `hht` object**. Code such as `import hht from "./hht.js"` or `hht.div(...)` belongs to an early design (`docs/Design.md`) that was never implemented, and does not work.

The path is relative to **your** file. The examples in this guide assume your JavaScript file sits in the project root, next to `index.html`. From a file inside `todo/`, write `"../framework/index.js"`, as `todo/app.js` does.

| Export            | Use it to                                                             | Section                                |
| ----------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `createElement` | Describe an element (create a virtual node)                           | [Creating Elements](#creating-elements) |
| `render`        | Show your app in a container and update it                            | [Rendering](#rendering)                 |
| `mount`         | Insert content once, with no updates                                  | [Rendering](#rendering)                 |
| `unmount`       | Empty a container and forget what was rendered there                  | [Rendering](#rendering)                 |
| `state`         | Create a piece of state                                               | [State](#state)                         |
| `createRouter`  | Create a hash router                                                  | [Routing](#routing)                     |
| `on`            | Listen to events on`window`, `document` or any other event target | [Global Events](#global-events)         |

Only import from `framework/index.js`. The individual framework files also export some internal helpers; those are not part of the public API (see [Architecture](#architecture)).

---

## Quick Start

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

You see a heading that says **Hello, HHT.js!**. The page now contains:

```html
<div id="app"><h1 class="title">Hello, HHT.js!</h1></div>
```

You can follow every example in this guide the same way: an HTML file with a `<div id="app">` and a module script, both in the project root.

---

## Virtual Nodes

**What it is.** A *virtual node* ("vnode") is a plain JavaScript object that **describes** one element:

```js
{
  tag: "h1",                   // the HTML tag name
  attrs: { class: "title" },   // attributes, event handlers, style, key, ref
  children: ["Hello"]          // text, numbers and other virtual nodes
}
```

**Why it exists.** Creating and changing real DOM elements by hand everywhere quickly becomes messy. With virtual nodes you describe what the page *should* look like, and HHT.js takes care of making the real page match.

**How you get one.** You never write these objects by hand. `createElement()` builds them:

```js
const title = createElement("h1", { class: "title" }, ["Hello"]);

console.log(title);
// { tag: "h1", attrs: { class: "title" }, children: ["Hello"] }
```

**Important:** calling `createElement()` does **not** touch the page. It only builds an object. Nothing appears in the browser until you pass the virtual node to [`render()`](#rendering) (or `mount()`).

A whole page is a tree of virtual nodes: an element's `children` array can contain other virtual nodes, which have their own children, and so on. This tree is often called the **Virtual DOM**.

---

## Creating Elements

```js
createElement(tag, attrs, children)
```

| Parameter    | Type                     | Default    | Meaning                                                                     |
| ------------ | ------------------------ | ---------- | --------------------------------------------------------------------------- |
| `tag`      | string                   | (required) | The HTML tag name:`"div"`, `"button"`, `"input"`, `"my-widget"`, … |
| `attrs`    | object                   | `{}`     | Attributes, event handlers,`style`, and the reserved `key` and `ref`  |
| `children` | array, or a single child | `[]`     | What goes inside the element: text, numbers and other virtual nodes         |

**Returns** a virtual node `{ tag, attrs, children }`. The `children` array is already cleaned up: nested arrays are flattened and empty values removed (see [Children](#children)).

**Side effects:** none. It does not create DOM elements.

**Errors:** `createElement` checks `attrs` straight away and throws an `HHT.js:` error if an `on…` handler, `ref` or `style` has the wrong type, or if two children have the same `key`. See [Error Handling](#error-handling).

### Examples

```js
createElement("h1", {}, ["Hello"]);
// <h1>Hello</h1>

createElement("hr");
// <hr>   (attrs and children can be left out)

createElement("p", {}, "Just text");
// <p>Just text</p>   (a single child does not need an array)

createElement("div", { class: "card" }, [
  createElement("h1", {}, ["Title"]),
  createElement("p", {}, ["Description"]),
]);
// <div class="card"><h1>Title</h1><p>Description</p></div>
```

### Rules

- **Children go in one argument, the third one.** `createElement("p", {}, "a", "b")` only uses `"a"`; the `"b"` is silently ignored. Write `createElement("p", {}, ["a", "b"])`.
- **No attributes?** Pass `{}` or leave the argument out. Do **not** pass `null`: `createElement("p", null, ["x"])` returns a vnode, but `render()` then fails with a JavaScript `TypeError`.
- **The tag is not checked** by `createElement`. An invalid tag name (`""`, `"my tag"`) makes the browser throw an `InvalidCharacterError` when the node is rendered.
- **HTML elements only.** HHT.js creates every element with `document.createElement()`. SVG elements (`svg`, `circle`, `path`, …) need a different browser function and are **not** supported: they are created, but the browser does not draw them. Use an `<img src="icon.svg">` or CSS instead.
- **Don't change a vnode after creating it.** HHT.js keeps the `attrs` object you pass (it does not copy it) and compares it with the next render's `attrs`. Build a new object for each render, as `createElement("p", { class: x }, …)` inside a view function naturally does.

---

## Children

The third argument of `createElement` lists what goes inside the element.

### Text

Strings become text nodes:

```js
createElement("p", {}, ["Hello World"]);
// <p>Hello World</p>
```

Text is always inserted **as text**, never parsed as HTML, so user input cannot inject markup:

```js
createElement("p", {}, ["<strong>Hello</strong>"]);
// shows the characters <strong>Hello</strong> on the page
```

### Numbers

Numbers are converted to text, including `0`:

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

A child can be another `createElement(...)`, which can have its own children, as deep as you like. Indent the code like the HTML it produces:

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

Arrays inside the children list are **flattened**, to any depth, so you can use `map()` directly:

```js
const fruits = ["Apple", "Banana"];

createElement("ul", {}, [
  createElement("li", {}, ["Header item"]),
  fruits.map((name) => createElement("li", {}, [name])),
]);
// <ul><li>Header item</li><li>Apple</li><li>Banana</li></ul>
```

The mapped array can also be the children argument itself:

```js
createElement("ul", {}, fruits.map((name) => createElement("li", {}, [name])));
```

For lists whose items can be added, removed or reordered, give each item a `key` (see [Keys](#keys)).

### Conditional children

`null`, `undefined`, `true` and `false` children are **skipped**. This lets you show something only when a condition is true:

```js
createElement("div", {}, [
  isLoggedIn && createElement("p", {}, ["Welcome back!"]),
  error ? createElement("p", { class: "error" }, [error]) : null,
]);
```

A function that builds part of the page can return `null` to mean "nothing". TodoMVC's `createClearCompleted` (`todo/view.js`) does this:

```js
function createClearCompleted(completedCount) {
  if (completedCount === 0) return null;
  return createElement("button", { class: "clear-completed" }, ["Clear completed"]);
}
```

> **Watch out for `0`.** Numbers are rendered, so `items.length && createElement(...)` shows the text `0` when the list is empty. Write `items.length > 0 && ...` instead.

### Summary of child values

| Child value                                  | Result                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `"text"`                                   | Text node                                                                                                 |
| `""` (empty string)                        | An empty text node (nothing visible, but it is a child)                                                   |
| `42`, `0`, `NaN`                       | Text node`"42"`, `"0"`, `"NaN"`                                                                     |
| `createElement(...)`                       | Element                                                                                                   |
| `[a, b, [c, [d]]]`                         | Flattened into`a, b, c, d`                                                                              |
| `null`, `undefined`, `true`, `false` | Skipped                                                                                                   |
| A function, or any other object              | **Not supported.** `createElement` accepts it, but `render()` throws a JavaScript `TypeError` |

---

## Attributes

Attributes go in the second argument, as an object. The keys are the **HTML attribute names**, exactly as you would write them in HTML:

```js
createElement("input", {
  id: "new-task",
  class: "task-input",
  type: "text",
  placeholder: "What needs to be done?",
});
// <input id="new-task" class="task-input" type="text" placeholder="What needs to be done?">

createElement("a", { href: "#/active" }, ["Active"]);

createElement("label", { for: "new-task" }, ["New task"]);
```

Keys that contain a dash need quotes:

```js
createElement("li", { "data-id": "42", "aria-label": "Task 42" }, ["Buy milk"]);
```

### How attributes are set

For a normal attribute, HHT.js calls the browser's `element.setAttribute(name, value)`. The browser converts the value to a string. On later renders an attribute is only written again if its value changed (compared with `===`).

The exceptions are listed in the table at the end of this section: `on…` handlers, boolean attributes, `value`, `style`, `key` and `ref`.

### `class`, not `className`

Because HHT.js uses `setAttribute()`, you write the **HTML** name:

| Write this   | Not this      | Why                                                                                                                        |
| ------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `class`    | `className` | `className` is the name of the DOM *property*. As an attribute it would create a useless `classname="…"` attribute. |
| `for`      | `htmlFor`   | Same reason:`htmlFor` is the property name.                                                                              |
| `readonly` | `readOnly`  | Attribute names are lower case (see boolean attributes below).                                                             |

`class` is a plain string. To combine conditional classes, build the string yourself, as TodoMVC does in `todo/view.js`:

```js
const classes = [todo.completed && "completed", isEditing && "editing"]
  .filter(Boolean)
  .join(" ");

createElement("li", { class: classes || null }, [todo.text]);
```

Arrays and objects are not supported for `class`: they would be converted to text by the browser.

### Values: strings, numbers, `null`, `undefined`, `true`, `false`

For normal (non-boolean) attributes:

| Value                     | Result                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| A string                  | Written as given                                                  |
| A number                  | Written as text:`tabindex: 0` → `tabindex="0"`               |
| `null` or `undefined` | The attribute is left out, or removed if a previous render set it |
| `true` / `false`      | Written as the text`"true"` / `"false"`                       |

`null` is the way to add an attribute only sometimes:

```js
createElement("a", {
  href: "#/active",
  class: isSelected ? "selected" : null, // no class attribute at all when not selected
}, ["Active"]);
```

For `aria-*` attributes, writing `"true"`/`"false"` is what you want (`"aria-pressed": isOn`). For your own `data-*` flags, pass `null` rather than `false` if you want the attribute to disappear.

### Boolean attributes

In HTML, some attributes are **on when present**, whatever their value: `<input disabled="false">` is still disabled. HHT.js recognises these names and treats them specially:

`allowfullscreen`, `async`, `autofocus`, `autoplay`, `checked`, `controls`, `default`, `defer`, `disabled`, `formnovalidate`, `hidden`, `inert`, `ismap`, `loop`, `multiple`, `muted`, `nomodule`, `novalidate`, `open`, `playsinline`, `readonly`, `required`, `reversed`, `selected`

```js
createElement("p", { hidden: !isVisible }, ["Hello"]);
createElement("input", { required: isRequired, readonly: isLocked });
createElement("button", { disabled: count === 0 }, ["Reset"]); // disabled only when count is 0
```

| Value                                                               | Result                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `true`                                                            | Attribute present with an empty value:`<input required>`                  |
| `false`, `null`, `undefined`, or left out                     | Attribute removed. It is never written as`"false"`.                       |
| Any other value (`""`, `"until-found"`, `0`, `"false"`, …) | Attribute present, with that value as text. In HTML that means**on**. |

So `autofocus: ""` (used by TodoMVC's new-todo input) turns autofocus on, and so do `disabled: 0` and `disabled: "false"`. Pass a real boolean if you mean on/off.

These names are only recognised in **lower case**. `readOnly: false` is not recognised as a boolean attribute, so it is written as `readonly="false"`, which the browser treats as read-only.

### Attributes synced with DOM properties: `value`, `checked`, `selected`, `disabled`, `muted`

For some attributes, what the browser **shows** is a DOM property that can differ from the attribute. When the user ticks a checkbox, `input.checked` changes but the `checked` attribute does not; when the user types, `input.value` changes but the `value` attribute does not.

For `value`, `checked`, `selected`, `disabled` and `muted`, HHT.js therefore:

1. sets the **property** as well as the attribute (`input.checked = true`, `input.value = "Draft"`);
2. on **every** render, puts the property back to the vnode's value if the two differ, even when the vnode's value did not change.

```js
createElement("input", { type: "checkbox", checked: true });   // ticked
createElement("input", { type: "checkbox", checked: false });  // not ticked
createElement("input", { type: "text", value: "Draft" });      // value: string or number
```

Point 2 is what makes controlled inputs work, and what resets a controlled input if you forget to store what the user typed. See [Forms](#forms).

Removing `value` (or setting it to `null`) empties the field. The other boolean attributes (`hidden`, `required`, …) are reflected by the browser automatically, so setting or removing the attribute is enough.

### Attributes that start with `on`

Any attribute name that starts with lower-case `on` is treated as an **event handler**, not an attribute. See [Events](#events).

### Reserved attributes: `key` and `ref`

Two names are used by HHT.js itself and are **never** added to the real element:

| Attribute | Purpose                                                                 | Section      |
| --------- | ----------------------------------------------------------------------- | ------------ |
| `key`   | Identity in a list: tells the renderer which item an element represents | [Keys](#keys) |
| `ref`   | A function HHT.js calls with the real element                           | [Refs](#refs) |

```js
createElement("li", { key: item.id, ref: saveItem, class: "item" }, [item.name]);
// <li class="item">…</li>   (no key="…" or ref="…" in the HTML)
```

### Summary

| Key in`attrs`                                    | Behaviour                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `onXxx` (starts with `on`)                     | Event handler for event`xxx` (lower-cased). Function, `null` or `undefined`.                        |
| Listed boolean attributes                          | `true` → present; `false`/`null`/`undefined` → absent; anything else → present with that value |
| `checked`, `selected`, `disabled`, `muted` | Boolean attributes whose DOM property is also set and re-synced every render                              |
| `value`                                          | Set as DOM property and attribute; property re-synced every render                                        |
| `style`                                          | String or object, see[Styles](#styles)                                                                     |
| `key`                                            | Not rendered; list identity                                                                               |
| `ref`                                            | Not rendered; called with the element                                                                     |
| Any value`null` / `undefined`                  | Attribute not set / removed                                                                               |
| Anything else                                      | `setAttribute(name, value)`: use HTML names (`class`, `for`, `data-*`, `aria-*`)                |

---

## Styles

`style` can be a **string**, like in HTML, or an **object** with one entry per CSS property.

### String

```js
createElement("div", { style: "color: red; margin-top: 8px" });
```

The string becomes the element's whole `style` attribute. When it changes, the whole attribute is replaced.

### Object

```js
createElement("div", {
  style: {
    color: "white",
    backgroundColor: "black",
    transform: "translate3d(20px, 30px, 0)",
  },
});
```

Each entry is set on the element's `style` property (`element.style.backgroundColor = "black"`). Write property names in **camelCase**, as in JavaScript: `backgroundColor`, `marginTop`, `zIndex`.

**CSS custom properties** keep their dashes; HHT.js sets them with `style.setProperty()`:

```js
createElement("div", { style: { "--player-x": "20px" } });
```

Prefer the object form when values change from render to render. On each render HHT.js compares the new object with the previous one and **only writes the properties whose value changed**:

```js
createElement("span", { style: { color: active ? "green" : "gray", fontWeight: "bold" } });
```

### Rules for style objects

| You write                                                            | Result                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A property with a string value                                       | That property is set                                                                                                                                                                                              |
| A property with a number                                             | Set exactly as given. HHT.js**never adds units**: `width: 100` is rejected by the browser, write `width: "100px"`. Unitless properties such as `opacity: 0.5`, `zIndex: 2` or `flexGrow: 1` work. |
| A property set to`null` or `undefined`                           | That property is removed:`{ color: isError ? "red" : null }`                                                                                                                                                    |
| A property that was in the previous object but is missing now        | That property is removed                                                                                                                                                                                          |
| `style: {}`, `style: null`, `style: undefined` or no `style` | Every style the previous`style` value set is removed                                                                                                                                                            |
| Switching from a string to an object, or back                        | The old styles are cleared completely, then the new ones are applied                                                                                                                                              |

> **Use `null`, not `false`, to remove a style property.** `{ color: isError && "red" }` sets `color` to `false` when there is no error. The browser rejects that value and **keeps the old one**, so the text stays red. Write `{ color: isError ? "red" : null }`.

HHT.js only reads your style object; it never changes it. It also only removes styles that its own previous `style` value set, so a style property you write yourself through a [ref](#refs) is left alone, as long as the vnode never mentions that property.

### Validation

`style` must be a string, a plain object, `null` or `undefined`. Anything else (a number, `true`, an array, a function) makes `createElement` throw:

```text
HHT.js: style must be a string, object, null, or undefined.
```

The individual values inside a style object are not checked; invalid CSS values are ignored by the browser.

For styles that change many times per second, such as a moving game character, see [Refs](#refs).

---

## Events

**What it is.** To react to the user, add an attribute whose name is **`on` + the event name**, and give it a function.

```js
createElement("button", {
  onClick: () => {
    console.log("clicked");
  },
}, ["Click"]);
```

**Why it exists.** You never call `addEventListener()` yourself. The handler is part of the element's description, next to its other attributes, and HHT.js keeps the real listener in sync with it across renders.

**How it works.** When HHT.js creates the element, it sees that `onClick` starts with `on`, removes the `on`, lower-cases the rest (`click`) and attaches one native listener to the element. That listener calls your function.

### The event object

Your function receives the browser's **native event object**, unchanged, and `this` is the element (as with `addEventListener`):

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

The return value of your handler is ignored. To cancel the browser's default action, call `event.preventDefault()`.

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

Any other DOM event works the same way. Because the name is lower-cased, a custom event must have an all-lowercase name to be reachable (`onMyevent` → `myevent`).

> ⚠️ **Double-click is `onDblClick`, not `onDoubleClick`.** The browser event is called `dblclick`. `onDoubleClick` listens for an event called `doubleclick`, which does not exist, so the handler silently never runs. HHT.js cannot detect this mistake.

### Several events on one element

```js
createElement("input", {
  class: "edit",
  onKeydown: handleKeydown,
  onBlur: handleBlur,
});
```

One `on…` attribute means one handler. If you need two things to happen on one event, call both from one function. (Writing the same event twice with different spellings, such as `onClick` and `onclick`, attaches two independent listeners. Pick one spelling.)

### Forms and `preventDefault()`

Browsers reload the page when a form is submitted. Stop that in the handler:

```js
createElement("form", {
  onSubmit: (event) => {
    event.preventDefault();
    const title = event.target.elements.title.value;
    console.log("Saving", title);
  },
}, [
  createElement("input", { name: "title" }),
  createElement("button", { type: "submit" }, ["Save"]),
]);
```

### Keyboard events

HHT.js has no key modifiers or shortcuts. Check `event.key` yourself:

```js
createElement("input", {
  onKeydown: (event) => {
    if (event.key === "Enter") save(event.target.value);
    else if (event.key === "Escape") cancel();
  },
});
```

TodoMVC also skips `Enter` while `event.isComposing` is true, so that confirming a character in a Japanese or Chinese input method does not submit the todo.

For keys pressed anywhere on the page (not only in a focused element), use [`on(window, "keydown", …)`](#global-events).

### Handler values

An `on…` attribute must be a **function**, `null` or `undefined`:

```js
createElement("button", { onClick: handleClick });                   // listener attached
createElement("button", { onClick: null });                          // no listener
createElement("button", { onClick: enabled ? handleClick : null });  // only when enabled
```

`null`, `undefined`, or leaving the attribute out all mean "no listener".

Anything else throws when you call `createElement`, before anything is added to the page:

```js
createElement("button", { onClick: enabled && handleClick });
// when enabled is false:
// Error: HHT.js: Event handler "onClick" must be a function, null, or undefined.
```

`enabled && handleClick` is `false` when `enabled` is false. Use `enabled ? handleClick : null` for conditional handlers.

### Handlers and re-rendering

On later renders, each element keeps **one native listener per `on…` attribute**. If you pass a different function than last time, HHT.js only changes which function that listener calls. So after a re-render, only your **latest** handler runs, exactly once per event.

This makes inline arrow functions fine to use:

```js
createElement("button", { onClick: () => deleteTodo(todo.id) }, ["Delete"]);
```

The arrow is a new function on every render, but the browser listener is not removed and re-added; HHT.js just switches to the new function.

### Removing handlers and cleanup

| What happens                                                              | Result                                                |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| The`on…` attribute becomes `null`/`undefined`, or disappears       | The native listener is removed                        |
| A handler comes back later                                                | A new native listener is attached                     |
| The element itself is removed from the page (by a render or`unmount()`) | Nothing to do: its listeners go away with the element |
| An element is moved in a keyed list                                       | Its listeners stay attached                           |

You never need to clean up `on…` handlers yourself.

### What `on…` attributes cannot do

- They only work on elements you render with `createElement`. For `window`, `document` and other targets, use [`on()`](#global-events).
- They take no listener options (`once`, `capture`, `passive`). If you need those on a rendered element, get the element with a [ref](#refs) and use `on(element, …, options)`.

---

## Global Events

`onClick`, `onInput` and the other `on…` attributes attach events to elements **you render**. Some events don't belong to any of them: key presses anywhere on the page, the window being resized, the tab being hidden. For those, use `on()`:

```js
import { on } from "./framework/index.js";

const stop = on(window, "keydown", (event) => {
  console.log(event.key);
});

// later, when you no longer need it:
stop();
```

| You want to listen on…                             | Use                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| An element you render                               | An`on…` attribute: `createElement("button", { onClick: save })` |
| `window`, `document`, or any other event target | `on(target, "eventname", handler, options)`                        |

### `on(target, eventName, handler, options)`

| Parameter     | Type                                                                | Meaning                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`    | any object with`addEventListener()` and `removeEventListener()` | `window`, `document`, an element (for example one from a [ref](#refs)), …                                                                                                 |
| `eventName` | non-empty string                                                    | The browser's event name, exactly as`addEventListener` expects it: `"keydown"`, `"resize"`, `"visibilitychange"`. **Not** the attribute form (`"onKeyDown"`). |
| `handler`   | function                                                            | Receives the native**event object**; `this` is the target                                                                                                             |
| `options`   | optional boolean or object                                          | Passed to the browser unchanged:`true`/`false` (capture), or `{ capture, once, passive, signal }`                                                                       |

**Returns** a **stop function** that removes the listener.

- Calling the stop function **more than once is safe**; after the first call it does nothing.
- Every `on()` call is its own listener. Registering the same handler twice gives two listeners (it runs twice per event), and each stop function removes only its own. (Plain `addEventListener` would silently ignore the second registration.)
- With `{ once: true }`, the browser removes the listener after it runs once; calling the stop function afterwards is still fine.

**Lifetime.** `on()` only adds a listener. It is **not** tied to rendering: `unmount()` and re-renders never remove it. The listener stays until you call the stop function (or the browser removes it because of `once` or an aborted `signal`).

**Errors.** Invalid arguments throw straight away, and nothing is registered:

| Mistake                                         | Error                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Target is`null`, a number, a plain object, … | `HHT.js: Event target must support addEventListener() and removeEventListener().` |
| Event name is empty or not a string             | `HHT.js: Event name must be a non-empty string.`                                  |
| Handler is not a function                       | `HHT.js: Event handler must be a function.`                                       |

### Example: game keyboard controls

A game should react to the arrow keys whichever element has focus, so listen on `window`:

```js
import { on } from "./framework/index.js";

const pressedKeys = new Set();

const stopKeyDown = on(window, "keydown", (event) => {
  if (event.key.startsWith("Arrow")) event.preventDefault(); // don't scroll the page
  pressedKeys.add(event.key);
});

const stopKeyUp = on(window, "keyup", (event) => {
  pressedKeys.delete(event.key);
});

// later
stopKeyDown();
stopKeyUp();
```

Keys typed into an input (a chat box, a name field) also reach `window`. A game usually ignores them, for example by checking `event.target` first.

### Example: resize and visibility

```js
const stopVisibility = on(document, "visibilitychange", () => {
  console.log(document.hidden ? "tab hidden" : "tab visible");
});

const stopResize = on(window, "resize", () => {
  console.log(window.innerWidth, window.innerHeight);
});
```

### Cleaning up when leaving a screen

Group the listeners a screen needs into one start function that returns one stop function:

```js
function startGameControls() {
  const stopDown = on(window, "keydown", handleKeyDown);
  const stopUp = on(window, "keyup", handleKeyUp);

  return () => {
    stopDown();
    stopUp();
  };
}

const stopControls = startGameControls();

// when leaving the game screen
stopControls();
```

---

## State

**What it is.** *State* is the data your page shows: a counter value, a list of todos, the text in a search box. HHT.js gives you a small container for one piece of state:

```js
import { state } from "./framework/index.js";

const count = state(0);
```

**Why it exists.** When data changes, the page should change. A state object stores a value and **tells its subscribers** whenever it is set, so you can re-render in one place instead of updating the page by hand in every event handler.

`state(initialValue)` returns an object with three methods: `get()`, `set()` and `subscribe()`.

### Reading: `get()`

```js
count.get(); // 0
```

`get()` returns the stored value itself. For objects and arrays that is the **same object** every time, not a copy.

### Updating: `set()`

Give `set()` a new value:

```js
count.set(10);
count.get(); // 10
```

Or give it an **updater function**. HHT.js calls it with the current value and stores whatever it returns. Use this when the new value depends on the old one:

```js
count.set((current) => current + 1);
count.get(); // 11
```

`set()` returns nothing. It:

1. stores the new value (or the updater's result);
2. calls **every** subscriber with the new value, synchronously, before `set()` returns.

### Listening for changes: `subscribe()`

`subscribe(listener)` registers a function that is called after **every** `set()`, with the new value:

```js
const unsubscribe = count.subscribe((value) => {
  console.log("count is now", value);
});

count.set(5); // logs "count is now 5"
```

Details:

- `subscribe()` does **not** call the listener right away. It is first called on the next `set()`. (This is why apps call their render function once by hand at startup.)
- Listeners run **synchronously**, inside `set()`, in the order they were subscribed.
- Listeners run on **every** `set()`, even when the new value is the same as the old one. There is no equality check.
- Subscribing the same function twice creates **two independent subscriptions**: it is called twice per `set()`, and each has its own unsubscribe function.
- The listener must be a function. This is not checked when you subscribe; a non-function makes the next `set()` throw a `TypeError`.

### Stopping a subscription

`subscribe()` returns an **unsubscribe function**:

```js
count.set(1);   // logs 1
unsubscribe();
count.set(2);   // logs nothing
```

- It removes **only its own** subscription; the others keep running, in their original order.
- Calling it **more than once is safe**; after the first call it does nothing.

You don't have to unsubscribe everything. A subscription that lasts as long as the page, like `todoState.subscribe(renderApp)` in TodoMVC, can simply be left alone. Unsubscribe when something shorter-lived stops needing updates, for example a region of the page you are removing.

### Subscribing, unsubscribing and setting during a notification

A listener may subscribe or unsubscribe listeners (including itself) while it is being called:

- a listener removed during an update is **not called** for the rest of that update, or ever again;
- a listener added during an update is first called on the **next** `set()`;
- all other listeners still run, in order.

```js
const stop = count.subscribe((value) => {
  if (value >= 3) stop(); // stop listening once we reach 3
});
```

A listener may also call `set()` on the same state. That inner `set()` runs **immediately**, notifying all listeners with the newer value, before the outer notification finishes. The listeners that had not run yet in the outer notification are then called with the newer value too, so they see it twice and never see the intermediate value. Avoid calling `set()` from a subscriber when you can; an unconditional one loops forever.

### Errors inside `set()`

- If an **updater function throws**, the value is not changed and no subscriber is called. The error comes out of `set()`.
- If a **subscriber throws**, the new value is already stored, but the subscribers after it are **not** called for that update. The error comes out of `set()`.

### Any kind of value

```js
const name = state("Alice");
const isOpen = state(false);
const todos = state([]);
const user = state({ name: "Alice", online: false });
const nothing = state(null);
```

**Functions as values.** `set(fn)` always treats a function as an updater. To store a function as the value, return it from an updater: `handler.set(() => myFunction)`. Passing a function as the *initial* value (`state(myFunction)`) stores it directly.

### Objects and arrays: always create a new one

`get()` returns the stored object itself. If you change it directly, the state's value changes **silently**: no subscriber is called and the page does not update. The next unrelated `set()` then shows the change, which makes bugs confusing:

```js
todos.get().push({ text: "Oops" }); // ❌ changes the data, but nobody is notified
```

Instead, build a **new** array or object in an updater. This is how every action in `todo/actions.js` works:

```js
// add an item
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

Creating new objects also lets you compare old and new values by reference. TodoMVC uses this to save to `localStorage` only when the todo list actually changed (`todo/app.js`):

```js
let savedTodos = todoState.get().todos;
todoState.subscribe(({ todos }) => {
  if (todos === savedTodos) return; // same array: the list did not change
  savedTodos = todos;
  saveTodos(todos);
});
```

### Sharing state between files

Create the state in its own module and import it wherever you need it. Every importing file gets the **same** object, so all parts of the app see the same data. TodoMVC does this in `todo/state.js`:

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

## Connecting State to Rendering

This is the most important section of this guide.

**Calling `set()` does not change the page by itself.** A state object only calls its subscribers. You connect state to the page by **subscribing a function that calls `render()`**:

```js
import { createElement, render, state } from "./framework/index.js";

// Create state
const count = state(0);

// Describe the page for the CURRENT state
function App() {
  return createElement("p", {}, ["Count: ", count.get()]);
}

// Render the current UI into #app
function renderApp() {
  render("#app", App());
}

// Render again whenever the state changes
count.subscribe(renderApp);

// Initial render (subscribe() does not call renderApp by itself)
renderApp();
```

If the page uses several states, subscribe `renderApp` to **each** of them. If it uses a router, subscribe to the router too. This is exactly how `todo/app.js` works:

```js
todoState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();
```

If you forget a subscription, changing that state updates the data but not the page, until something else triggers a render.

### What happens when the user clicks

```text
user clicks a button
  ↓
your onClick handler runs and calls count.set(...)
  ↓
state stores the new value and calls its subscribers, in order
  ↓
renderApp() runs
  ↓
App() builds a NEW virtual tree from the current state
  ↓
render() compares it with the tree it rendered last time
  ↓
only the changed parts of the real DOM are updated
```

All of this is **synchronous**: when `set()` returns, the page is already up to date.

### Rules that follow from this

- **Each `set()` causes one full render** of every subscribed render function. If a handler calls `set()` three times, the page renders three times. Where possible, make one `set()` with an updater that does all the changes (TodoMVC keeps `todos` and `editingId` in one state object for this reason).
- **Views read, handlers write.** A view function such as `App()` should only read state with `get()`. Event handlers change state with `set()` and never touch the DOM.
- **The whole view is rebuilt on each render.** `App()` builds the entire virtual tree again; `render()` then compares all of it. Only the real DOM changes are minimal.

---

## Rendering

**Rendering** turns virtual nodes into real elements on the page. HHT.js has three functions for it. They are **not** interchangeable:

| Function                  | Remembers what it rendered? | Later calls                        | Use it for                        |
| ------------------------- | --------------------------- | ---------------------------------- | --------------------------------- |
| `render(target, vnode)` | Yes, per container          | Update the page in place (diffing) | Your app. Almost always this one. |
| `mount(target, vnode)`  | No                          | Append**another copy**       | One-time static content           |
| `unmount(target)`       | Forgets it                  | –                                 | Emptying a container              |

All three take the same kind of `target`.

### Targets

A target is the **container** element HHT.js renders into. It can be:

- a **CSS selector string**, such as `"#app"` (the first matching element is used), or
- a **DOM element**.

```js
render("#app", App());

const app = document.querySelector("#app");
render(app, App());
```

Both mean the same thing. HHT.js remembers the previous tree **per element**, not per selector, so `render("#app", …)` followed by `render(app, …)` is treated as the same container and diffed normally.

An element target does not even need to be in the page yet.

If the target is wrong, you get an HHT.js error:

| Target                                                              | Error                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A selector that matches nothing                                     | `HHT.js: Mount target "#app" was not found.`                           |
| A string that is not a valid selector (e.g.`"###"`)               | `HHT.js: Mount target "###" is not a valid CSS selector.`              |
| Anything else (`null`, a number, a plain object, a text node, …) | `HHT.js: Mount target must be a CSS selector string or a DOM element.` |

The container itself is never replaced or removed by HHT.js; only its contents change.

### `render(target, vnode)`

```js
import { createElement, render } from "./framework/index.js";

render("#app", createElement("h1", {}, ["Hello"]));
```

| Parameter  | Meaning                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target` | The container: a CSS selector string or a DOM element                                                                                                                           |
| `vnode`  | **One** virtual node, the root of what to show. (A string or number also works and renders plain text. `null`/`undefined` do not: use `unmount()` to show nothing.) |

**Returns** nothing.

What it does:

- **First call for a container:** builds the real elements and puts them inside the container, **replacing anything that was there before** (for example placeholder HTML).
- **Every later call for the same container:** compares the new virtual node with the one from the previous call and changes **only what is different** in the real DOM (see [Virtual DOM and Diffing](#virtual-dom-and-diffing)). Elements that did not change are kept, so an input keeps its focus, cursor position and typed text.
- **Stores** the new virtual node as "the previous tree" for the next call.
- Calls [refs](#refs) at the end, once the DOM is updated.

`render()` takes a **single root**. To show several things side by side, wrap them in one element (TodoMVC wraps its app and info footer in a `div`):

```js
render("#app", createElement("div", {}, [
  createElement("section", { class: "todoapp" }, [/* ... */]),
  createElement("footer", { class: "info" }, [/* ... */]),
]));
```

Edge cases:

- If the container's content was removed **from outside** HHT.js (for example with `innerHTML = ""`), the next `render()` notices the container is empty and does a fresh first render.
- Anything appended to the container from outside after a `render()` (including content added with `mount()`) is removed on the next `render()`, because `render()` owns the container.
- Don't change elements that `render()` manages by hand (text, attributes, children). The diff assumes the DOM still matches the previous tree. Refs are the supported way to touch elements directly; see [Refs](#refs).

### Several render roots

A page can have several containers, each rendered separately:

```html
<div id="hud"></div>
<div id="game"></div>
```

```js
render("#hud", Hud());
render("#game", Game());
```

- Each container keeps **its own** previous tree.
- Rendering one container never looks at the other.

This lets you update one region without rebuilding and comparing the rest. You decide what re-renders when, by subscribing each region's render function to the state it uses. HHT.js does **not** work out these dependencies for you:

```js
lives.subscribe(() => render("#hud", Hud()));
board.subscribe(() => render("#game", Game()));
```

### `mount(target, vnode)`

```js
import { createElement, mount } from "./framework/index.js";

mount("#app", createElement("p", {}, ["Static content"]));
```

`mount()` builds the elements and **appends** them to the container, after anything already there. It returns nothing. It does **not** remember what it inserted, so:

- calling `mount()` again appends a **second copy**;
- it cannot update anything: there is no diffing;
- a later `render()` on the same container replaces what `mount()` put there;
- refs inside mounted content are called with the element when it is inserted, but **never** with `null` afterwards (not even by `unmount()`).

Use `mount()` only for content that never changes. For anything that updates, use `render()` from the start. The TodoMVC app only uses `render()`.

### `unmount(target)`

```js
import { unmount } from "./framework/index.js";

unmount("#app");
```

`unmount()`:

- **removes everything inside** the container, whether it came from `render()`, `mount()` or elsewhere;
- **forgets the previous tree** stored for that container, so the next `render()` there is a fresh first render (everything is built new, nothing is compared);
- calls every [ref](#refs) in the rendered tree with `null` (children before parents);
- **leaves the container itself** in the page: `<div id="app"><h1>Hello</h1></div>` becomes `<div id="app"></div>`;
- is safe to call on an empty container, a never-rendered container, or more than once;
- does not affect any other container;
- returns nothing.

What `unmount()` does **not** do:

- It does **not remove subscriptions.** If a subscription still calls `render()` on that container, the content comes back on the next update.
- It does **not remove `on()` listeners.** Call their stop functions.

So to shut a region down completely, unsubscribe as well:

```js
const stopLobby = lobbyState.subscribe(() => render("#lobby", Lobby()));
render("#lobby", Lobby());

// leaving the lobby:
stopLobby();
unmount("#lobby");
```

---

## Virtual DOM and Diffing

You don't need this section to use HHT.js, but it explains why the rules in this guide exist.

### The idea

```text
App()
  ↓
new Virtual DOM tree (plain objects)
  ↓
render()
  ↓
compare with the tree from the previous render of this container
  ↓
update only the real DOM parts that changed
```

The real DOM is the browser's page. The Virtual DOM is the tree of objects that `createElement` returns. Building objects is cheap; creating and changing real elements is more expensive and loses browser state (focus, cursor position, scroll position). Comparing two object trees ("diffing") lets HHT.js keep every real element that is still needed.

### What `render()` compares

`render()` walks the old and new trees together, starting at the root. For each position:

| Situation                              | What HHT.js does to the real DOM                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Same tag (compared case-insensitively) | Keeps the element. Updates attributes, style and handlers that changed, then compares the children. |
| Both are text, text changed            | Changes just the text of the existing text node                                                     |
| Both are text, text unchanged          | Nothing                                                                                             |
| Different tag (e.g.`p` → `div`)   | Builds a new element (with all its children) and replaces the old one                               |
| Text ↔ element                        | Replaces the node                                                                                   |

For attributes on a kept element:

| Situation                                                         | Result                                                                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Attribute value changed (`!==`)                                 | Written again                                                                                                                    |
| Attribute value unchanged                                         | Not written (but`value`, `checked`, `selected`, `disabled`, `muted` properties are re-synced if the user changed them) |
| Attribute removed from`attrs`, or set to `null`/`undefined` | Removed from the element                                                                                                         |
| Handler changed / removed                                         | See[Events](#events)                                                                                                              |
| Style changed                                                     | See[Styles](#styles)                                                                                                              |

### Matching children

When an element's children change, HHT.js must decide which new child corresponds to which old child. It does this in one of two ways:

| Mode              | When                                                      | How children are matched           |
| ----------------- | --------------------------------------------------------- | ---------------------------------- |
| **Unkeyed** | At least one child (old or new) has no`key`, or is text | By**position**               |
| **Keyed**   | **Every** child, old and new, has a `key`         | By**key** (see [Keys](#keys)) |

**Unkeyed** children are compared in order: the 1st new child with the 1st old child, the 2nd with the 2nd, and so on. Extra old children are removed from the end; extra new children are appended at the end.

Conditional children (`null`, `false`, …) are removed **before** comparing, so when one appears or disappears, the children after it shift one position and are compared with different old children. That is harmless for small, fixed structures, and is the reason to use keys for lists.

### What HHT.js does not do

To set the right expectations:

- It does **not** skip unchanged subtrees: every render compares the whole tree of that container.
- It does **not** batch renders: each `render()` call updates the DOM immediately.
- The keyed algorithm moves elements in one left-to-right pass. It is simple, not a minimal-move algorithm.

---

## Keys

**What it is.** A `key` is a special attribute that says **which item** an element represents in a list:

```js
createElement("ul", { class: "todo-list" },
  todos.map((todo) => createElement("li", { key: todo.id }, [todo.text])),
);
```

**Why it exists.** Without keys, children are matched by position. Remove an item from the middle of a list and the elements after it are **rewritten** to show different items:

```text
Unkeyed (matched by position)

old:  [ A ][ B ][ C ]
new:  [ A ][ C ]

position 1: A → A    unchanged
position 2: B → C    the element that showed B is rewritten to show C
position 3: C → —    the element that showed C is removed
```

The page looks right, but the elements shifted. If the user had focused C's input, the focused element now belongs to nobody. In a long list, removing the first item rewrites every item after it.

With keys, children are matched by identity:

```text
Keyed (matched by key)

old:  [ A ][ B ][ C ]
new:  [ A ][ C ]

A → same element as before (patched if it changed)
B → its element is removed
C → same element as before
```

**How it works.** In a keyed list, HHT.js:

1. removes the elements whose key is gone;
2. for each new child, in order, reuses the element with the same key (patching its attributes, handlers and children normally) or creates a new one;
3. moves reused elements into place if they are not already there.

| Change                  | What happens to the real DOM                                  |
| ----------------------- | ------------------------------------------------------------- |
| Insert an item          | Only the new item's element is created                        |
| Delete an item          | Only that item's element is removed; the others are not moved |
| Reorder items           | The existing elements are moved, not rebuilt                  |
| Item changed            | Its element is kept and patched                               |
| Same key, different tag | The element is rebuilt                                        |

### Rules

- **All or nothing.** A list is keyed only if **every** child, old and new, has a key. If any child lacks one (including text children), the whole list is compared by position and the keys are ignored. Put keyed items in their own parent element (like the `ul` above) rather than mixing them with other children.
- **Unique among siblings.** Two siblings with the same key make `createElement` throw `HHT.js: Duplicate key "1" found among sibling elements.` The same key may be used in a different list.
- **Strings or numbers.** Keys are compared exactly, so `1` and `"1"` are **different** keys. Use one type per list.
- **Stable identity, not the array index.** An index changes when items are removed or reordered, so keying by index gives you the unkeyed behaviour back. Use an ID that belongs to the item.
- **Never rendered.** `key` does not appear in the HTML. If you also want the ID in the page (for CSS or tests), add a normal attribute such as `"data-id": todo.id`, as TodoMVC does.
- **Focus when moving.** In browsers that support `Element.moveBefore()`, a moved element keeps its focus. In others, a focused element can lose focus when **it** is moved. Inserting or removing *other* items never moves it.

### TodoMVC example

`todo/view.js` gives each todo row its ID as the key:

```js
createElement("li", { key: todo.id, "data-id": todo.id, class: classes || null }, [
  // checkbox, label, delete button, edit input
]);
```

Filtering (All / Active / Completed), deleting and clearing completed todos only add or remove the affected rows. A row that stays keeps its DOM element, its checkbox and its listeners.

---

## Refs

**What it is.** A `ref` is a function that HHT.js calls with the **real DOM element** it created:

```js
let inputElement = null;

function saveRef(node) {
  inputElement = node; // the element, or null once it is removed
}

createElement("input", { ref: saveRef });
```

After this is rendered, `inputElement` is the real `<input>`. `ref` is **not** added to the HTML.

**Why it exists.** Sometimes you need the element itself: to call `focus()`, to measure its size, or to change it many times per second. A ref gives you that element without searching the page with `document.querySelector()`.

**When to use refs.** Only for things the virtual node cannot describe: focus, measuring, scrolling, media playback, third-party code, per-frame animation. For everything else (text, attributes, classes, styles), change state and let `render()` update the page.

### When HHT.js calls a ref

| What happens to the element                                    | Ref call                                        |
| -------------------------------------------------------------- | ----------------------------------------------- |
| It is created (by`render()` or `mount()`)                  | `ref(element)`                                |
| It is kept and updated by a later render, same`ref` function | nothing                                         |
| It is kept, but the`ref` function changed (A → B)           | `A(null)`, then `B(element)` (same element) |
| `ref` added (`null` → A) / removed (A → `null`)        | `A(element)` / `A(null)`                    |
| It is removed by a render, or replaced because its tag changed | `ref(null)`                                   |
| `unmount()` on its container                                 | `ref(null)`                                   |
| It is**moved** in a keyed list                           | nothing: moving is not removing                 |
| It was added with`mount()` and is later removed              | nothing:`mount()` does not track its content  |

### Timing

- Refs are called **after** `render()` (or `mount()` / `unmount()`) has finished updating the DOM, just before it returns. The element is complete (attributes, handlers and children are there) and already inside its container. If the container is in the page, you can call `element.focus()` right away.
- All `ref(null)` calls of one render run **before** its `ref(element)` calls. So if the same function moves from an old element to a new one, it ends up holding the new one.
- Inside a tree, children are handled before their parent, both when elements are created and when they are removed.

### Rules

- `ref` must be a function, `null` or `undefined`. Anything else makes `createElement` throw `HHT.js: ref must be a function, null, or undefined.`
- Refs are callback functions only; there are no `{ current }` ref objects.
- Define the function **once**, outside your view function. An inline arrow is a new function on every render, so HHT.js sees a changed ref and calls it with `null` and then the element on **every** render. That works, but does extra work.

### Example: focusing an input

TodoMVC gives a todo's edit input a ref only while that todo is being edited (`todo/view.js`):

```js
function focusElement(element) {
  element?.focus(); // element is null when editing ends
}

createElement("input", {
  class: "edit",
  ref: isEditing ? focusElement : null,
  value: todo.text,
});
```

When editing starts, the ref changes from `null` to `focusElement`, so HHT.js calls it with the input right after the row is re-rendered in edit mode, and the input gets focus. Later renders pass the same function, so it is not focused again. When editing ends, it is called with `null`, which does nothing.

### Example: fast updates without re-rendering

Refs suit things that change every frame, such as a game character's position. Going through `state.set()` and `render()` 60 times per second would rebuild and compare the whole virtual tree each time. With a ref you write to the one element that changes:

```js
import { createElement, render, unmount } from "./framework/index.js";

let playerElement = null;

function playerRef(element) {
  playerElement = element; // the element, or null once it is removed
}

function Game() {
  return createElement("div", { class: "board" }, [
    createElement("div", { class: "player", ref: playerRef }),
  ]);
}

render("#game", Game());

function drawPlayer(x, y) {
  if (!playerElement) return;
  playerElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

// later: unmount("#game") calls playerRef(null), so drawPlayer stops.
```

### Refs and styles: give each property one owner

If the game loop writes `style.transform` through a ref, leave `transform` out of that element's `style` object. Otherwise a render that changes the vnode's `transform` overwrites the ref's value, and the two fight. HHT.js only touches style properties the vnode mentions, so a property written only through the ref is left alone by renders.

The same applies to anything else the vnode controls: if you set `className` through a ref while also passing `class`, the next render may set it back.

---

## Forms

HHT.js has no special form API. Inputs are normal elements with normal attributes and events. Two things matter: which event you listen to, and whether you pass `value` (or `checked`).

### `onInput` vs `onChange`

HHT.js attaches the **browser's** events unchanged:

| Event        | On a text input / textarea                                                                          | On a checkbox, radio or select |
| ------------ | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| `onInput`  | Every keystroke                                                                                     | Every change                   |
| `onChange` | Only when the user**commits** the value (leaves the field, or presses Enter in some browsers) | Every change                   |

So for text you usually want `onInput`. (Some other frameworks rename events so that `onChange` fires on every keystroke. HHT.js does not.)

### Uncontrolled inputs

Don't pass `value`. The browser keeps what the user types, and re-renders never touch it. Read the value from the event when you need it. TodoMVC's new-todo box works this way (`todo/view.js`):

```js
function handleNewTodoKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  const text = event.target.value.trim();
  if (text === "") return;

  event.target.value = ""; // clear the box by hand
  addTodo(createTodo(text));
}

createElement("input", {
  class: "new-todo",
  placeholder: "What needs to be done?",
  autofocus: "",
  onKeydown: handleNewTodoKeydown,
});
```

Good for: inputs whose value you only need at one moment (on Enter, on submit).

### Controlled inputs

Pass `value` from state, and update the state on every keystroke. The state is always the source of truth:

```js
const message = state("");

function MessageBox() {
  return createElement("div", {}, [
    createElement("input", {
      value: message.get(),
      onInput: (event) => message.set(event.target.value),
    }),
    createElement("p", {}, ["You typed: ", message.get()]),
  ]);
}

message.subscribe(() => render("#app", MessageBox()));
render("#app", MessageBox());
```

On every render, HHT.js compares the input's **current** value with the `value` you passed and writes it back only if they differ. In a controlled input they are already equal after each keystroke, so nothing is written and the cursor stays where it is.

Good for: values that other parts of the page show or depend on, and values you need to reset or change from code.

> **Pass `value` → you must store what the user types.** If you pass `value` but don't update the state in `onInput`, the **next render** (caused by anything, even an unrelated state change) puts the input back to the old value.

TodoMVC's edit input relies on this on purpose: it passes `value: todo.text`, so when an edit is cancelled with Escape, the next render resets the input to the saved text.

### Checkboxes and radio buttons: `checked`

`checked` works like `value`: the property is set and re-synced on every render.

```js
createElement("input", {
  type: "checkbox",
  class: "toggle",
  checked: todo.completed,
  onChange: () => toggleTodo(todo.id),
});
```

If the handler does not change state, the next render un-ticks (or re-ticks) the box to match the vnode.

### Select boxes: `selected`

Mark the chosen `<option>` with `selected`:

```js
const size = state("M");

createElement("select", { onChange: (event) => size.set(event.target.value) }, [
  ["S", "M", "L"].map((value) =>
    createElement("option", { value, selected: size.get() === value }, [value]),
  ),
]);
```

Setting `value` on the `<select>` itself does **not** work on the first render: HHT.js sets attributes before it adds the `<option>` children, so there is nothing to select yet. (It is corrected on the next render.) Use `selected` on the options instead.

### `<textarea>`

Use the `value` attribute, as with an input: `createElement("textarea", { value: text.get(), onInput: … })`.

---

## Routing

**What it is.** Routing keeps the page in sync with the URL. HHT.js uses **hash routing**: the route is the part of the address after `#`:

```text
http://localhost:5173/#/            →  route "/"
http://localhost:5173/#/active      →  route "/active"
http://localhost:5173/#/completed   →  route "/completed"
```

**Why hash routing.** Changing the part after `#` never reloads the page and needs no server configuration. The browser's back/forward buttons, bookmarks and refresh all work.

**How it works.** A router stores the current route as a [state](#state). When the URL's hash changes, the router sets that state, and its subscribers run. You subscribe your render function, and your view function asks the router which route is current.

### Quick overview

```js
import { createElement, createRouter, render } from "./framework/index.js";

const router = createRouter();
router.register("/").register("/about");

function renderRoute(path) {
  return createElement("h1", {}, [path === "/about" ? "About" : "Home"]);
}

function renderApp() {
  render("#app", router.getCurrentView(renderRoute));
}

router.subscribe(renderApp); // re-render when the route changes
router.start();              // start following the URL
renderApp();                 // initial render
```

### `createRouter()`

```js
const router = createRouter();
```

Takes no arguments and returns a new router object. Before `start()` is called, its current route is `"/"`, whatever the URL says. (Route-map objects such as `createRouter({ "/": Home })` are **not** supported; any argument is ignored.)

### `router.register(path)`

Marks a path as a known route:

```js
router.register("/");
router.register("/active");
router.register("/completed");
```

- **Returns the router**, so calls can be chained: `router.register("/").register("/active")`.
- **Paths are normalised.** A leading `#` is removed, a leading `/` is added if missing, and trailing slashes are removed. `"active"`, `"/active"`, `"#/active"` and `"/active/"` are all stored as `"/active"`. The same normalisation is applied to the URL, so `#/active/` in the address bar matches `/active`.
- **Matching is exact and case-sensitive.** `/Active` is a different route from `/active`.
- Registering the same path twice does nothing.
- Registering does not attach a view. You decide what each route shows in your `renderRoute` function (see `getCurrentView` below).
- If the router is already started and you register the path the URL is currently on, subscribers are notified, so a 404 page can turn into the real page.

### `router.start()`

```js
router.start();
```

`start()`:

1. starts listening for URL changes (`hashchange` on `window`). This happens only once, however often `start()` is called;
2. if the URL has no `#` part yet, sets it to `#/`;
3. reads the current URL and sets the current route. **Subscribers are called now**, synchronously. Refreshing on `#/completed` therefore restores `/completed`.

Call it once at startup, **after** subscribing to the router. Returns nothing.

(If step 2 changed the URL, the browser fires a `hashchange` shortly afterwards and subscribers are called once more with the same route. That only causes an extra render.)

### `router.getCurrentRoute()`

```js
router.getCurrentRoute(); // e.g. "/active"
```

Returns the current normalised path, **registered or not**.

### `router.getCurrentView(renderRoute)`

```js
router.getCurrentView(renderRoute)
```

`renderRoute` is **your** function: it receives the current path and returns a virtual node.

- If the current path **is registered**, `getCurrentView` calls `renderRoute(path)` and returns its result.
- If it is **not registered**, it returns the built-in 404 view instead, **without** calling your function.

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

### The built-in 404 view

For an unregistered path, `getCurrentView` returns:

```html
<main class="not-found">
  <h1>404 Not Found</h1>
  <p>No route matches /whatever.</p>
</main>
```

You can style it with the `not-found` class. It cannot be replaced through `getCurrentView`. If you want your own 404 page, check the route yourself before calling it:

```js
const known = ["/", "/about"];

function App() {
  const path = router.getCurrentRoute();
  return known.includes(path) ? router.getCurrentView(renderRoute) : MyNotFoundPage(path);
}
```

### `router.subscribe(listener)`

```js
const unsubscribe = router.subscribe((path) => {
  console.log("route is now", path);
});
```

Works exactly like a [state subscription](#state): the listener receives the normalised path and runs **every time the route is set** (on `start()`, on every `hashchange`, on `navigate()` to the current route, and when `register()` adds the route the URL is already on), even if the path did not change. It returns an unsubscribe function with the same rules.

Unsubscribing only stops **your listener**. The router itself keeps watching the URL.

### Navigating

Usually a normal link is all you need:

```js
createElement("a", { href: "#/active" }, ["Active"]);
```

From code (for example after a button click), use `router.navigate(path)`:

```js
router.navigate("/active");
```

- The path is normalised like in `register()`.
- `navigate()` changes the URL to `#/active`. The browser then fires `hashchange`, the router updates its route and your subscribers run. The browser fires that event **just after** `navigate()` returns, so `getCurrentRoute()` shows the new path once the event has run, not on the line right after `navigate()`.
- If you navigate to the route you are already on, subscribers run **straight away**, synchronously.
- Navigating to an unregistered path is allowed; `getCurrentView` then returns the 404 view.
- Call `start()` before navigating. Before `start()`, the URL changes but the router does not notice until `start()` reads it.

Like clicking a link, `navigate()` adds an entry to the browser history, so the back button returns to the previous route.

### Back, forward and refresh

- **Back / forward:** the browser changes the hash and fires `hashchange`; the router follows.
- **Refresh:** the page reloads and your code runs again; `start()` reads the hash, so the same route is shown.
- **Bookmarks / shared links:** same as refresh.

### What the router does not do

- **No route parameters** (`/todos/:id`): each path must be registered exactly.
- **No query strings:** `#/active?x=1` is treated as the unknown route `/active?x=1`.
- **No history-API URLs** (`/active` without `#`).
- **No custom 404 through `getCurrentView`** (see the workaround above).
- **No way to stop the router:** once `start()` has run, it keeps listening to `hashchange`. You can remove your own listeners with the function `subscribe()` returns.
- **No route guards, redirects or nested routes.**

---

## Architecture

### Framework files

```text
framework/
├── index.js    public API: re-exports the seven public functions
├── dom.js      virtual nodes, attributes, styles, refs, keys, rendering and diffing
├── events.js   on… attribute handlers, and on() for any event target
├── store.js    state()
└── router.js   createRouter() and the built-in 404 view
```

| File          | Responsibility                                                                                                                                                                                                | Public exports (via`index.js`)                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `index.js`  | The only file applications import from. Contains no logic.                                                                                                                                                    | all seven                                             |
| `dom.js`    | `createElement` (validation, children normalisation), building real elements, setting attributes/styles/boolean properties, the diff (`render`), keyed lists, refs, `mount`, `unmount`, target lookup | `createElement`, `render`, `mount`, `unmount` |
| `events.js` | Turning`onXxx` attributes into one stable native listener per attribute; `on()` for `window`, `document`, …                                                                                          | `on`                                                |
| `store.js`  | The state container                                                                                                                                                                                           | `state`                                             |
| `router.js` | Hash router. The current route is itself a`state`, and the 404 view is built with `createElement`.                                                                                                        | `createRouter`                                      |

How they depend on each other:

```text
index.js ──► dom.js ──► events.js
         ──► store.js
         ──► router.js ──► dom.js, store.js
         ──► events.js
```

### Internal helpers (not public API)

Some framework files export helpers that other framework files (and the framework's own tests) use. They are **not** exported from `framework/index.js`, may change without notice, and applications should not import them:

| Internal export                             | File          | Used for                                                                     |
| ------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `renderElement(vnode)`                    | `dom.js`    | Building a real DOM node from a virtual node, inside`render` and `mount` |
| `isEvent(name)`                           | `events.js` | Detecting`on…` attribute names                                            |
| `setEventHandler(element, name, handler)` | `events.js` | Keeping one stable native listener per`on…` attribute                     |
| `notFound(path)`                          | `router.js` | Building the built-in 404 view                                               |

### Project files

```text
index.html          page that loads the TodoMVC app (todo/app.js)
package.json        npm scripts: dev (Vite), test (node --test)
framework/          HHT.js itself
todo/               the TodoMVC application (and an older demo)
tests/              automated tests for the framework and TodoMVC
docs/               this documentation and project notes
```

| `todo/` file               | Role                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `app.js`                   | Entry point: creates the router, restores saved todos, wires subscriptions, starts the router, first render     |
| `state.js`                 | Shared state objects (`todoState`, plus `appState`/`counterState` for the demo)                           |
| `actions.js`               | Functions that change state with updater functions (`addTodo`, `toggleTodo`, `deleteTodo`, …)            |
| `view.js`                  | Functions that return virtual nodes for each part of the TodoMVC page                                           |
| `routes.js`                | The three route paths                                                                                           |
| `storage.js`               | Saving/loading todos in`localStorage` (app code, not framework)                                               |
| `demo-app.js`, `page.js` | An earlier counter/message demo. Not loaded by`index.html`; kept because `tests/rendering.test.js` uses it. |

Other Markdown files in the repository are project notes, not user documentation:

| File                            | What it is                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `docs/project.md`             | The original project brief                                                                                                       |
| `docs/Design.md`              | **Historical** early design ideas (`hht.div()`, `hht.mount()`, `hht.router({...})`). That API was never implemented. |
| `docs/TodoMVC-Study.md`       | Notes on TodoMVC's required behaviour and markup                                                                                 |
| `Todo.md`                     | The development roadmap/checklist                                                                                                |
| `PROJECT-AUDIT.md`            | A code audit from an earlier commit; several gaps it lists have since been fixed                                                 |
| `docs/documentation-audit.md` | Report of the audit that produced this documentation                                                                             |

---

## Why HHT.js Is a Framework

A **library** is code **you** call when you want something. Your code stays in control of when and how everything happens. With plain DOM code, for example, you decide exactly which element to change:

```js
// Plain DOM: your code does all the work
button.addEventListener("click", () => {
  count += 1;
  document.querySelector("#count").textContent = `Count: ${count}`;
});
```

A **framework** turns this around. You give it pieces (a description of the page, event handlers, state) and **the framework calls your code** at the right moments and decides how the page is updated. This is called **inversion of control**: control over *when* and *how* things happen moves from your code to the framework. In short: with a library, you call it; with a framework, it calls you.

In HHT.js:

| You provide                                                               | HHT.js calls it / does                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A view function (`App()`) that describes the page for the current state | Creates the real elements, and on every update works out which DOM changes are needed          |
| `onClick: handler`                                                      | Attaches the listener, calls your handler with the event, and swaps or removes it on re-render |
| A`ref` callback                                                         | Calls it with the element when it is created and with`null` when it is removed               |
| A subscriber (`count.subscribe(renderApp)`)                             | Calls it every time the state is set                                                           |
| A`renderRoute(path)` function                                           | Calls it with the current path, or shows a 404 page instead                                    |

```js
// HHT.js: you describe, the framework updates
function App() {
  return createElement("p", { id: "count" }, ["Count: ", count.get()]);
}
```

Your code never looks up an element to change its text. It says what the page should look like, and HHT.js makes the page match.

HHT.js is deliberately small and explicit, so one connection is still yours to make: you decide **which state** triggers a re-render by subscribing your render function to it (see [Connecting State to Rendering](#connecting-state-to-rendering)). From then on, the framework is in charge of the update cycle.

---

## TodoMVC Example

The TodoMVC app (`todo/`) is a full implementation of the [TodoMVC](https://todomvc.com/) specification using only HHT.js. Run `npm run dev` and open the printed address to try it.

It is a good example of how the pieces fit together. This section shows the framework patterns it uses; the complete code is in `todo/`.

### State

One state object holds the todo list and the ID of the todo being edited (`todo/state.js`):

```js
export const todoState = state({ todos: [], editingId: null });
// a todo: { id: string, text: string, completed: boolean }
```

The current filter is **not** stored in state: it comes from the router's current route.

### Wiring it together

`todo/app.js` is the whole application setup:

```js
const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path)); // "/", "/active", "/completed"

function renderApp() {
  render("#app", router.getCurrentView(createTodoPage));
}

// Restore saved todos before anything subscribes (no render, no save yet)
todoState.set((current) => ({ ...current, todos: loadTodos(), editingId: null }));

// Save to localStorage when the todo list changes (see State → "always create a new one")
let savedTodos = todoState.get().todos;
todoState.subscribe(({ todos }) => {
  if (todos === savedTodos) return;
  savedTodos = todos;
  saveTodos(todos);
});

// Render on every state change and every route change
todoState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();
```

### Adding a todo

An **uncontrolled** input with `onKeydown` (`todo/view.js`), and an action that creates a **new** array (`todo/actions.js`):

```js
// view.js
createElement("input", {
  class: "new-todo",
  placeholder: "What needs to be done?",
  autofocus: "",                 // boolean attribute, "" means on
  onKeydown: handleNewTodoKeydown,
});

// actions.js
export function addTodo(todo) {
  todoState.set((current) => ({
    ...current,
    todos: [...current.todos, todo],
  }));
}
```

### Completing and deleting a todo

Each row is **keyed** by the todo's ID. The checkbox uses `checked` (synced every render) and `onChange`; the delete button uses an inline arrow handler:

```js
createElement("li", { key: todo.id, "data-id": todo.id, class: classes || null }, [
  createElement("div", { class: "view" }, [
    createElement("input", {
      class: "toggle",
      type: "checkbox",
      checked: todo.completed,
      onChange: () => toggleTodo(todo.id),
    }),
    createElement("label", { onDblclick: () => startEditing(todo.id) }, [todo.text]),
    createElement("button", { class: "destroy", onClick: () => deleteTodo(todo.id) }),
  ]),
  // edit input, see below
]);
```

```js
export function toggleTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  }));
}

export function deleteTodo(id) {
  todoState.set((current) => ({
    ...current,
    todos: current.todos.filter((todo) => todo.id !== id),
    editingId: current.editingId === id ? null : current.editingId,
  }));
}
```

### Editing a todo

- Double-clicking the label (`onDblclick`) sets `editingId`.
- The row gets the `editing` class, which TodoMVC's CSS uses to show the edit input.
- The edit input gets a **ref** only while editing, which focuses it.
- The edit input is **controlled** by `value: todo.text`, so a cancelled edit is reset by the next render.
- `onKeydown` saves on Enter and cancels on Escape; `onBlur` saves when the user clicks away.

```js
createElement("input", {
  class: "edit",
  ref: isEditing ? focusElement : null,
  value: todo.text,
  onKeydown: (event) => handleEditKeydown(event, todo.id),
  onBlur: (event) => handleEditBlur(event, todo.id),
});
```

### Filtering and routing

The route decides which todos are **rendered**; state always keeps them all:

```js
function filterTodos(todos, route) {
  if (route === "/active") return todos.filter((todo) => !todo.completed);
  if (route === "/completed") return todos.filter((todo) => todo.completed);
  return todos;
}
```

The filter links are normal `href="#/…"` links. The link for the current route gets the `selected` class using a `null`-or-string attribute:

```js
createElement("a", { href: `#${path}`, class: path === currentRoute ? "selected" : null }, [label]);
```

Because rows are keyed, switching filters only adds or removes the affected rows.

### Conditional content

"Clear completed" is only rendered when at least one todo is completed (the function returns `null` otherwise), and the item counter mixes a number child with text:

```js
createElement("span", { class: "todo-count" }, [
  createElement("strong", {}, [count]),
  count === 1 ? " item left" : " items left",
]);
```

### Framework features used by TodoMVC

| Feature                                                              | Where                                 |
| -------------------------------------------------------------------- | ------------------------------------- |
| `createElement`, nesting, nested child arrays                      | everywhere in`view.js`              |
| Conditional children (`null`)                                      | `createClearCompleted`              |
| Number children                                                      | `createTodoCount`                   |
| `class` built from conditions, `null` to omit                    | `createTodoItem`, `createFilters` |
| `data-*` attribute                                                 | `data-id` on each row               |
| Boolean attributes (`checked`, `autofocus: ""`)                  | toggle checkboxes, new-todo input     |
| `onKeydown`, `onChange`, `onClick`, `onDblclick`, `onBlur` | `view.js`                           |
| Inline arrow handlers                                                | row checkbox, label, delete button    |
| Keys                                                                 | each todo`li`                       |
| Refs                                                                 | edit input focus                      |
| Controlled input (`value`) / uncontrolled input                    | edit input / new-todo input           |
| `state`, updater functions, immutable updates                      | `state.js`, `actions.js`          |
| Several subscribers on one state                                     | render + save in`app.js`            |
| Router:`register`, `start`, `subscribe`, `getCurrentView`    | `app.js`                            |

---

## Complete Examples

Each example is a complete, runnable page. Put both files in the project root, run `npm run dev`, and open `http://localhost:5173/<name>.html`.

The HTML file is the same for every example except the script name:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HHT.js example</title>
    <script type="module" src="/counter.js"></script> <!-- change the file name -->
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### Example: Hello World

Shows `createElement` and `render`.

**`hello.js`**

```js
import { createElement, render } from "./framework/index.js";

render("#app", createElement("h1", { class: "title" }, ["Hello, HHT.js!"]));
```

### Example: Counter

Shows state, events, updater functions, a subscription, boolean attributes, conditional children and rendering.

```text
Counter: 0

[ - ] [ Reset ] [ + ]
```

**`counter.js`**

```js
import { createElement, render, state } from "./framework/index.js";

// State: the single number this page shows
const count = state(0);

// Event handlers only change state; they never touch the DOM
function decrease() {
  count.set((current) => current - 1);
}

function increase() {
  count.set((current) => current + 1);
}

function reset() {
  count.set(0);
}

// View: describes the page for the current state
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

// Render the current UI
function renderApp() {
  render("#app", Counter());
}

// Render whenever the state changes
count.subscribe(renderApp);

// Initial render
renderApp();
```

What to notice:

- The handlers only call `count.set(...)`. The page updates because `renderApp` is subscribed to `count`.
- **Reset** is `disabled` exactly when the count is `0`.
- The warning appears only when the count is negative (`false` children are skipped).
- On each click the `h1`, the buttons and the `main` stay the same DOM elements. Only the number, the `disabled` attribute and the warning change.

### Example: Nested UI

Shows nesting, attributes (`class`, `id`, `href`, `for`, `data-*`, `aria-*`), a boolean attribute, a style object and mixed text/element children. It has no state, so it renders once.

**`profile.js`**

```js
import { createElement, render } from "./framework/index.js";

const user = { id: 7, name: "Alice", role: "Admin", email: "alice@example.com", online: true };

function ProfileCard(person) {
  return createElement("article", { class: "card", "data-user-id": person.id }, [
    createElement("header", { class: "card-header" }, [
      createElement("h2", {}, [person.name]),
      createElement(
        "span",
        {
          class: "badge",
          "aria-label": person.online ? "Online" : "Offline",
          style: { backgroundColor: person.online ? "green" : "gray", color: "white" },
        },
        [person.online ? "online" : "offline"],
      ),
    ]),
    createElement("p", {}, ["Role: ", createElement("strong", {}, [person.role])]),
    createElement("p", {}, [
      "Email: ",
      createElement("a", { href: `mailto:${person.email}` }, [person.email]),
    ]),
    createElement("div", { class: "note" }, [
      createElement("label", { for: "note" }, ["Note"]),
      createElement("input", { id: "note", type: "text", placeholder: "Add a note", required: true }),
    ]),
  ]);
}

render("#app", ProfileCard(user));
```

Resulting HTML (formatted):

```html
<article class="card" data-user-id="7">
  <header class="card-header">
    <h2>Alice</h2>
    <span class="badge" aria-label="Online" style="background-color: green; color: white;">online</span>
  </header>
  <p>Role: <strong>Admin</strong></p>
  <p>Email: <a href="mailto:alice@example.com">alice@example.com</a></p>
  <div class="note">
    <label for="note">Note</label>
    <input id="note" type="text" placeholder="Add a note" required="">
  </div>
</article>
```

### Example: List

Shows `map()`, keys, an uncontrolled input, immutable array updates and conditional rendering.

**`list.js`**

```js
import { createElement, render, state } from "./framework/index.js";

// Each item has a stable id, used as its key
let nextId = 1;
const items = state([]);

function addItem(text) {
  items.set((current) => [...current, { id: nextId++, text }]);
}

function removeItem(id) {
  items.set((current) => current.filter((item) => item.id !== id));
}

function moveToTop(id) {
  items.set((current) => [
    ...current.filter((item) => item.id === id),
    ...current.filter((item) => item.id !== id),
  ]);
}

// Uncontrolled input: read the value on Enter, then clear it
function handleKeydown(event) {
  if (event.key !== "Enter") return;
  const text = event.target.value.trim();
  if (text === "") return;
  event.target.value = "";
  addItem(text);
}

function Item(item) {
  return createElement("li", { key: item.id }, [
    item.text,
    " ",
    createElement("button", { type: "button", onClick: () => moveToTop(item.id) }, ["Top"]),
    createElement("button", { type: "button", onClick: () => removeItem(item.id) }, ["Remove"]),
  ]);
}

function App() {
  const list = items.get();

  return createElement("main", {}, [
    createElement("input", { placeholder: "New item, then Enter", onKeydown: handleKeydown }),
    list.length > 0
      ? createElement("ul", {}, list.map(Item))
      : createElement("p", {}, ["Nothing yet."]),
    createElement("p", {}, [list.length, list.length === 1 ? " item" : " items"]),
  ]);
}

function renderApp() {
  render("#app", App());
}

items.subscribe(renderApp);
renderApp();
```

Try it: add a few items, click **Top** on the last one (its `li` element is moved, not rebuilt) and **Remove** on one in the middle (only that `li` is removed). Because every `li` has a `key`, the list is compared by key. The `ul` holds only keyed `li` elements, which is what makes it a keyed list.

### Example: Routing

Shows `createRouter`, `register`, links, `navigate()`, `getCurrentRoute`, `getCurrentView`, the built-in 404 page, and state that survives page switches.

**`pages.js`**

```js
import { createElement, createRouter, render, state } from "./framework/index.js";

// Router with two known routes
const router = createRouter();
router.register("/").register("/about");

// State lives outside the views, so it survives route changes
const likes = state(0);

const links = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
];

// Navigation bar: the link for the current route gets class="selected"
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

// Called by router.getCurrentView() only for registered paths
function renderRoute(path) {
  if (path === "/about") return About();
  return Home();
}

function App() {
  return createElement("div", {}, [
    Nav(router.getCurrentRoute()),
    router.getCurrentView(renderRoute), // 404 view for unknown paths
  ]);
}

function renderApp() {
  render("#app", App());
}

// Re-render on state changes and on route changes
likes.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();
```

Open `http://localhost:5173/pages.html` and try:

- click **About** and **Home**: the URL changes to `#/about` / `#/` and the page switches without reloading;
- click **Like** a few times, go to About and back: the count is kept;
- click **Back to Home** on the About page (navigation from code);
- use the browser's back and forward buttons;
- refresh on `#/about`: you stay on About;
- type `#/nope` in the address bar: you get the 404 page, with the nav still shown.

---

## Error Handling

HHT.js checks the mistakes that are easy to make and hard to spot, and throws an `Error` whose message starts with `HHT.js:`.

### HHT.js errors

| Message                                                                             | Thrown by                          | Cause                                                                                   | Fix                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HHT.js: Mount target "#app" was not found.`                                      | `render`, `mount`, `unmount` | No element matches the selector (wrong ID, or the script ran before the element exists) | Check the selector and that the element is in the HTML. Module scripts run after the HTML is parsed, so`<script type="module">` in `<head>` is fine. |
| `HHT.js: Mount target "###" is not a valid CSS selector.`                         | `render`, `mount`, `unmount` | The string is not valid CSS selector syntax                                             | Fix the selector (`"#app"`, `".root"`)                                                                                                               |
| `HHT.js: Mount target must be a CSS selector string or a DOM element.`            | `render`, `mount`, `unmount` | The target is`null`, a number, an object, a text node, …                             | Pass a selector string or an element. A`null` often means `querySelector` found nothing.                                                             |
| `HHT.js: Event handler "onClick" must be a function, null, or undefined.`         | `createElement`                  | An`on…` attribute has another value, often `false` from `cond && handler`        | Use`cond ? handler : null`                                                                                                                             |
| `HHT.js: ref must be a function, null, or undefined.`                             | `createElement`                  | `ref` is a string, object, …                                                         | Pass a callback`(element) => { … }`                                                                                                                   |
| `HHT.js: style must be a string, object, null, or undefined.`                     | `createElement`                  | `style` is a number, boolean, array or function                                       | Use`"color: red"` or `{ color: "red" }`                                                                                                              |
| `HHT.js: Duplicate key "1" found among sibling elements.`                         | `createElement`                  | Two children of the same parent have the same`key`                                    | Use a unique ID per item (not the text, which can repeat)                                                                                                |
| `HHT.js: Event target must support addEventListener() and removeEventListener().` | `on`                             | The target is`null`, a plain object, …                                               | Pass`window`, `document` or an element                                                                                                               |
| `HHT.js: Event name must be a non-empty string.`                                  | `on`                             | Event name is`""` or not a string                                                     | Pass the browser event name, e.g.`"keydown"`                                                                                                           |
| `HHT.js: Event handler must be a function.`                                       | `on`                             | The handler is missing or not a function                                                | Pass a function                                                                                                                                          |

Errors from `createElement` are thrown before anything is added to the page.

### Mistakes HHT.js does not check

These produce a normal JavaScript or browser error (not an `HHT.js:` one), or no error at all:

| Mistake                                                               | What happens                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `createElement("p", null, …)`                                      | `TypeError` when rendered. Use `{}`.                 |
| A function or plain object as a child                                 | `TypeError` when rendered                              |
| `render(target, null)`                                              | `TypeError`. Use `unmount(target)` to show nothing.  |
| Invalid tag name (`""`, `"my tag"`) or attribute name with spaces | `InvalidCharacterError` from the browser when rendered |
| `subscribe("not a function")`                                       | `TypeError` on the next `set()`                      |
| `getCurrentView(notAFunction)` on a registered route                | `TypeError`                                            |
| `onDoubleClick`, `onKeyPress` typo, or a misspelled event name    | No error: the handler never runs                         |
| `className`, `htmlFor`, `readOnly`                              | No error: the attribute has no effect, or the wrong one  |
| `style: { width: 100 }` or `{ color: false }`                     | No error: the browser ignores the value                  |
| Mutating an object from`get()`                                      | No error: subscribers are not called                     |
| Forgetting to subscribe`renderApp` to a state                       | No error: the page does not update                       |

### Errors thrown by your own code

- An error thrown in an **event handler** is reported by the browser as usual and does not affect HHT.js.
- An error thrown in a **subscriber** comes out of `set()`. The value was already stored, but subscribers after it are not called for that update.
- An error thrown by an **updater** comes out of `set()`; the value is unchanged.
- An error thrown by a **ref** comes out of `render()`/`mount()`/`unmount()`; refs after it in that render are not called.

If `render()` throws **while updating the DOM** (for example because of a function child), the container can be left half-updated, and HHT.js still holds the previous tree. After fixing the cause, call `unmount(target)` and render again for a clean start (or reload the page).

---

## Current Limitations

These are true of the current implementation. Plan around them.

**Elements and children**

- Children must be passed as **one** argument (the third). Extra arguments are ignored.
- **Function children** (e.g. `() => count.get()`) and other objects are not supported: `render()` throws.
- `attrs` must be an object or left out; `null` makes `render()` throw.
- **HTML only.** SVG and MathML elements are not supported (they are created in the HTML namespace and not drawn).
- No components and no raw-HTML insertion (`innerHTML` is not an attribute). A view function can return an array, but only where it is used inside a children list; `render()` itself needs one root node.
- Vnodes and their `attrs` objects must not be changed after they are created.

**Attributes and styles**

- `true`/`false` only have boolean meaning for the [listed boolean attributes](#boolean-attributes), in lower case. Elsewhere `false` is written as the text `"false"`: use `null` to leave an attribute out.
- `class` must be a string (no arrays or objects).
- HTML attribute names only (`class`, `for`), not DOM property names (`className`, `htmlFor`).
- Style objects: HHT.js adds no CSS units, and a `false` value does not remove a property (use `null`).
- A controlled `<select>` (`value` on the `select`) is wrong on its first render; use `selected` on the `<option>`s.

**Events**

- The event name is the lower-cased text after `on`: `onDblClick`, not `onDoubleClick`. Custom events need all-lowercase names.
- Every attribute whose name starts with `on` is treated as an event.
- `on…` attributes take no listener options (`once`, `capture`, `passive`); use `on()` on the element (via a ref).
- No event delegation: each element with a handler gets its own native listener.
- No event modifiers or key shortcuts: check `event.key` etc. yourself.
- Listeners added with `on()` are not removed automatically (not by `unmount()` either).

**State**

- **`set()` does not update the page by itself.** You must subscribe a render function.
- No automatic dependency tracking: you choose which states each render function subscribes to.
- Subscribers run on every `set()`, even when the value did not change.
- Updates are not batched: each `set()` triggers every subscribed render immediately.
- State is not protected: mutating the object returned by `get()` changes it silently.
- `set(fn)` always treats a function as an updater (store a function with `set(() => fn)`).
- No computed/derived state; compute derived values in your view (as TodoMVC does for the item count).

**Rendering and diffing**

- `render()` takes a single root node.
- Every render compares the **whole** virtual tree of its container, even if only one value changed. For large pages, split the page into several containers rendered separately, and use refs for per-frame updates.
- Lists **without keys** are compared by position. A list is keyed only if **every** child has a key.
- In browsers without `Element.moveBefore()`, a focused element that is **moved** within a keyed list may lose focus.
- Changing an element's tag rebuilds that element and everything inside it.
- `mount()` does not support updates, and refs inside mounted content are never called with `null`.
- Refs are callback functions only (no `{ current }` objects).
- There are no lifecycle hooks: refs are the only "element created/removed" notification.

**Routing**

- Hash URLs only (`#/path`); no history-API URLs.
- Exact, case-sensitive paths. No route parameters (`/todos/:id`) and no query strings.
- The 404 view cannot be customised through `getCurrentView`.
- The router cannot be stopped once started.

---

## Possible Future Features

**None of these exist in HHT.js today.** They are ideas collected from the project roadmap (`Todo.md`) and the limitations above, listed so that you don't mistake them for current features:

- route parameters (`/todos/:id`) and query-string support;
- a custom 404 view option and a way to stop a router;
- batching several `set()` calls into one render;
- SVG support;
- derived/computed state.

---

## Public API Reference

All public functions are named exports of `framework/index.js`:

```js
import { createElement, render, mount, unmount, state, createRouter, on } from "./framework/index.js";
```

### Overview

| API                                          | Purpose                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| `createElement(tag, attrs?, children?)`    | Create a virtual node                                           |
| `render(target, vnode)`                    | Render into a container, then update it on later calls          |
| `mount(target, vnode)`                     | Append content once (no tracking, no updates)                   |
| `unmount(target)`                          | Empty a container and forget its previous tree                  |
| `state(initialValue)`                      | Create a piece of state with`get`, `set`, `subscribe`     |
| `createRouter()`                           | Create a hash router                                            |
| `on(target, eventName, handler, options?)` | Listen to an event on any event target; returns a stop function |

### Elements and rendering

| API                                               | Parameters                                                                                                                                                                                              | Returns                      | Notes                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createElement(tag, attrs = {}, children = [])` | `tag`: string. `attrs`: object of attributes, `on…` handlers, `style`, `key`, `ref`. `children`: array or single child; nested arrays flattened; `null`/`undefined`/booleans skipped | `{ tag, attrs, children }` | No DOM work. Throws`HHT.js:` errors for invalid handlers, `ref`, `style`, or duplicate keys.                                                          |
| `render(target, vnode)`                         | `target`: selector string or element. `vnode`: one virtual node                                                                                                                                     | `undefined`                | First call replaces the container's content; later calls diff and patch. Synchronous. Calls refs at the end.                                                |
| `mount(target, vnode)`                          | same as`render`                                                                                                                                                                                       | `undefined`                | Appends; does not remember; repeated calls append copies.                                                                                                   |
| `unmount(target)`                               | `target`: selector string or element                                                                                                                                                                  | `undefined`                | Empties the container, forgets its tree, calls refs with`null`. Keeps the container. Safe to repeat. Does not remove subscriptions or `on()` listeners. |

### State

| API                                 | Parameters                           | Returns              | Notes                                                                                                 |
| ----------------------------------- | ------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `state(initialValue)`             | any value                            | state object         |                                                                                                       |
| `stateObject.get()`               | –                                   | current value        | The stored object itself, not a copy                                                                  |
| `stateObject.set(valueOrUpdater)` | a value, or`(current) => newValue` | `undefined`        | Stores the value, then calls every subscriber synchronously, in order, even if the value is unchanged |
| `stateObject.subscribe(listener)` | `(value) => void`                  | unsubscribe function | Not called immediately. Unsubscribe is safe to call twice.                                            |

### Routing

| API                                    | Parameters          | Returns                | Notes                                                                                                         |
| -------------------------------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createRouter()`                     | –                  | router object          | Current route is`"/"` until `start()`                                                                     |
| `router.register(path)`              | path string         | the router (chainable) | Path normalised (`"active"`, `"#/active"`, `"/active/"` → `"/active"`)                               |
| `router.start()`                     | –                  | `undefined`          | Listens to`hashchange` (once), sets `#/` if no hash, reads the URL and notifies subscribers               |
| `router.navigate(path)`              | path string         | `undefined`          | Sets`location.hash`; subscribers run on the following `hashchange` (immediately if already on that route) |
| `router.getCurrentRoute()`           | –                  | path string            | Registered or not                                                                                             |
| `router.getCurrentView(renderRoute)` | `(path) => vnode` | virtual node           | `renderRoute(path)` for registered paths, otherwise the built-in 404 view                                   |
| `router.subscribe(listener)`         | `(path) => void`  | unsubscribe function   | Runs every time the route is set                                                                              |

### Global events

| API                                          | Parameters                                                                                                                                                                                                                                                   | Returns       | Notes                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `on(target, eventName, handler, options?)` | `target`: object with `addEventListener`/`removeEventListener`. `eventName`: non-empty string, e.g. `"keydown"`. `handler`: `(event) => void`. `options`: boolean or `{ capture, once, passive, signal }`, passed to the browser unchanged | stop function | Each call is an independent listener. The stop function is safe to call twice. Throws`HHT.js:` errors for an invalid target, name or handler. |

### Attribute rules at a glance

| Key in`attrs`                                                                                                            | Behaviour                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `onXxx`                                                                                                                  | Event listener for`xxx` (lower-cased). Function, `null` or `undefined`.                                                   |
| Boolean attributes (`disabled`, `checked`, `hidden`, `required`, `readonly`, … [full list](#boolean-attributes)) | `true` → present; `false`/`null`/`undefined` → absent; other values → present with that value                        |
| `checked`, `selected`, `disabled`, `muted`                                                                         | DOM property also set and re-synced on every render                                                                             |
| `value`                                                                                                                  | DOM property and attribute; property re-synced on every render                                                                  |
| `style`                                                                                                                  | String (whole attribute) or object (per property, camelCase,`--custom` via `setProperty`, no units added, `null` removes) |
| `key`                                                                                                                    | Not rendered. Identity among siblings for keyed diffing.                                                                        |
| `ref`                                                                                                                    | Not rendered. Called with the element after render, with`null` on removal.                                                    |
| any value`null` / `undefined`                                                                                          | Attribute not set / removed                                                                                                     |
| anything else                                                                                                              | `setAttribute(name, value)`: use HTML names (`class`, `for`, `data-*`, `aria-*`)                                      |

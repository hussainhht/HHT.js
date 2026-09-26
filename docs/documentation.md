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
9. [Global events](#global-events)
10. [State](#state)
11. [Rendering](#rendering)
12. [Connecting state to rendering](#connecting-state-to-rendering)
13. [Element refs](#element-refs)
14. [How rendering works](#how-rendering-works)
15. [Routing](#routing)
16. [Why HHT.js is a framework](#why-hhtjs-is-a-framework)
17. [Complete example: counter](#complete-example-counter)
18. [Complete example: pages with routing](#complete-example-pages-with-routing)
19. [API reference](#api-reference)
20. [Current limitations](#current-limitations)

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
  unmount,
  state,
  createRouter,
  on,
} from "./framework/index.js";
```

Import only the functions you use, for example `import { createElement, render } from "./framework/index.js";`. HHT.js uses **named exports** only: there is no `hht` object and no default export.

The path is relative to **your** file. The examples in this guide assume your JavaScript file sits in the project root (next to `index.html`). From a file inside `todo/`, write `"../framework/index.js"` instead, as `todo/app.js` does.

| Export | Use it to |
| --- | --- |
| `createElement` | Describe an element ([Creating elements](#creating-elements)) |
| `render` | Show and update your app on the page ([Rendering](#rendering)) |
| `mount` | Insert content once, without updates ([Rendering](#rendering)) |
| `unmount` | Clear a container and forget what was rendered there ([Rendering](#unmounttarget--clear-a-container)) |
| `state` | Create a piece of state ([State](#state)) |
| `createRouter` | Create a hash router ([Routing](#routing)) |
| `on` | Listen to events on `window`, `document` or any other target ([Global events](#global-events)) |

### How the framework is organised

You don't need to know this to use HHT.js. `index.js` only re-exports functions from the files that implement them:

| File | Contains |
| --- | --- |
| `framework/index.js` | The public API: the seven functions above |
| `framework/dom.js` | Virtual nodes, rendering and the diff (`createElement`, `render`, `mount`, `unmount`) |
| `framework/store.js` | State (`state`) |
| `framework/router.js` | The hash router (`createRouter`) |
| `framework/events.js` | Turns `on…` attributes into event listeners (used by `dom.js`), and `on()` for other targets |

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
| `attrs`    | object                    | `{}`     | Attributes, event handlers, `style` (string or object), and the reserved `key` / `ref`, e.g.`{ class: "title", onClick: fn }` |
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

### Boolean attributes (`hidden`, `disabled`, `required`, …)

In HTML, some attributes are **on when present**, whatever their value. `<input disabled="false">` is still disabled. HHT.js knows these boolean attributes, so you can pass plain `true`/`false`:

```js
createElement("p", { hidden: !isVisible }, ["Hello"]);

createElement("input", { required: isRequired, readonly: isLocked });

createElement("button", { disabled: count === 0 }, ["Reset"]); // disabled only when count is 0
```

| Value | Result |
| --- | --- |
| `true` | The attribute is added (`<input required>`) |
| `false`, `null`, `undefined`, or left out | The attribute is removed. It is never written as `"false"`. |
| A string | Written as given, which in HTML means "on" (`autofocus: ""`, `hidden: "until-found"`) |

HHT.js treats these names as boolean attributes: `allowfullscreen`, `async`, `autofocus`, `autoplay`, `checked`, `controls`, `default`, `defer`, `disabled`, `formnovalidate`, `hidden`, `inert`, `ismap`, `loop`, `multiple`, `muted`, `nomodule`, `novalidate`, `open`, `playsinline`, `readonly`, `required`, `reversed`, `selected`.

Use the **HTML** names, all lower case: `readonly`, not `readOnly`.

Every other attribute keeps its value as text, so `"data-active": false` or `"aria-hidden": false` is written as `"false"`. For `aria-*` attributes that is what you want. For your own `data-*` flags, pass `null` to leave the attribute out.

### `value`, `checked`, `selected` (and `disabled`, `muted`)

For some attributes, what the browser **shows** is a DOM property that can differ from the attribute. When the user ticks a checkbox, `input.checked` changes but the `checked` attribute does not. For `value`, `checked`, `selected`, `disabled` and `muted`, HHT.js therefore also sets the property (`input.checked = true`) and puts it back to the vnode's value on every render (see [Forms](#forms-controlled-and-uncontrolled-inputs)):

```js
createElement("input", { type: "checkbox", checked: true });   // ticked
createElement("input", { type: "checkbox", checked: false });  // not ticked
createElement("input", { type: "text", value: "Draft" });      // value: a string or number
```

The other boolean attributes need nothing extra: setting or removing the attribute is enough for the browser.

### Inline styles

`style` can be a **string**, like in HTML, or an **object** with one entry per CSS property.

**String:**

```js
createElement("div", { style: "color: red; transform: translate(40px, 0)" });
```

The string becomes the element's `style` attribute. When it changes, the whole attribute is replaced.

**Object:**

```js
createElement("div", {
  style: {
    color: "white",
    backgroundColor: "black",
    transform: "translate3d(20px, 30px, 0)",
  },
});
```

Each entry is set on the element's `style` directly (`element.style.backgroundColor = "black"`). Write property names in **camelCase**, as in JavaScript: `backgroundColor`, `marginTop`, `zIndex`. CSS custom properties keep their dashes and are set with `setProperty()`:

```js
createElement("div", { style: { "--player-x": "20px" } });
```

Prefer the object form when values change from render to render:

```js
createElement("span", { style: { color: active ? "green" : "gray", fontWeight: "bold" } });
```

On each render HHT.js compares the new object with the previous one and only touches the properties that differ: if only `color` changed, only `color` is written. A string is replaced as a whole.

Rules for style objects:

| You write | Result |
| --- | --- |
| A property with a string value | That property is set |
| A property with a number | Set exactly as given. HHT.js **does not add units**: `width: 100` is ignored by the browser; write `width: "100px"`. Unitless properties such as `opacity: 0.5` or `zIndex: 2` work. |
| A property set to `null` or `undefined` | That property is removed, e.g. `{ color: isError ? "red" : null }` |
| A property that was in the previous object but is missing now | That property is removed |
| `style: {}`, `style: null`, or no `style` | Every style the previous `style` value set is removed |
| Switching from a string to an object, or back | The old styles are cleared completely, then the new ones are applied |

HHT.js only reads your style object; it never changes it.

`style` must be a string, an object, `null` or `undefined`. Anything else (a number, `true`, an array, a function) throws `HHT.js: style must be a string, object, null, or undefined.` when you call `createElement`.

For styles that change many times per second, such as a moving game character, see [Fast updates without re-rendering](#example-fast-updates-without-re-rendering).

### Attributes that start with `on`

Any attribute name that starts with `on` is treated as an **event handler**, not an attribute. See [Events](#events).

### Reserved attributes: `key` and `ref`

Two attribute names are used by HHT.js itself. Neither is ever added to the real element:

| Attribute | Purpose |
| --- | --- |
| `key` | Identity in a list: tells the renderer which item an element represents |
| `ref` | Access to the real element: a function HHT.js calls with the element |

```js
createElement("li", { key: item.id, ref: saveItem, class: "item" }, [item.name]);
// <li class="item">…</li>   (no key="…" or ref="…" in the HTML)
```

For `key`, use a string or a number that stays the same for the same item (an ID, not the position in the array). See [Keyed lists](#keyed-lists-matched-by-key). For `ref`, see [Element refs](#element-refs).

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

For lists whose items can be added, removed or reordered, give each item a `key` (see [Keyed lists](#keyed-lists-matched-by-key)). With todo objects like `{ id, text }`:

```js
const items = todos.map((todo) =>
  createElement("li", { key: todo.id }, [todo.text]),
);
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

When the page is rendered again (see [Rendering](#rendering)), HHT.js compares each handler with the one from the previous render. If it is the same function, nothing happens. If it is a different function, the old one is removed and the new one is added, so **a handler never runs twice**.

### Handler values

An `on…` attribute must be a **function**, `null` or `undefined`:

```js
createElement("button", { onClick: handleClick });                   // listener attached
createElement("button", { onClick: null });                          // no listener
createElement("button", { onClick: enabled ? handleClick : null });  // only when enabled
```

`null`, `undefined`, or leaving the attribute out all mean "no listener". If a previous render had a handler, it is removed.

Anything else is a mistake, and `createElement` throws straight away, before anything is added to the page:

```js
createElement("button", { onClick: enabled && handleClick });
// when enabled is false:
// Error: HHT.js: Event handler "onClick" must be a function, null, or undefined.
```

`enabled && handleClick` evaluates to `false` when `enabled` is false, so use the `? handleClick : null` form for conditional handlers.

### What `on…` attributes cannot do

- They only attach events to elements you render with `createElement`. For `window`, `document` and other targets, use [`on()`](#global-events).
- They take no listener options such as `once`, `capture` or `passive`. If you need those on an element, get it with a [ref](#element-refs) and use `on(element, …, options)`.

---

## Global events

`onClick`, `onInput` and the other `on…` attributes attach events to elements **you render**. Some events don't belong to any element you render: key presses anywhere on the page, the window being resized, the tab being hidden. For those, use `on()`:

```js
import { on } from "./framework/index.js";

const stop = on(window, "keydown", (event) => {
  console.log(event.key);
});

// later, when you no longer need it:
stop();
```

| You want to listen on… | Use |
| --- | --- |
| An element you render | An `on…` attribute: `createElement("button", { onClick: save })` |
| `window`, `document`, or any other event target | `on(target, "eventname", handler)` |

### `on(target, eventName, handler, options)`

- **`target`**: anything with `addEventListener()` and `removeEventListener()`: `window`, `document`, an element (for example one you got from a [ref](#element-refs)), and so on.
- **`eventName`**: the browser's event name, exactly as `addEventListener` expects it: `"keydown"`, `"keyup"`, `"resize"`, `"visibilitychange"`. Note: this is the plain event name, not the `onKeyDown` attribute form.
- **`handler`**: your function. It receives the browser's normal **event object** (no wrapper), and `this` is the target, just as with `addEventListener`.
- **`options`** (optional): passed to the browser unchanged. Either `true`/`false` (capture), or an object such as `{ capture: true }`, `{ once: true }` or `{ passive: true }`.

**Returns** a function that stops listening. Like the unsubscribe functions from `subscribe()`:

- calling it **more than once is safe**; after the first call it does nothing;
- every `on()` call is its own listener. Registering the same handler twice gives two listeners (it runs twice per event), and each returned function removes only its own. (Plain `addEventListener` would silently ignore the second registration.)
- with `{ once: true }`, the browser removes the listener after it runs once; calling the returned function afterwards is still fine.

Invalid arguments throw an HHT.js error straight away:

| Mistake | Error |
| --- | --- |
| Target is `null`, a number, a plain object, … | `HHT.js: Event target must support addEventListener() and removeEventListener().` |
| Event name is empty or not a string | `HHT.js: Event name must be a non-empty string.` |
| Handler is not a function | `HHT.js: Event handler must be a function.` |

`on()` only adds a listener. It does not create state, render anything or remove itself when something is unmounted: you call the returned function when you are done.

### Example: game keyboard controls

A game should react to the arrow keys no matter which element has focus, so listen on `window` rather than on the board element (a `keydown` handler on the board only runs while the board itself has focus):

```js
import { on } from "./framework/index.js";

const pressedKeys = new Set();

const stopKeyDown = on(window, "keydown", (event) => {
  pressedKeys.add(event.key);
});

const stopKeyUp = on(window, "keyup", (event) => {
  pressedKeys.delete(event.key);
});

// later
stopKeyDown();
stopKeyUp();
```

Keys typed into an input (a chat box, a nickname field) also reach `window`. A game usually ignores movement keys while the user is typing, for example by checking `event.target` before handling the key.

To stop the browser's own reaction to a key (arrow keys scrolling the page, for example), call `preventDefault()` as usual:

```js
on(window, "keydown", (event) => {
  if (event.key === "ArrowUp") event.preventDefault();
});
```

### Example: other global events

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

Moving from one screen to the next (lobby → game → results) then never leaves old keyboard listeners behind.

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

### Stopping a subscription: the unsubscribe function

`subscribe()` returns a **cleanup function**. Call it when you no longer want updates, and that listener is removed:

```js
const unsubscribe = count.subscribe((value) => {
  console.log(value);
});

count.set(1); // logs 1
unsubscribe();
count.set(2); // logs nothing
```

- Each call removes **only its own** subscription; other listeners keep running, in their original order.
- Calling it **more than once is safe**; after the first call it does nothing.
- Every `subscribe()` call is a separate subscription, even if you pass the same function twice. Each one has its own unsubscribe function.

You don't have to unsubscribe everything. A subscription that should last as long as the page, like `todoState.subscribe(renderApp)` in TodoMVC, can simply be left alone. Unsubscribe when something shorter-lived stops needing updates, for example a view you are removing from the page.

**Subscribing or unsubscribing while `set()` is notifying.** A listener may subscribe or unsubscribe listeners (including itself) while it is being called. The rules are:

- a listener removed during an update is **not called** for the rest of that update, or ever again;
- a listener added during an update is first called on the **next** `set()`;
- all other listeners still run, in order. None are skipped.

```js
const unsubscribe = count.subscribe((value) => {
  if (value >= 3) unsubscribe(); // stop listening once we reach 3
});
```

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
| `target` | The container: a **CSS selector string** such as `"#app"`, **or a DOM element**. |
| `vnode`  | **One** virtual node, the root of what you want to show.                                        |

What it does:

- **First call for a target:** builds the real elements and puts them inside the container, **replacing anything that was there before**.
- **Every later call for the same target:** compares the new virtual node with the previous one and changes **only what is different** on the real page. Elements that did not change are kept, so an input keeps its focus, cursor position and typed text.

#### Selector or element

Both of these work, and they mean the same thing:

```js
render("#app", App());
```

```js
const app = document.querySelector("#app");
render(app, App());
```

HHT.js remembers the previous tree **per element**, not per selector. So `render("#app", …)` followed by `render(app, …)` is treated as the same container and diffed normally.

Passing an element is useful when you already have one, for example a container you created yourself. It does not even need to be in the page yet.

If the target is wrong, you get an HHT.js error:

| Target | Error |
| --- | --- |
| A selector that matches nothing | `HHT.js: Mount target "#app" was not found.` |
| A string that is not a valid selector (e.g. `"###"`) | `HHT.js: Mount target "###" is not a valid CSS selector.` |
| Anything else (`null`, a number, a plain object, a text node, …) | `HHT.js: Mount target must be a CSS selector string or a DOM element.` |

The same rules apply to `mount()` and `unmount()`.

`render()` takes a single root. To show several things side by side, wrap them in one element (TodoMVC wraps its app and info footer in a `div`):

```js
render("#app", createElement("div", {}, [
  createElement("section", { class: "todoapp" }, [/* ... */]),
  createElement("footer", { class: "info" }, [/* ... */]),
]));
```

#### Several render roots

A page can have several containers, each rendered separately:

```html
<div id="hud"></div>
<div id="game"></div>
```

```js
render("#hud", Hud());
render("#game", Game());
```

- Each target keeps **its own** previous Virtual DOM tree.
- Rendering one target only compares and updates that target. `render("#hud", Hud())` never looks at `#game`.

This lets you update one part of a page without rebuilding and comparing the rest. You still decide what re-renders when: subscribe each region's render function to the state it uses. HHT.js does **not** work out these dependencies for you.

```js
lives.subscribe(() => render("#hud", Hud()));
board.subscribe(() => render("#game", Game()));
```

### `mount(target, vnode)` — one-time insert only

```js
import { createElement, mount } from "./framework/index.js";

mount("#app", createElement("p", {}, ["Static content"]));
```

`target` works exactly like `render()`'s: a selector or an element.

`mount()` builds the elements and **appends** them to the container. It does not remember what it inserted, so:

- calling `mount()` again adds a **second copy**;
- a later `render()` on the same container ignores what `mount()` put there and replaces it.

Use `mount()` only for content that never changes. For anything that updates, use `render()` from the start. The TodoMVC app only uses `render()`.

### `unmount(target)` — clear a container

```js
import { unmount } from "./framework/index.js";

unmount("#app");
```

```js
const app = document.querySelector("#app");
unmount(app);
```

`unmount()`:

- **removes everything inside** the container, whether it came from `render()` or `mount()`;
- **forgets the previous tree** HHT.js stored for it, so the next `render()` on that container is a fresh first render (everything is built new, nothing is compared with the old content);
- **leaves the container itself** in the page: `<div id="app"><h1>Hello</h1></div>` becomes `<div id="app"></div>`;
- is safe to call on an empty container, or more than once;
- does not affect any other container.

It returns nothing. Use it when switching a region to something completely different, or when a region is no longer needed:

```js
unmount("#lobby");
render("#game", Game());
```

`unmount()` does not remove subscriptions. If a subscription still calls `render()` on that container, the content comes back on the next update. Call the function `subscribe()` returned as well (see [Stopping a subscription](#stopping-a-subscription-the-unsubscribe-function)):

```js
const stopLobby = lobbyState.subscribe(() => render("#lobby", Lobby()));

// leaving the lobby:
stopLobby();
unmount("#lobby");
```

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

All of this happens synchronously: when `set()` returns, the page is already up to date.

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

## Element refs

Sometimes you need the **real** DOM element that HHT.js created: to call `focus()` on it, to measure it, or to change it directly many times per second. Instead of searching the page with `document.querySelector()`, give the element a `ref`: a function that HHT.js calls with the element.

```js
let buttonElement = null;

createElement("button", {
  ref: (element) => {
    buttonElement = element;
  },
}, ["Save"]);
```

After this is rendered, `buttonElement` is the real `<button>`. `ref` is **not** added to the HTML.

### When HHT.js calls a ref

| What happens to the element | Ref call |
| --- | --- |
| It is created | `ref(element)` |
| It is kept and updated by a later render, same `ref` function | nothing |
| It is kept, but the `ref` function changed (A → B) | `A(null)`, then `B(element)` (same element) |
| `ref` added (`null` → A) / removed (A → `null`) | `A(element)` / `A(null)` |
| It is removed, or replaced because its tag changed | `ref(null)` |
| `unmount()` on its container | `ref(null)` |
| It is **moved** in a keyed list | nothing: moving is not removing |

Timing:

- Refs are called **after** `render()` (or `mount()` / `unmount()`) has finished updating the DOM, just before it returns. The element is complete (attributes, event handlers and children are all there) and already inside its container. If the container is in the page, you can call `element.focus()` directly in the ref.
- All `ref(null)` calls of a render run **before** its `ref(element)` calls. So if the same function is moved from an old element to a new one, it ends up with the new one.
- Inside a tree, children are handled before their parent, both when elements are created and when they are removed.

Rules:

- `ref` must be a function, `null` or `undefined`. Anything else throws `HHT.js: ref must be a function, null, or undefined.` when the element is created with `createElement`.
- Define the function **once**, outside your view function (like `playerRef` below). An inline arrow function is a new function on every render, so HHT.js sees a changed ref and calls it with `null` and then the element on **every** render. That still works, but it does extra work.
- Content added with `mount()` gets its refs called when inserted, but since `mount()` does not keep track of what it inserted, those refs are **not** called with `null` later (not even by `unmount()`).

### Example: focusing an input

TodoMVC gives the edit box of a todo a ref only while that todo is being edited (`todo/view.js`):

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

When editing starts, the ref changes from `null` to `focusElement`, so HHT.js calls it with the input right after the row has been re-rendered in edit mode, and the input gets focus. Later renders keep the same function, so it is not focused again. When editing ends, it is called with `null`, which does nothing.

### Example: fast updates without re-rendering

Refs are useful for things that change every frame, such as a game character's position. Going through state and `render()` 60 times per second would rebuild and compare the whole virtual tree each time. With a ref you can write to the one element that changes:

```js
let playerElement = null;

function playerRef(element) {
  playerElement = element; // the element, or null once it is removed
}

function Player() {
  return createElement("div", { key: "player-1", class: "player", ref: playerRef });
}

render("#game", Player());

function drawPlayer(x, y) {
  if (!playerElement) return;
  playerElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
```

After `unmount("#game")`, `playerElement` is `null` again, so `drawPlayer` stops touching an element that is gone.

### Style objects or refs?

Both can set `transform`. Use them for different jobs:

- **Style objects**: when a render happens anyway, for things that change now and then (a player's color when hit, a position after a turn-based move):

  ```js
  createElement("div", {
    class: "player",
    style: {
      position: "absolute",
      transform: `translate3d(${x}px, ${y}px, 0)`,
    },
  });
  ```

- **A ref**: for things that change every frame (smooth 60 FPS movement). Write directly to the element, as in `drawPlayer` above. Do **not** call `state.set()` and `render()` 60 times per second just to move one element: each render rebuilds and compares the whole tree of its container.

**Give each property one owner.** If the game loop writes `style.transform` through a ref, leave `transform` out of that element's `style` object. Otherwise the next render sets `transform` back to the virtual node's value whenever that value changes, and the two keep overwriting each other. HHT.js only touches the style properties the virtual node mentions, so a property written only through the ref (like `transform` in `drawPlayer`) is left alone by renders.

The same applies to anything else the virtual node controls: if you set `className` yourself while also passing `class`, the next render sets it back. Use refs for things the virtual node does not describe, like the game-loop `transform` here, or focus.

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
| New list has more children (unkeyed) | Adds the extra ones at the end                                            |
| New list has fewer children (unkeyed) | Removes the extra ones from the end                                      |
| Keyed list changed                   | Matches items by key: reuses, moves, creates or removes elements          |

### Matching children: by position or by key

When an element's children change, HHT.js has to decide which new child corresponds to which old child. It does this in one of two ways.

| Mode | When | How children are matched |
| --- | --- | --- |
| **Unkeyed** | Any child in the list (old or new) has no `key` | By **position** |
| **Keyed** | **Every** child in the list (old and new) has a `key` | By **key** |

#### Unkeyed lists: matched by position

The 1st new child is compared with the 1st old child, the 2nd with the 2nd, and so on. This is the default and is fine for content that doesn't move around: headers, forms, a fixed set of buttons.

For a list where an item is removed from the **middle**:

```text
old:  [ A ][ B ][ C ]
new:  [ A ][ C ]

position 1: A → A    unchanged
position 2: B → C    the element that showed B is rewritten to show C
position 3: C → —    the element that showed C is removed
```

The page looks right, but the elements have shifted. If the user had focused C's checkbox, that checkbox is the one removed. In a long list, removing the first item rewrites every item after it.

Conditional children (`null`, `false`, …) are removed **before** comparing, so when one appears or disappears, the children after it shift one position too.

#### Keyed lists: matched by key

Give every item a `key` that identifies it:

```js
const items = todos.map((todo) =>
  createElement("li", { key: todo.id }, [todo.text]),
);

createElement("ul", { class: "todo-list" }, items);
```

Now HHT.js matches old and new children by key:

```text
old:  [ A ][ B ][ C ]
new:  [ A ][ C ]

A → same element as before (patched if it changed)
B → its element is removed
C → same element as before
```

The same happens for insertions (only the new item's element is created), reordering (the existing elements are moved, not rebuilt) and a mix of all three.

Why this helps:

- **Stable elements:** each item keeps its own element, so focus, typed text and other browser state stay with the right item;
- **Less work:** removing, inserting or reordering items only touches the elements that really changed;
- a matched element is still **patched normally**: if its attributes, text or event handlers changed, they are updated.

Rules for keys:

- `key` is never added to the real HTML element.
- Keys only need to be **unique among siblings**. The same key can be used in a different list.
- Two siblings with the same key throw `HHT.js: Duplicate key "1" found among sibling elements.` when the list is created.
- Use strings or numbers. Keys are compared exactly, so `1` and `"1"` are **different** keys. Keep one type per list.
- Use an ID that belongs to the item, not its array index: an index changes when items are removed, which defeats the purpose.
- If **any** child in the list has no key, the whole list is compared by position and the keys are ignored for that list. Give keys to all items or to none.
- Moving a focused element keeps its focus in browsers that support `moveBefore()` (recent Chrome/Edge). In other browsers, focus may be lost when **that** element moves. Removing or inserting other items never moves the remaining ones, so their focus is kept everywhere.

TodoMVC gives each todo row `key: todo.id` in `todo/view.js`.

#### Other rule

Keep the **tag** of an element stable between renders. If the tag changes (for example `p` → `div`), HHT.js throws the old element away and builds a new one, even when the key is the same.

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

This works like a state subscription: the listener runs every time the route is set. Subscribe your render function so the page follows the URL:

```js
router.subscribe(renderApp);
router.start();
renderApp();
```

`router.subscribe()` also returns an unsubscribe function, with the same rules as [state subscriptions](#stopping-a-subscription-the-unsubscribe-function):

```js
const unsubscribe = router.subscribe(renderApp);

// later, when this code should stop following the URL:
unsubscribe();
```

Unsubscribing only stops **your listener**. The router itself keeps watching the URL.

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
- No way to stop the router itself: once `start()` has run, it keeps listening for URL changes. (You *can* remove your own listeners with the function `subscribe()` returns.)

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
import { createElement, render, mount, unmount, state, createRouter } from "./framework/index.js";
```

#### Elements and rendering

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `createElement(tag, attrs = {}, children = [])` | `tag`: string; `attrs`: object of HTML attributes, `on…` handlers, `style` (string or object), and the reserved `key` (list identity) and `ref` (callback receiving the real element); `children`: array (nested arrays flattened; `null`/`undefined`/booleans skipped) or a single child | Virtual node `{ tag, attrs, children }` | Describes an element. Throws if two children have the same `key`, if `ref` is not a function/`null`/`undefined`, or if `style` is not a string/object/`null`/`undefined`. |
| `render(target, vnode)` | `target`: CSS selector string or DOM element; `vnode`: one virtual node | nothing | First call: replaces the container's content. Later calls: updates only what changed. **Use this to show and update your app.** |
| `mount(target, vnode)` | `target`: CSS selector string or DOM element; `vnode`: one virtual node | nothing | Appends the elements once; no updates, no tracking |
| `unmount(target)` | `target`: CSS selector string or DOM element | nothing | Empties the container (content from `render` or `mount`) and forgets its previous tree; the next `render` starts fresh. Safe to repeat. |

#### State

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `state(initialValue)` | any value | state object | Creates a piece of state |
| `stateObject.get()` | – | current value | Reads the value (the stored object itself, not a copy) |
| `stateObject.set(valueOrUpdater)` | a new value, or `(current) => newValue` | nothing | Replaces the value, then calls every subscriber synchronously |
| `stateObject.subscribe(listener)` | `(value) => {}` | unsubscribe function | Calls `listener` after every `set()`. Call the returned function to remove this subscription (safe to call twice). |

#### Routing

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `createRouter()` | – | router object | Creates a hash router (starts at route `"/"`) |
| `router.register(path)` | path string | the router (chainable) | Marks a path as a known route |
| `router.start()` | – | nothing | Listens for URL changes, sets `#/` if no hash, reads the current URL |
| `router.navigate(path)` | path string | nothing | Changes the URL to `#path` |
| `router.getCurrentRoute()` | – | path string, e.g. `"/active"` | Current path (registered or not) |
| `router.getCurrentView(renderRoute)` | `(path) => vnode` | virtual node | `renderRoute(path)` for registered paths, otherwise the built-in 404 view |
| `router.subscribe(listener)` | `(path) => {}` | unsubscribe function | Calls `listener` whenever the route is set. Call the returned function to remove this subscription. |

#### Global events

| API | Parameters | Returns | Purpose |
| --- | --- | --- | --- |
| `on(target, eventName, handler, options?)` | `target`: any object with `addEventListener`/`removeEventListener` (`window`, `document`, elements…); `eventName`: non-empty string such as `"keydown"`; `handler`: `(event) => {}`, receives the native event; `options`: optional boolean or `{ capture, once, passive, … }`, passed to the browser unchanged | stop function | Adds a listener. The stop function removes exactly this listener; calling it again does nothing. Throws an HHT.js error for an invalid target, name or handler. |

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
| `onXxx` (any key starting with `on`) | Event listener for event`xxx` (lower-cased). Must be a function, `null` or `undefined` (else `createElement` throws); `null`/missing = no listener. |
| Boolean HTML attributes (`hidden`, `disabled`, `required`, `readonly`, `open`, … see [the list](#boolean-attributes-hidden-disabled-required-)) | `true` → present; `false`/`null`/`undefined` → absent; a string → written as given |
| `checked`, `selected`, `disabled`, `muted` | Boolean attributes whose DOM property is also set and re-synced every render |
| `value`                                | Set as DOM property and attribute; re-synced every render if the user changed it |
| value`null` or `undefined`           | Attribute is not set / is removed                                                |
| `key`                                  | Not an attribute: identifies the element among its siblings for keyed diffing; never rendered |
| `ref`                                  | Not an attribute: function called with the real element after render, and with `null` when it is removed; never rendered |
| `style` (string)                         | Set as the whole `style` attribute; replaced as a whole when it changes |
| `style` (object)                         | Each property set on `element.style` (camelCase names; `--custom` names via `setProperty`); only changed properties are written; `null`/`undefined`/missing properties are removed; no units added |
| anything else                            | `setAttribute(key, value)`: use HTML names (`class`, `for`, `data-*`)    |

---

## Current Limitations

These are true of the current version. Plan around them.

**Elements and attributes**

- Children must be passed as **one array** (third argument). Extra arguments are ignored.
- **Function children** (e.g. `() => count.get()`) are not supported and cause an error.
- `attrs` must be an object; `null` causes an error. Use `{}`.
- `true`/`false` only have boolean meaning for the [listed boolean attributes](#boolean-attributes-hidden-disabled-required-). For any other attribute, `false` is written as the text `"false"`: use `null` to leave it out.
- HHT.js does not add CSS units to numbers in style objects: write `"100px"`, not `100`.
- In style objects, only names starting with `--` are treated as custom properties (set with `setProperty()`); write all other names in camelCase (`backgroundColor`).
- `class` must be a string (no arrays or objects).
- Every attribute whose name starts with `on` is treated as an event.
- A controlled `<select>` (`value` on the `select`) is not selected correctly on its first render, because the value is set before the `<option>`s are added. Use `selected: true` on the right `<option>` instead.

**Events**

- The event name is the lower-cased text after `on`. Use `onDblClick` (not `onDoubleClick`). Custom events must have all-lowercase names.
- `on…` values must be functions, `null` or `undefined`: write `onClick: enabled ? handler : null`, not `enabled && handler` (which throws an HHT.js error when `enabled` is false).
- `on…` attributes take no listener options (`once`, `capture`, `passive`); use `on()` on the element (via a ref) when you need them.
- Listeners added with `on()` are not removed automatically (not by `unmount()` either); call the function it returns.
- There are no event modifiers or shortcuts (such as an "Enter only" handler): check `event.key` etc. in your handler.
- Inline arrow functions are new on every render, so HHT.js removes and re-adds those listeners on each render. This is correct but does extra work.

**State**

- **`set()` does not update the page by itself.** You must `subscribe` a render function.
- Subscribers run on every `set()`, even when the value did not change.
- Updates are not batched: each `set()` means one full render.
- A function cannot be stored as a state value (it is treated as an updater).
- State is not protected: changing the object returned by `get()` changes the state silently, without notifying subscribers.

**Rendering**

- `render()` takes a single root node.
- Every render rebuilds the **whole** virtual tree for that container and compares all of it, even if only one value changed. For large pages, split the page into several containers rendered separately.
- Lists **without keys** are still compared by position: removing an item from the middle rewrites every item after it, and a focused element can end up showing a different item. Give dynamic lists a `key` on every item.
- A list is keyed only if **every** child has a key; mixing keyed and unkeyed siblings falls back to position.
- In browsers without `moveBefore()` support, an element that is **moved** within a keyed list loses focus. Removing or inserting other items does not move it.
- Changing an element's tag rebuilds that element and everything inside it.
- `mount()` does not support updates (use `render()` for content that changes).
- Refs are callback functions only (no `{ current }` ref objects).
- Refs of content added with `mount()` are never called with `null`.

**Routing**

- Hash URLs only (`#/path`).
- No route parameters (`/todos/:id`) and no query strings.
- The 404 view cannot be customised through `getCurrentView`.
- The router cannot be stopped.

> **Warning:** This file contains early design ideas and may not match the current HHT.js API.
> See [`documentation.md`](documentation.md) for the current user documentation.

# hht.js Design Overview

## Goal

`hht.js` is a lightweight JavaScript framework designed to be simple for beginners while still giving advanced users more control.

The main goal is:

* Simple syntax for common tasks.
* Clear APIs that are easy to understand.
* Advanced options when more control is needed.

---

# 1. Creating Elements

Elements are created using simple helper functions:

```js
hht.button("Save");

hht.div(
  hht.h1("Todo App"),
  hht.p("Welcome")
);
```

For more control, users can use the advanced API:

```js
hht.createElement("button", {
  attrs: {
    class: "primary"
  },
  children: ["Save"]
});
```

---

# 2. Attributes

Attributes are passed using an object:

```js
hht.input({
  type: "text",
  placeholder: "Add task..."
});
```

The framework handles applying these values to the DOM element.

---

# 3. Children

Child elements are passed directly inside the parent:

```js
hht.div(
  hht.h1("Title"),
  hht.button("Click")
);
```

Supported children:

* Elements
* Text
* Numbers
* Arrays
* Conditional values

Example:

```js
hht.p("Hello");
```

---

# 4. Events

Events are declared inside the options object:

```js
hht.button("Save", {
  onClick: saveTodo
});
```

Common events:

```js
onClick
onInput
onChange
onSubmit
```

Advanced users can access lower-level event options.

---

# 5. State

State is created using:

```js
const count = hht.state(0);
```

Read state:

```js
count.get();
```

Update state:

```js
count.set(1);
```

Or update using the previous value:

```js
count.set(value => value + 1);
```

When state changes, the UI should update automatically.

---

# 6. Mounting the Application

Applications are mounted using:

```js
hht.mount("#app", App());
```

Example:

```html
<div id="app"></div>
```

---

# 7. Routing

Routes are registered using:

```js
hht.router({
  "/": Home,
  "/todos": Todos,
  "/about": About
});
```

Navigation should happen without a full page reload.

---

# Example Application

```js
const todos = hht.state([]);

function App() {
  return hht.div(
    hht.h1("My Todo App"),

    hht.button("Add Todo", {
      onClick: () => {
        console.log("Add");
      }
    })
  );
}

hht.mount("#app", App());
```

---

# Design Philosophy

hht.js should feel:

* Easy like writing normal JavaScript.
* Simple for beginners.
* Flexible for advanced users.
* Clear and readable.
* Lightweight and understandable.

## Element Creation

`hht.js` will use one core `createElement()` function to create DOM elements.

Simple helper functions such as:

```js
hht.div()
hht.button()
hht.input()
hht.p()
```

will use the same core element creation system internally.

For example:

```js
hht.button("Save", {
  class: "primary",
  onClick: saveTodo
});
```

will internally create a native DOM element using:

```js
document.createElement("button");
```

The core element creator will be responsible for:

* Creating the DOM element.
* Applying attributes and properties.
* Attaching events.
* Adding text and child elements.
* Returning the finished DOM element.

This keeps the public API simple while keeping the internal implementation centralized and reusable.

## Attributes

In `hht.js`, element attributes will be passed using a JavaScript object.

Example:

```js
hht.button("Save", {
  id: "save-btn",
  class: "primary",
  disabled: false
});
```

Another example:

```js
hht.input({
  type: "text",
  placeholder: "Write a task...",
  name: "todo"
});
```

The framework will read the object and apply the values to the created DOM element.

For example:

```js
{
  id: "save-btn",
  class: "primary"
}
```

can internally become:

```js
element.setAttribute("id", "save-btn");
element.setAttribute("class", "primary");
```

### Special Properties

Some properties may need special handling.

For example:

```js
hht.input({
  value: "Hello",
  checked: true,
  disabled: false
});
```

Properties such as `value`, `checked`, and `disabled` can be assigned directly to the DOM element when appropriate.

### Events

Event properties can use the same options object:

```js
hht.button("Save", {
  class: "primary",
  onClick: saveTodo
});
```

`hht.js` will detect properties beginning with `on`, such as `onClick` or `onInput`, and treat them as events instead of normal attributes.

### Design Goal

Attributes should use a simple object syntax because it is readable, familiar to JavaScript developers, and easy to extend.

```js
hht.element(content, {
  attribute: value,
  onEvent: handler
});
```

This keeps element configuration in one clear place while allowing `hht.js` to handle the DOM details internally.

## Child Elements

In `hht.js`, child elements will be passed directly as arguments to the parent element.

Example:

```js
hht.div(
  hht.h1("Todo App"),
  hht.p("Welcome to hht.js"),
  hht.button("Add Todo")
);
```

Each element inside `hht.div()` becomes a child of the `div`.

### Nested Elements

Elements can be nested naturally:

```js
hht.div(
  hht.header(
    hht.h1("My Todos")
  ),

  hht.main(
    hht.p("Tasks for today")
  )
);
```

This makes the structure of the JavaScript code look similar to the final HTML structure.

### Lists of Children

`hht.js` should also support arrays of elements.

For example:

```js
hht.ul(
  todos.map(todo =>
    hht.li(todo.text)
  )
);
```

The framework will flatten the array and add each item as a child of the parent element.

### Text Children

Strings and numbers can also be used as children:

```js
hht.p("Hello");

hht.span(10);
```

The framework will convert them into text nodes automatically.

### Empty Values

Values such as `null`, `undefined`, and `false` can be ignored.

This allows conditional rendering:

```js
hht.div(
  isLoggedIn && hht.p("Welcome back!")
);
```

If `isLoggedIn` is false, no child element will be added.

### Design Goal

Child elements should be easy to read and nest:

```js
hht.parent(
  hht.child(),
  hht.child()
);
```

The framework should accept:

* DOM elements
* Text
* Numbers
* Arrays of children
* Nested children
* Conditional empty values

This keeps the syntax simple while still supporting more complex interfaces.

## Text Children

In `hht.js`, strings and numbers passed as children will automatically become text nodes.

### Simple Text

```js
hht.p("Hello World");
```

This will render:

```html
<p>Hello World</p>
```

Internally, `hht.js` can create a text node using:

```js
document.createTextNode("Hello World");
```

### Numbers

Numbers should also be supported:

```js
hht.p("Score: ", 10);
```

This will render:

```html
<p>Score: 10</p>
```

`hht.js` will automatically convert numbers into text.

### Mixing Text and Elements

Text and elements can be used together:

```js
hht.p(
  "Welcome ",
  hht.strong("Hussein"),
  "!"
);
```

This will render:

```html
<p>Welcome <strong>Hussein</strong>!</p>
```

### Dynamic Text

Text can also be generated from state:

```js
const count = hht.state(0);

hht.p(
  "Count: ",
  () => count.get()
);
```

When the state changes, `hht.js` should update the dynamic text without requiring the user to manually modify the DOM.

### Empty Values

Values such as:

```js
null
undefined
false
```

should be ignored instead of being rendered as text.

For example:

```js
hht.p(
  isAdmin && "Admin"
);
```

If `isAdmin` is `false`, nothing will be rendered.

### Safe Text

Normal strings should be treated as text rather than HTML.

For example:

```js
hht.p("<strong>Hello</strong>");
```

should display the text:

```text
<strong>Hello</strong>
```

instead of creating an HTML element.

This helps prevent accidental HTML injection and keeps text rendering predictable.

### Design Goal

Text children should work naturally:

```js
hht.p("Hello");

hht.p("Score: ", 10);

hht.p(
  "Welcome ",
  hht.strong("Hussein")
);
```

`hht.js` will handle converting strings and numbers into text nodes automatically while keeping text safe and easy to use.

## Event Declaration

In `hht.js`, events will be declared inside the element options object using readable names such as:

```js
onClick
onInput
onChange
onSubmit
onKeyDown
```

### Simple Syntax

```js
hht.button("Save", {
  onClick: saveTodo
});
```

Another example:

```js
hht.input({
  placeholder: "Write a task...",
  onInput: handleInput
});
```

Users can also write the event logic inline:

```js
hht.button("Delete", {
  onClick: () => {
    deleteTodo();
  }
});
```

### Multiple Events

An element can have more than one event:

```js
hht.input({
  onInput: handleInput,
  onFocus: handleFocus,
  onBlur: handleBlur
});
```

### Event Object

The handler will receive the native browser event object:

```js
hht.input({
  onInput: (event) => {
    console.log(event.target.value);
  }
});
```

### Advanced Event Options

For advanced users, `hht.js` can later support a more detailed event configuration:

```js
hht.createElement("button", {
  events: {
    click: {
      handler: saveTodo,
      once: true,
      capture: false
    }
  }
});
```

### Internal Behavior

`hht.js` will detect properties that start with `on` and convert them into native event listeners.

For example:

```js
onClick: saveTodo
```

can internally become:

```js
element.addEventListener("click", saveTodo);
```

### Design Goal

The common event API should stay simple and readable:

```js
hht.button("Save", {
  onClick: saveTodo
});
```

Advanced event controls can be available when needed without making normal event handling more complicated.

## Application Mounting

In `hht.js`, the application will be mounted using a simple `mount()` function.

### Basic Usage

```js
hht.mount("#app", App());
```

The first argument is the target element where the application should be rendered.

The HTML can contain:

```html
<div id="app"></div>
```

The application can be defined as:

```js
function App() {
  return hht.div(
    hht.h1("My Todo App"),
    hht.p("Built with hht.js")
  );
}
```

Then mounted with:

```js
hht.mount("#app", App());
```

### Using a DOM Element

Advanced users can also pass a DOM element directly:

```js
const root = document.querySelector("#app");

hht.mount(root, App());
```

### Internal Behavior

The `mount()` function will:

1. Find the target element.
2. Clear existing content if necessary.
3. Render the application element.
4. Append it to the target.
5. Initialize any reactive behavior required by the framework.

Internally, this may use native DOM operations such as:

```js
const root = document.querySelector("#app");
root.appendChild(app);
```

### Error Handling

If the target element does not exist, `hht.js` should provide a clear error.

For example:

```text
hht.js: Mount target "#app" was not found.
```

### Design Goal

Mounting an application should require only one clear line:

```js
hht.mount("#app", App());
```

The goal is to keep application startup simple while still allowing advanced users to pass a DOM element directly when needed.

## State Creation

In `hht.js`, state will be created using a simple `state()` function.

### Basic Usage

```js
const count = hht.state(0);
```

The value passed to `hht.state()` becomes the initial value of the state.

State can hold different types of data.

### Number State

```js
const count = hht.state(0);
```

### String State

```js
const name = hht.state("Hussein");
```

### Boolean State

```js
const isOpen = hht.state(false);
```

### Array State

```js
const todos = hht.state([]);
```

### Object State

```js
const user = hht.state({
  name: "Hussein",
  loggedIn: true
});
```

### Reading State

The current value can be accessed using:

```js
count.get();
```

### Updating State

The value can be changed using:

```js
count.set(1);
```

For example:

```js
const count = hht.state(0);

count.set(count.get() + 1);
```

### Advanced State Creation

For users who need more control, `hht.js` can later provide an advanced API:

```js
const count = hht.createState(0, {
  onChange: (newValue, oldValue) => {
    console.log(oldValue, newValue);
  }
});
```

The simple `state()` API should remain the default for normal use.

### Design Goal

Creating state should require only one clear line:

```js
const state = hht.state(initialValue);
```

The returned state object should provide a predictable interface:

```js
state.get();
state.set(newValue);
```

The goal is to keep state creation simple for beginners while leaving room for advanced state behavior when needed.

## State Updates

In `hht.js`, state will be updated using the `set()` method.

### Basic Update

```js
const count = hht.state(0);

count.set(5);
```

The new value replaces the previous state value.

### Updating Based on the Previous Value

`set()` can also accept a function that receives the current value:

```js
count.set(current => current + 1);
```

This makes updates easier when the new value depends on the old value.

For example:

```js
hht.button("Increase", {
  onClick: () => {
    count.set(current => current + 1);
  }
});
```

### Updating Arrays

Arrays should be updated by creating a new array:

```js
const todos = hht.state([]);

todos.set(current => [
  ...current,
  {
    text: "Learn hht.js",
    completed: false
  }
]);
```

### Updating Objects

Objects can be updated in the same way:

```js
const user = hht.state({
  name: "Hussein",
  online: false
});

user.set(current => ({
  ...current,
  online: true
}));
```

### Reactive Updates

When state changes, `hht.js` should notify anything that depends on that state.

For example:

```js
const count = hht.state(0);

hht.p(() => `Count: ${count.get()}`);
```

When this runs:

```js
count.set(current => current + 1);
```

the displayed text should update automatically.

### Design Goal

State updates should support both direct values:

```js
state.set(newValue);
```

and updater functions:

```js
state.set(current => newValue);
```

This keeps simple updates easy while making more complex updates predictable and readable.

## Route Registration

In `hht.js`, routes will be registered using a simple route map.

### Basic Usage

```js
hht.router({
  "/": Home,
  "/about": About,
  "/todos": Todos
});
```

Each key represents a URL path, and each value represents the component or function that should be rendered for that route.

Example:

```js
function Home() {
  return hht.h1("Home");
}

function Todos() {
  return hht.h1("Todos");
}

hht.router({
  "/": Home,
  "/todos": Todos
});
```

### Dynamic Routes

Dynamic route parameters can also be supported:

```js
hht.router({
  "/": Home,
  "/todos": Todos,
  "/todos/:id": TodoDetails
});
```

For a URL such as:

```text
/todos/15
```

`hht.js` should match:

```text
/todos/:id
```

and provide the route parameter to the component:

```js
function TodoDetails(params) {
  return hht.h1(`Todo ${params.id}`);
}
```

### Advanced Registration

For advanced users, `hht.js` can also support a more detailed route configuration:

```js
hht.createRouter({
  routes: [
    {
      path: "/",
      component: Home
    },
    {
      path: "/todos/:id",
      component: TodoDetails
    }
  ],
  notFound: NotFound
});
```

This advanced syntax can later support additional options such as metadata, route guards, or custom behavior.

### Design Goal

The default route registration should stay simple:

```js
hht.router({
  "/": Home,
  "/todos": Todos
});
```

The framework should store these routes internally and match them against the current browser URL when navigation happens.

```JavaScript
import hht from "./hht.js";

const todos = hht.state([]);

function addTodo(text) {
  todos.set(current => [
    ...current,
    {
      id: Date.now(),
      text,
      completed: false
    }
  ]);
}

function Home() {
  return hht.div(
    hht.h1("My Todos"),

    hht.input({
      placeholder: "What needs to be done?",
      onEnter: value => addTodo(value)
    }),

    hht.ul(
      () =>
        todos.get().map(todo =>
          hht.li(
            hht.input({
              type: "checkbox",
              checked: todo.completed
            }),

            hht.span(todo.text)
          )
        )
    )
  );
}

function About() {
  return hht.div(
    hht.h1("About"),
    hht.p("This app was built with hht.js")
  );
}

hht.router({
  "/": Home,
  "/about": About
});

hht.mount("#app", Home());
```

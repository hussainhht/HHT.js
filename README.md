framework name : HHT.js


Use a progressive API design:
simple and readable syntax for beginners,
with lower-level APIs for advanced users who need more control.


## Element Creation

In `hht.js`, users should be able to create elements with a simple and readable syntax.

### Simple Syntax

For common use cases, elements can be created using helper functions:

```js
hht.button("Save");
```

Elements can also accept options such as classes and events:

```js
hht.button("Save", {
  class: "primary",
  onClick: saveTodo
});
```

Other HTML elements follow the same pattern:

```js
hht.div(
  hht.h1("My Todo App"),
  hht.p("Welcome to hht.js")
);
```

### Advanced Syntax

For users who need more control, `hht.js` can provide a lower-level API:

```js
hht.createElement("button", {
  attrs: {
    type: "button",
    class: "primary"
  },
  events: {
    click: saveTodo
  },
  children: ["Save"]
});
```

### Design Goal

The goal is to keep the default syntax simple for beginners while still giving advanced users access to more detailed control when needed.

Internally, `hht.js` can translate these APIs into native browser DOM operations such as:

```js
document.createElement("button");
```

The user should not need to work directly with low-level DOM APIs for normal use.



## Event Handling

In `hht.js`, events should be simple to attach directly when creating an element.

### Simple Syntax

For common events, users can use readable event properties such as `onClick`, `onInput`, and `onChange`.

```js
hht.button("Save", {
  onClick: saveTodo
});
```

Another example:

```js
hht.input({
  placeholder: "Write a task...",
  onInput: (event) => {
    console.log(event.target.value);
  }
});
```

This keeps event handling close to the element and makes the code easy to understand.

### Inline Event Logic

Users can also write the event logic directly:

```js
hht.button("Increase", {
  onClick: () => {
    count.set(count.get() + 1);
  }
});
```

### Advanced Syntax

For users who need more control, `hht.js` can provide a lower-level event configuration:

```js
hht.createElement("button", {
  children: ["Save"],

  events: {
    click: {
      handler: saveTodo,
      once: false,
      capture: false
    }
  }
});
```

This can allow advanced users to control event options without making the simple API complicated.

### Design Goal

The default event syntax should be short and readable:

```js
onClick: saveTodo
```

while the advanced API can expose more detailed event behavior when needed.

Internally, `hht.js` can translate these event definitions into native browser event listeners such as:

```js
element.addEventListener("click", saveTodo);
```

The goal is to make common event handling easy while still allowing advanced users to access more control.




## State Management

In `hht.js`, state should be simple to create, read, and update.

### Simple Syntax

A user can create state using:

```js
const count = hht.state(0);
```

The current value can be read with:

```js
count.get();
```

The value can be updated with:

```js
count.set(1);
```

For example:

```js
const count = hht.state(0);

hht.button("Increase", {
  onClick: () => {
    count.set(count.get() + 1);
  }
});
```

When the state changes, parts of the UI that depend on that state should update automatically.

For example:

```js
hht.p(() => `Count: ${count.get()}`);
```

If `count` changes from `0` to `1`, the displayed value should update without the user manually changing the DOM.

### Updating More Complex State

State can also store arrays and objects:

```js
const todos = hht.state([]);
```

A new todo can be added by updating the state:

```js
todos.set([
  ...todos.get(),
  {
    text: "Learn hht.js",
    completed: false
  }
]);
```

### Advanced Syntax

Advanced users can have more control over state behavior:

```js
const count = hht.createState(0, {
  onChange: (newValue, oldValue) => {
    console.log("State changed:", oldValue, newValue);
  }
});
```

This could later support additional options such as custom comparison logic or subscriptions.

### Design Goal

The basic state API should stay small and predictable:

```js
const state = hht.state(initialValue);

state.get();
state.set(newValue);
```

The framework should handle updating dependent UI automatically whenever the state changes.

The goal is to make state management easy for beginners while still leaving room for more advanced control when needed.



## Routing

In `hht.js`, routing should be simple to define and easy to read.

### Simple Syntax

Users can define routes using a simple object:

```js
hht.router({
  "/": Home,
  "/about": About,
  "/todos": Todos
});
```

Each path points to a component or function that should be rendered when that route is active.

Example:

```js
function Home() {
  return hht.h1("Home");
}

function About() {
  return hht.h1("About");
}
```

### Navigation

Users should be able to navigate without reloading the whole page:

```js
hht.navigate("/todos");
```

Links can also use the router:

```js
hht.link("Todos", {
  to: "/todos"
});
```

### Dynamic Routes

Advanced routes can support parameters:

```js
hht.router({
  "/": Home,
  "/todos": Todos,
  "/todos/:id": TodoDetails
});
```

For example:

```text
/todos/12
```

The framework should make the `id` available to the page:

```js
function TodoDetails(params) {
  return hht.h1(`Todo ${params.id}`);
}
```

### Advanced Syntax

Users who need more control can use a detailed route configuration:

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

This advanced API can later support features such as route guards, metadata, and custom behavior.

### 404 Route

The router should support a fallback page when no route matches:

```js
function NotFound() {
  return hht.h1("404 - Page Not Found");
}
```

### Design Goal

The basic routing API should stay small and readable:

```js
hht.router({
  "/": Home,
  "/todos": Todos
});

hht.navigate("/todos");
```

The router should update the displayed page and browser URL without performing a full page reload.

Internally, `hht.js` can use browser APIs such as:

```js
history.pushState();
window.location;
popstate;
```

The goal is to make routing easy for beginners while still allowing more advanced routing features when needed.

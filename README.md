framework name : HHT.js

Use a progressive API design:
simple and readable syntax for beginners,
with lower-level APIs for advanced users who need more control.

```
mini-framework/
│
├── package.json
├── README.md
├── index.html
│
├── framework/
│   ├── index.js
│   ├── dom.js
│   ├── store.js
│   ├── router.js
│   ├── events.js
│   └── app.js
│
├── todo/
│   ├── app.js
│   ├── actions.js
│   ├── components/
│   └── styles.css
│
└── docs/
    └── documentation.md
```

HHT.js will use direct event listeners.

### Todo Object

Each todo will contain only the data needed to represent the task.

```js
{
  id: string,
  text: string,
  completed: boolean
}

id uniquely identifies the todo.
text stores the todo content.
completed stores whether the todo is finished.

Editing state will not be stored inside each todo.
The application can keep the ID of the todo currently being edited separately.

The todo object should stay small and avoid storing values that can be derived from other state.
```




### Edit Mode State

Edit mode will be stored separately from the todo objects.

### Persistence

Todos survive a page refresh; edit mode does not.

- **Todos** are saved to `localStorage` under the key `todos-hhtjs`, following
  the TodoMVC `todos-<framework>` naming. The stored shape is the same
  `{ id, text, completed }` object used in state.
- **Edit mode** (`editingId`) is not saved. A refresh always starts with no todo
  being edited.
- **The current filter** is not saved either. It already lives in the URL hash
  (`#/`, `#/active`, `#/completed`), so a refresh restores it through the router.

Persistence is app code in `todo/storage.js`, not part of the framework. The
framework's store has no knowledge of storage; `todo/app.js` loads the saved
todos once at startup and saves whenever the todo list changes.

What matters about `localStorage` for this:

- It stores **strings only**, so todos are written with `JSON.stringify` and
  read back with `JSON.parse`.
- It is **per origin** (scheme + host + port). `localhost:5173` and
  `127.0.0.1:5173` have separate storage.
- It is **synchronous** and small (about 5 MB per origin), which is fine for a
  todo list.
- **Reading and writing can throw**: storage can be disabled or blocked by the
  browser, and writes fail when it is full. Saved data can also be corrupt or
  come from an older format. In every case the app falls back to an empty list
  instead of crashing, and keeps working in memory.

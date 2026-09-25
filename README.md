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

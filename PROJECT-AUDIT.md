> **Historical snapshot.** This audit describes commit `0719855` (2026-09-26). Several gaps it reports have since been fixed: keyed lists, `unsubscribe`, element render targets, `unmount()`, refs, global events (`on()`), style objects, full boolean-attribute handling and stable event listeners now exist. Line numbers refer to the old code. For the current behaviour, see [`docs/documentation.md`](docs/documentation.md).

# HHT.js Project Audit

> Audit date: 2026-09-26 · Commit audited: `0719855` (Stage 22 — Persistence) · Test run: `npm test` → **32/32 passing**
>
> Scope: every file in the repository was read (`framework/*`, `todo/*`, `tests/*`, `README.md`, `Todo.md`, `docs/*`, `index.html`, `package.json`). The source code was treated as the source of truth. No source file was modified.
>
> Conventions used in this report:
> - **Fact** statements cite a file and line (`framework/dom.js:151`).
> - **Recommendation** statements are labelled as such.
> - Numbers marked *measured* come from a throwaway probe script run against the real framework modules with a fake DOM (scratchpad only, not committed). They measure framework JavaScript overhead and DOM-operation counts, **not** real browser layout/paint time.

---

## 1. Executive Summary

HHT.js is a small (≈285 lines across 4 files) framework made of:

| Module | Lines | What it really is |
|---|---|---|
| `framework/dom.js` | 170 | Plain-object virtual nodes + a **keyless, index-based virtual DOM diff/patch** (`render`) |
| `framework/events.js` | 9 | `on*` attribute → `element.addEventListener()` (direct listeners, no delegation) |
| `framework/store.js` | 27 | A minimal observable value: `get` / `set` (value or updater) / `subscribe` |
| `framework/router.js` | 79 | Hash router whose current path is itself an HHT `state` |

**What works well (facts):**

- The four required pillars exist and are exercised end-to-end by a working TodoMVC and 32 passing tests.
- Rendering is **not** a naive full DOM rebuild. `render()` builds a new virtual tree and patches the existing DOM in place, so inputs keep focus, cursor position and typed text across re-renders (`tests/dom.test.js:212`, `tests/todo-add.test.js:29`).
- Event handlers are swapped cleanly on re-render — no duplicate listeners (`framework/dom.js:101-105`, `tests/dom.test.js:289`).
- Text is always inserted with `createTextNode`, never `innerHTML`, so it is injection-safe.
- TodoMVC behaviour (add, toggle, delete, edit with dblclick/Enter/Escape/blur, toggle-all, clear completed, counter, filters, persistence) is implemented and tested.

**What is wrong or missing (facts):**

1. **There is no user documentation.** The project brief requires a Markdown document explaining how to create elements, events, nesting and attributes. `README.md` is design notes plus the pasted project brief; `docs/Design.md` documents an API (`hht.div()`, `hht.mount()`, `hht.router({...})`, auto-updating UI) that **does not exist in the code**. An auditor following the docs would fail on the first line.
2. **There is no public entry point.** No `framework/index.js`, no `hht` object, no tag helpers. Users must import from four internal files.
3. **UI updates are not automatic.** `state.set()` only calls subscribers; the application must wire `state.subscribe(() => render(...))` itself (`todo/app.js:32-33`).
4. **Subscriptions cannot be removed.** `subscribe()` returns `undefined` (`framework/store.js:23-25`).
5. **List diffing is keyless.** Removing an item from the middle of a list re-patches every following item.

**Bomberman readiness (conclusion):** The current architecture does **not** do the "dangerous" thing (it never recreates all DOM nodes on a state change — *measured*: moving one player in a 169-cell board re-rendered with **0 new DOM nodes** and **1 attribute write**). But every state change rebuilds and diffs **the entire application tree** (map + players + HUD + chat), lists have no keys, there is no batching, no unsubscribe, no window-level keyboard API and no way to get a reference to a rendered element. These are 🟠 High issues for a 60 FPS game, not 🔴 blockers. The recommended direction is to **keep the small VDOM for UI**, add a handful of targeted features (keys, element targets, unsubscribe, refs, global events), and drive high-frequency movement from a `requestAnimationFrame` loop that writes `transform` directly — **not** to rewrite HHT.js as React or as a fully fine-grained reactive system.

---

## 2. Current Project Structure

```text
mini-framework/
├── index.html                 Loads todomvc-app-css and /todo/app.js (module)
├── package.json               "type":"module"; dev = vite, test = node --test
├── README.md                  Design notes + pasted project brief (not user docs)
├── Todo.md                    28-stage roadmap; stages 1–22 checked (uncommitted blank-line edit)
├── docs/
│   ├── Design.md              API design sketch (describes an API that is not implemented)
│   ├── TodoMVC-Study.md       TodoMVC behaviour/markup study notes
│   └── project.md             Copy of the mini-framework brief
├── framework/
│   ├── dom.js                 createElement, renderElement, mount, render (+ private diff helpers)
│   ├── events.js              isEvent, addEvent
│   ├── store.js               state
│   └── router.js              createRouter, notFound
├── todo/
│   ├── app.js                 TodoMVC entry point (wiring: router, state, storage, render)
│   ├── view.js                TodoMVC view functions
│   ├── actions.js             Todo actions + leftover counter/message demo actions
│   ├── state.js               todoState + leftover appState/counterState
│   ├── routes.js              routePaths { home, active, completed }
│   ├── storage.js             localStorage load/save
│   ├── demo-app.js            Stage-10 demo app entry (only used by a test)
│   └── page.js                Stage-10 demo page (only used by demo-app + a test)
└── tests/                     14 files, node:test, fake DOM (no jsdom dependency)
```

Files promised by `README.md:7-30` / `Todo.md:45-68` that **do not exist**: `framework/index.js`, `framework/app.js`, `todo/components/`, `todo/styles.css`, `docs/documentation.md`.

**How to run (fact):** `npm install` then `npm run dev` (Vite) from the root; `index.html` references `/node_modules/todomvc-app-css/index.css`, so `npm install` is required. This is not written down anywhere for a user.

---

## 3. Current Public API

There is no single public module. The "public API" below is every export a user could reasonably import.

| Function | File | What it does | Complete? | Current usage |
|---|---|---|---|---|
| `createElement(tag, attrs = {}, children = [])` | `framework/dom.js:33` | Returns a plain virtual node `{ tag, attrs, children }`. Children are flattened (`flat(Infinity)`) and `null`/`undefined`/`true`/`false` are removed. Does **not** create a DOM element. | 🟡 Children must be an array or single value (variadic args are silently dropped — *measured*). `attrs = null` crashes later in `renderElement`. | `createElement("li", { "data-id": todo.id, class: classes \|\| null }, [...])` — `todo/view.js:125` |
| `renderElement(vnode)` | `framework/dom.js:41` | Converts a virtual node to a real DOM node recursively (`document.createElement` / `createTextNode`), applies attributes and events. | ✅ as an internal helper. Exported, but no app code uses it; only tests. | `renderElement(createElement("input", {...}))` — `tests/dom.test.js:91` |
| `mount(selector, vnode)` | `framework/dom.js:151` | `querySelector(selector).appendChild(renderElement(vnode))`. | 🟡 Appends (never clears), does not remember the tree, so a later `render()` on the same root throws the mounted DOM away. Calling it twice produces two copies (*measured*). Not used by any app code. | `mount("#app", createElement("div"))` — `tests/dom.test.js:81` |
| `render(selector, vnode)` | `framework/dom.js:155` | First call: `root.replaceChildren(renderElement(vnode))`. Later calls: diff the new tree against the previous one (stored in a `WeakMap` keyed by root element) and patch the DOM. | ✅ for the single-root case. Keyless. Selector string only. | `render("#app", router.getCurrentView(createTodoPage))` — `todo/app.js:12` |
| `state(initialValue)` | `framework/store.js:1` | Returns `{ get, set, subscribe }`. | 🟡 No unsubscribe, no equality check. | `export const todoState = state({ todos: [], editingId: null })` — `todo/state.js:9` |
| `state.get()` | `framework/store.js:7` | Returns the current value (by reference). | ✅ | `const { todos, editingId } = todoState.get()` — `todo/view.js:230` |
| `state.set(valueOrUpdater)` | `framework/store.js:11` | If argument is a function, `value = fn(value)`; otherwise replace. Then calls every listener synchronously with the new value. | ✅ (see §6 for caveats) | `todoState.set((current) => ({ ...current, editingId: id }))` — `todo/actions.js:104` |
| `state.subscribe(listener)` | `framework/store.js:23` | Pushes listener into an array. Returns `undefined`. | 🟡 No way to unsubscribe. | `todoState.subscribe(renderApp)` — `todo/app.js:32` |
| `createRouter()` | `framework/router.js:18` | Creates a hash router. Returns `{ register, navigate, start, getCurrentRoute, getCurrentView, subscribe }`. | 🟡 No params, no route→view map, no stop/cleanup. | `const router = createRouter()` — `todo/app.js:8` |
| `router.register(path)` | `framework/router.js:31` | Adds a normalized path to a `Set`. Chainable. | ✅ | `Object.values(routePaths).forEach((path) => router.register(path))` — `todo/app.js:9` |
| `router.navigate(path)` | `framework/router.js:40` | Sets `window.location.hash` (or re-syncs if unchanged). | ✅ (unused by TodoMVC, which uses `<a href="#/...">`) | `router.navigate("/active")` — `tests/router.test.js:38` |
| `router.start()` | `framework/router.js:50` | Adds a `hashchange` listener once; sets `#/` if there is no hash; syncs state. | ✅ | `router.start()` — `todo/app.js:34` |
| `router.getCurrentRoute()` | `framework/router.js:66` | Returns the normalized current path (even if unregistered). | ✅ | `tests/router.test.js:34` |
| `router.getCurrentView(renderRoute)` | `framework/router.js:69` | If the current path is registered, returns `renderRoute(path)`; otherwise returns `notFound(path)`. | ✅ | `router.getCurrentView(createTodoPage)` — `todo/app.js:12` |
| `router.subscribe(listener)` | `framework/router.js:73` | Forwards to the route state's `subscribe` (and forwards its `undefined` return value). | 🟡 No unsubscribe. | `router.subscribe(renderApp)` — `todo/app.js:33` |
| `notFound(path)` | `framework/router.js:11` | Returns a fixed `<main class="not-found">` 404 virtual node. | ✅ but not customisable. | Used internally and in `tests/router.test.js:36` |
| `isEvent(name)` / `addEvent(el, name, fn)` | `framework/events.js:1,5` | Internal helpers: `name.startsWith("on")`; `addEventListener(name.slice(2).toLowerCase(), fn)`. | Internal — exported only so `dom.js` can import them. | `framework/dom.js:49-50` |

**APIs from the prompt/design docs that do NOT exist:** `hht` (namespace or default export), `hht.div()` / `hht.button()` / `hht.input()` / any tag helper, `hht.mount()` / `hht.render()` / `hht.state()` / `hht.router()` / `hht.createRouter()` as namespaced calls, `hht.createState()`, `hht.element()`.

---

## 4. DOM Abstraction

### What HHT.js actually uses

**Virtual DOM with an index-based diff** (plus direct DOM for first render).

- `createElement` builds plain objects (the exact `{ tag, attrs, children }` shape shown in `docs/project.md:145-173`).
- `renderElement` turns them into DOM nodes with `document.createElement`, `setAttribute`, property writes for a few special attributes, and `appendChild` (`framework/dom.js:41-61`).
- `render` keeps the previous virtual tree per root (`mountedTrees`, `framework/dom.js:3`) and patches:
  - text ↔ text: update `textContent` only if different (`dom.js:132-136`);
  - text ↔ element or different tag: replace the node (`dom.js:138-144`);
  - same tag: `updateAttributes` then `patchChildren` (`dom.js:146-147`);
  - children: trim extra DOM children from the end, then patch/append **by index** (`dom.js:112-126`).
- It is **not** templating, **not** data binding, and **not** fine-grained reactivity. There is no dependency tracking between state and DOM nodes.

### Application code and raw DOM

The TodoMVC view is built entirely through `createElement`; application code never calls `document.createElement`, `appendChild` or `innerHTML`. However, it does reach into the DOM for focus management because the framework has no ref/focus facility:

| Raw DOM use in app code | Location | Why |
|---|---|---|
| `event.target.closest("li").querySelector(".edit").focus()` | `todo/view.js:95` | Focus the edit input after double-click |
| `event.target.blur()` | `todo/view.js:106` | Leave the hidden edit input |
| `event.target.value = ""` | `todo/view.js:49` | Clear the uncontrolled new-todo input |

These are reasonable (reading/writing the event target is normal), but `querySelector` + `focus()` is a leak of the abstraction that a small `ref` feature would remove.

### Feature table

| DOM Feature | Status | Location | Notes |
|---|---|---|---|
| Creating elements | ✅ Implemented | `dom.js:33`, `dom.js:46` | Virtual node, then `document.createElement(node.tag)` |
| Tag names | ✅ Implemented | `dom.js:46`, `dom.js:142` | Tag compare is case-insensitive |
| Attributes (generic) | ✅ Implemented | `dom.js:17-31` | `setAttribute(name, value)`; `null`/`undefined` removes |
| DOM properties (generic) | ❌ Missing | — | Only `value`, `checked`, `disabled`, `selected` are written as properties. No way to set e.g. `scrollTop`, `indeterminate`, `el.style.transform` |
| `class` | 🟡 Partial | `dom.js:29` | String only. No array/object form. Must use `class`, not `className` (undocumented) |
| `id` | ✅ Implemented | `dom.js:29` | Tested `tests/dom.test.js:88` |
| `value` | ✅ Implemented | `dom.js:25-27`, `dom.js:93-95` | Property **and** attribute set; re-synced if the user changed it and the vnode value did not (controlled input). Omitting `value` leaves input uncontrolled (typed text preserved) |
| `checked` | ✅ Implemented | `dom.js:4`, `dom.js:20-24`, `dom.js:96-97` | Property synced; re-synced after user clicks. Tested `tests/dom.test.js:322` |
| `disabled` | ✅ Implemented | `dom.js:4` | Same mechanism as `checked` |
| Other boolean attributes (`hidden`, `readonly`, `required`, `multiple`, `autofocus`, `open`) | ⚠️ Problem | `dom.js:4`, `dom.js:29` | Not in `booleanAttributes`, so `hidden: false` becomes `hidden="false"` — **the element is still hidden** (*measured*) |
| `style` | 🟡 Partial | `dom.js:29` | String works (`style: "transform: ..."`). An object becomes `style="[object Object]"` (*measured*). Each change rewrites the whole style attribute |
| `<select value>` | ⚠️ Problem | `dom.js:48-58` | Attributes are applied before children, so on first render the `<option>`s don't exist yet when `value` is set |
| Text children | ✅ Implemented | `dom.js:42-44` | `createTextNode` — HTML-safe |
| Number children | ✅ Implemented | `dom.js:42` | `0` is kept and rendered. Tested `tests/dom.test.js:118` |
| Nested children | ✅ Implemented | `dom.js:56-58` | Tested `tests/dom.test.js:104` |
| Arrays of children | ✅ Implemented | `dom.js:6-9` | Flattened to any depth |
| Variadic children `createElement("p", {}, "a", "b")` | ❌ Missing | `dom.js:33` | Only the third argument is read; `"b"` is silently dropped (*measured*) |
| Conditional children | ✅ Implemented | `dom.js:8` | `cond && vnode` works. Tested `tests/dom.test.js:306`, used `todo/view.js:199` |
| `null` | ✅ Implemented | `dom.js:8` | Skipped |
| `undefined` | ✅ Implemented | `dom.js:8` | Skipped |
| `false` / `true` | ✅ Implemented | `dom.js:8` | Skipped |
| Function children (`() => count.get()`) | ⚠️ Problem | `dom.js:41-48` | Documented in `docs/Design.md:485-491`; not supported — a function child reaches `document.createElement(undefined)` then `Object.entries(undefined)` → **TypeError** |
| Deep nesting | ✅ Implemented | `dom.js:6-9`, recursive render/patch | Recursion depth only limited by JS stack |
| `attrs` = `null` | ⚠️ Problem | `dom.js:48` | `Object.entries(null)` throws (*measured*) |
| Mounting | 🟡 Partial | `dom.js:151`, `dom.js:155` | Two functions with different semantics: `mount` appends and forgets; `render` replaces/patches and remembers. Only `render` supports updates. Target must be a selector string (Design.md promises DOM elements too) |
| Re-rendering / patching | ✅ Implemented | `dom.js:155-170` | Index-based diff, node reuse. Tested `tests/dom.test.js:249` |
| Keyed children | ❌ Missing | `dom.js:112-126` | No `key` support; reordering/removal shifts and re-patches siblings |
| Unmounting | ❌ Missing | — | No `unmount(target)`; no way to clear a root and forget its tree |
| Mount-target error | ✅ Implemented | `dom.js:63-71` | `HHT.js: Mount target "#x" was not found.` |
| Element refs (get the real node) | ❌ Missing | — | App uses `querySelector` (`todo/view.js:95`) |
| Raw HTML (`innerHTML`) escape hatch | ❌ Missing (by design) | — | Not required; its absence is a safety feature |

---

## 5. Event System

### Mechanism (fact)

- **Direct listeners.** Any attribute whose name starts with `on` is treated as an event (`events.js:1-3`). The event name is `name.slice(2).toLowerCase()` and the handler is attached with `element.addEventListener(eventName, handler)` (`events.js:5-9`).
- **No delegation**, no synthetic events, no wrapper — the handler receives the **native event object** (`tests/dom.test.js:156`).
- On re-render, `updateAttributes` compares handler references. If different, the old one is removed and the new one added (`dom.js:101-105`). If the attribute is gone, the old handler is removed (`dom.js:83-85`). Replaced/removed DOM nodes take their listeners with them to GC.

### Checks

| Check | Status | Evidence / Notes |
|---|---|---|
| `click` | ✅ | `onClick` — `todo/view.js:140`, `tests/dom.test.js:143` |
| `input` | ✅ | `onInput` — `todo/page.js:29`, `tests/dom.test.js:156` |
| `change` | ✅ | `onChange` — `todo/view.js:77`, `todo/view.js:131` |
| `submit` | ✅ (untested) | `onSubmit` → `"submit"`; no test or usage |
| `keydown` | ✅ | `onKeydown` / `onKeyDown` both work (lower-cased) — `todo/view.js:60`, `tests/dom.test.js:171` |
| `keyup` | ✅ (untested) | `onKeyup` / `onKeyUp` |
| `focus` / `blur` | ✅ | `onBlur` — `todo/view.js:149`, `tests/todo-edit.test.js:25` |
| Double click | 🟡 | Works only as `onDblclick` / `onDblClick` (`todo/view.js:135`). The natural `onDoubleClick` becomes `"doubleclick"`, which is not a DOM event — **silently never fires** |
| Custom events | 🟡 | Work only if the event name is all-lowercase (`onGameover` → `"gameover"`). `"gameOver"` or `"game:over"` style names cannot be listened to reliably |
| Multiple events on one element | ✅ | `tests/dom.test.js:190`; `todo/view.js:145-150` (keydown + blur) |
| Native event object | ✅ | Passed straight through |
| Removing events | ✅ | Omit the attribute or pass `null`/`undefined` → `removeEventListener` (`dom.js:83-85`, `dom.js:101-105`) |
| Conditional handler `onClick: cond && fn` | ⚠️ | When `cond` is false, `addEventListener("click", false)` → **TypeError** (*measured*) |
| Event cleanup on node removal | ✅ | Removed nodes are dropped; no framework-held references |
| Listener duplication after re-render | ✅ No duplication | `tests/dom.test.js:289` |
| Listener **churn** after re-render | ⚠️ | Inline arrow handlers are new functions on every render, so each render does `removeEventListener` + `addEventListener` for every one of them. TodoMVC: 3 per todo row (`todo/view.js:131,135,140`) + 2 on the edit input. *Measured* game probe: 4 players with inline `onClick` → 4 remove + 4 add **per frame** |
| `once` / `capture` / `passive` | ❌ Missing | No options argument is ever passed (`events.js:8`). `docs/Design.md:617-629` describes an `events: {...}` form that is not implemented |
| `window` / `document` events | ❌ Missing | The only way to listen to global `keydown`/`keyup`/`resize` is to call `window.addEventListener` in app code. The router itself does this internally (`router.js:52`) |
| Any `on*` attribute is an event | 🟢 Note | A real attribute starting with "on" cannot be set as an attribute. Acceptable, but should be documented |

**Brief compliance note.** `docs/project.md:203` says the event mechanism "must be different from the `addEventListener()` method". HHT.js users declare `onClick: fn` and never call `addEventListener` themselves; internally it is still `addEventListener`. This is the common interpretation and is defensible, but the documentation should explicitly explain it ("why things work the way they work", `docs/project.md:128`).

### Events Bomberman will need

| Event | Target | Clean today? |
|---|---|---|
| `keydown` / `keyup` (movement, bomb) | `window`/`document` (game must not depend on a focused element) | ❌ Needs `window.addEventListener` in app code, or a focusable game container with `tabindex` + `onKeydown` (works, but loses input when focus moves to chat) |
| `input`, `keydown` Enter (nickname, chat) | element | ✅ |
| `click` (join, ready, send) | element | ✅ |
| `blur` (chat box) | element | ✅ |
| `dblclick` | element | ✅ (as `onDblclick`) |
| `submit` (chat form) | element | ✅ but no `preventDefault` helper — handler must call `event.preventDefault()` |
| `visibilitychange`, `beforeunload` | `document`/`window` | ❌ Same gap as keyboard |

---

## 6. State Management

### Implementation (`framework/store.js`, complete source is 27 lines)

```text
state(initial)
  value     ← closure variable
  listeners ← array

get()        → return value
set(x)       → value = typeof x === "function" ? x(value) : x
               for each listener: listener(value)      (synchronous, in subscribe order)
subscribe(f) → listeners.push(f)                        (returns undefined)
```

### Feature checks

| Feature | Status | Evidence / Notes |
|---|---|---|
| Creating state | ✅ | `state(initial)` — `store.js:1` |
| Reading | ✅ | `get()` returns the stored reference |
| Updating (value) | ✅ | `tests/store.test.js:9` |
| Functional/updater updates | ✅ | `tests/store.test.js:11`, all TodoMVC actions |
| Subscriptions | ✅ | `tests/store.test.js:15` |
| Unsubscribing | ❌ | `subscribe` returns `undefined`; `router.subscribe` forwards it (`router.js:73-75`), which suggests an unsubscribe was intended but never implemented. `tests/todo-dom.js:127-130` even documents the resulting leak ("earlier copies are still subscribed to state") |
| Multiple states | ✅ | `todo/state.js` defines three |
| Shared/global state | ✅ | ES-module singletons (`todo/state.js`) imported by any module. Tested `tests/state-sharing.test.js`. Satisfies "state reachable at every time" (`docs/project.md:197`) |
| Arrays / Objects / Primitives | ✅ | Any value is stored as-is |
| Storing a function as a value | ⚠️ | Impossible: `set(fn)` always treats a function as an updater |
| Preventing accidental mutation | ❌ | `get()` returns the live object; `todoState.get().todos.push(x)` mutates state with no notification. Immutability is only a convention (`todo/actions.js:52-53` comment) |
| Change detection | ❌ | `set()` notifies even when the value is identical (*measured*: two `set(1)` on a state already `1` → 2 notifications) |
| Batching | ❌ | Each `set()` notifies immediately. Two `set()` calls in one handler → two full renders |
| Error isolation | 🟢 | A throwing listener stops all later listeners for that `set()` |
| Subscribe during notify | 🟢 | `for…of` over the live array will also call a listener added during notification |
| Advanced `createState(initial, { onChange })` | ❌ | Documented in `docs/Design.md:817-822`, not implemented |

### What exactly happens after `state.set(...)` in TodoMVC

```text
todoState.set(updater)                        framework/store.js:11
  → value = updater(value)                    new object, new todos array
  → listener #1 (todo/app.js:26)              if todos reference changed → saveTodos() → localStorage
  → listener #2 renderApp (todo/app.js:32)
      → router.getCurrentView(createTodoPage) framework/router.js:69
          → createTodoPage(route)             todo/view.js:229  — rebuilds the WHOLE page as new vnodes
      → render("#app", tree)                  framework/dom.js:155
          → document.querySelector("#app")
          → patchNode(root.firstChild, previousTree, tree)   recursive, index-based
              → text changed?  textContent = …
              → tag changed?   replaceChild(renderElement(new))
              → attributes:    setAttribute / removeAttribute / property sync / swap listeners
              → children:      remove extras from end, patch by index, append new
          → mountedTrees.set(root, tree)
```

**The store itself does not know about rendering.** "UI updates automatically" only because `todo/app.js:32-33` subscribes `renderApp`. A new user who follows `docs/Design.md` (`hht.mount("#app", App())` and expects state to update the UI) will see nothing update.

---

## 7. Rendering Architecture

### Classification

**B. Virtual DOM diffing — whole-tree, keyless, index-based, synchronous, manually wired.**

- It is *not* A (full DOM rebuild): existing DOM nodes are reused (*measured*: 0 nodes created on a one-player move; TodoMVC input element identity preserved, `tests/todo-add.test.js:29-30`).
- It *does* share A's cost at the virtual layer: the entire virtual tree for the entire app is regenerated and walked on every state change.
- It is *not* C (fine-grained): there is no mapping from a state to the DOM nodes that depend on it.
- It is *not* D: the application never patches DOM for rendering (only for focus).

### Flow

```text
User event (native listener attached by addEvent)
  ↓
Action function (todo/actions.js)
  ↓
state.set(updater)          → value replaced, subscribers called synchronously
  ↓
App-level subscriber renderApp()   ← wired by hand in todo/app.js
  ↓
Rebuild ENTIRE virtual tree  (createTodoPage → every header/list/footer vnode)
  ↓
render("#app", newTree): diff against previous tree BY INDEX
  ↓
Minimal DOM writes: textContent / setAttribute / property sync /
listener swap / replaceChild on tag change / append / remove from end
```

### Problem checklist

| Concern | Present? | Notes |
|---|---|---|
| Recreating the whole page | No (DOM) / **Yes (virtual tree)** | Cheap for TodoMVC; grows with total app size, not with what changed |
| Recreating inputs while typing | No | Same element reused |
| Losing input focus | No, in normal cases | **Yes** when a keyless list shifts: focus stays on the DOM node at that index, which now represents a different item (e.g. keyboard-toggle a todo on `#/active` — it disappears and focus lands on the next todo's checkbox) |
| Losing cursor position | No | `value` is only written if it differs (`dom.js:93-95`) |
| Re-registering event listeners | **Yes** | Every inline arrow handler is removed and re-added on every render |
| Duplicate handlers | No | Tested |
| Excessive DOM creation | No, except on tag change | A tag change replaces the whole subtree |
| Excessive DOM removal | Only with list shifts | Removal is always from the end; middle items are re-patched instead |
| Memory leaks | **Yes (subscriptions)** | Subscribers can never be removed; each extra router adds a permanent `hashchange` listener |
| Updating unchanged elements | Mostly no | Attributes are compared by value; but see listener churn |
| Rebuilding large lists | **Yes (virtual)** | Every todo vnode is rebuilt and compared on every change, including edit-mode-only changes |
| Multiple renders per interaction | **Yes** | No batching; startup renders 2–3 times (`router.js:56-59` sets hash → sync → render; `app.js:35` renders again; browser's async `hashchange` renders a third time when the URL had no hash) |

---

## 8. Routing

| Feature | Status | Evidence / Notes |
|---|---|---|
| Route registration | ✅ | `register(path)`, chainable, normalized (`router.js:4-9`, `31-38`) |
| Route → view mapping | 🟡 | The router only stores path strings; the view is chosen by the single `renderRoute` callback passed to `getCurrentView`. There is no `{ "/": Home }` map as documented |
| Current route | ✅ | `getCurrentRoute()`; also a reactive `state` internally (`router.js:20`) |
| Navigation | ✅ | `navigate(path)` and plain `<a href="#/x">` links |
| Hash routing | ✅ | `hashchange` listener (`router.js:52`) |
| History API | ❌ (not needed) | Hash routing is the documented decision (`Todo.md:215`) |
| Direct URL change | ✅ | `tests/router.test.js:46` |
| Browser refresh | ✅ | `start()` reads the hash (`tests/todo-filter.test.js:71-81`) |
| Back / forward | ✅ (by design) | Hash changes fire `hashchange`; not covered by an automated test |
| Unknown routes | ✅ | Built-in `notFound(path)` view (`router.js:11-16`); URL kept unchanged |
| Custom 404 / fallback | ❌ | `notFound` is fixed; no redirect option. For TodoMVC, `#/foo` shows a bare 404 page instead of the app |
| Route parameters | ❌ | `docs/Design.md:978-1008` documents `/todos/:id`; not implemented (exact `Set.has` match only) |
| Query strings | ❌ | `#/active?x=1` becomes `/active?x=1` → 404 |
| Route cleanup / `stop()` | ❌ | The `hashchange` listener is never removed |
| Unsubscribe from route changes | ❌ | Inherits store limitation |

**TodoMVC routes `#/`, `#/active`, `#/completed`:** ✅ fully supported and tested, including selected-filter highlighting and refresh on each route (`tests/todo-filter.test.js`).

---

## 9. TodoMVC Readiness

Legend: ✅ Supported by framework · 🟡 Possible but awkward/incomplete · ❌ Framework cannot currently support it properly. "App status" is the current TodoMVC implementation.

| Requirement | Framework | App status | Evidence |
|---|---|---|---|
| Add todo (Enter, trim, ignore empty, clear input) | ✅ | ✅ | `todo/view.js:40-51`, `tests/todo-add.test.js` |
| Delete todo | ✅ | ✅ | `todo/actions.js:65`, `tests/todo-delete.test.js` |
| Complete / uncomplete | ✅ | ✅ | `todo/actions.js:54`, `tests/todo-toggle.test.js` |
| Toggle all | ✅ | ✅ | `todo/actions.js:90`, `tests/todo-toggle-all.test.js` |
| Clear completed (shown only when needed) | ✅ | ✅ | `todo/view.js:198-205`, `tests/todo-clear.test.js` |
| Edit todo | 🟡 | ✅ | Works, but focusing the edit input requires `querySelector` + `focus()` in app code (`todo/view.js:95`), and relies on rendering being synchronous (comment `todo/view.js:90-92`) |
| Enter key | ✅ | ✅ | `event.key` from native event; IME `isComposing` handled |
| Escape key | ✅ | ✅ | `todo/view.js:104` |
| Blur | ✅ | ✅ | `todo/view.js:112-115`, guarded against double save |
| Double click | ✅ (as `onDblclick`) | ✅ | `todo/view.js:135` |
| Dynamic classes | ✅ | ✅ | `completed`/`editing` joined into a string (`todo/view.js:122-125`); `class: null` removes |
| Dynamic attributes | ✅ | ✅ | `selected` filter class, `data-id` |
| Dynamic checkbox state | ✅ | ✅ | `checked` property re-synced (`dom.js:96-97`) |
| Todo list rendering | ✅ (keyless) | ✅ | `todo/view.js:241-245` |
| Filtering | ✅ | ✅ | `todo/view.js:217-225` |
| Routing | ✅ | ✅ | `todo/app.js:8-9,33-34` |
| Remaining count + plural | ✅ | ✅ | `todo/view.js:162-167` |
| Conditional rendering | ✅ | 🟡 | Framework supports it; **app always renders `section.main` and `footer.footer` even with zero todos**. `docs/TodoMVC-Study.md:220-228` says both should be hidden, and `todomvc-app-css` does not hide them by itself. `tests/todo-add.test.js:14` asserts "0 items left" on an empty list, i.e. the tests encode the non-standard behaviour |
| localStorage integration | ✅ (app-level, by design) | ✅ | `todo/storage.js`, `tests/todo-persist.test.js` |
| Required IDs / classes | ✅ | 🟡 | Classes match `docs/TodoMVC-Study.md`. Recommendation: diff the final markup against the exact reference example the auditors use (newer reference builds add e.g. an `id` on the new-todo input with a visually-hidden label) |
| Unknown route | 🟡 | 🟡 | Shows framework 404 instead of the TodoMVC app |

**Framework problems vs application problems**

- *Framework:* no refs/focus helper; no unsubscribe; keyless lists (focus can jump on filtered views); render must stay synchronous for the edit-focus code to work.
- *Application:* empty-state `.main`/`.footer` rendered; leftover demo code in `todo/`; unknown-route behaviour; todo key named `text` rather than the spec's `title` (a documented deliberate choice, `README.md:34-47`, fine to keep).

---

## 10. Bomberman-DOM Readiness

The question is not "does it work" but "does it fit a 16.67 ms frame budget with DOM rendering". Facts first, then assessment.

### Does HHT.js do the dangerous thing?

```text
player moves → state.set() → entire game rerenders → all DOM nodes recreated
```

- **"all DOM nodes recreated" — No.** *Measured:* a tree of 169 map cells + 4 players + HUD; moving one player produced 0 `createElement`, 0 `replaceChild`, 1 `setAttribute`.
- **"entire game rerenders" — Yes, virtually.** If the game is rendered as one `render("#app", Game())`, every `set()` rebuilds and diffs every vnode (map, players, bombs, HUD, chat, lobby). *Measured* framework JS cost on that small tree: ≈0.16 ms per update (fake DOM, Node 24). Real-browser cost is higher (live `childNodes` access, style recalculation), and it scales with total node count and with the number of `set()` calls per frame.
- **Conclusion:** not a 🔴 blocker at Bomberman's scale (a ~13×11–15×13 board is ~200–300 nodes), but a 🟠 architectural risk because cost is proportional to *everything on screen* rather than *what changed*, and nothing prevents several full renders per frame.

### Requirement-by-requirement

| Bomberman need | Framework support today | Assessment |
|---|---|---|
| 2–4 players, DOM rendering, no canvas | ✅ Elements with `style`/`class` | OK |
| 60 FPS / `requestAnimationFrame` | 🟡 | App can own the loop (framework is loop-agnostic — good). But routing every frame through `state.set()` → whole-app diff is wasteful |
| Keyboard movement (`keydown`/`keyup`, held keys) | ❌ | No window/document event API; app must call `window.addEventListener` directly |
| Bombs / explosions (frequent add/remove in lists) | 🟠 | Keyless diff: removing bomb #0 re-patches every later bomb's attributes; CSS animations/transitions on those elements can restart or jump because a DOM node gets reused for a different entity |
| Collision detection | N/A | Pure game logic; must not read layout (`getBoundingClientRect`) — use grid math |
| Destructible blocks | ✅ | Class change per cell is a single attribute write |
| Powerups, lives, HUD | ✅ | Fine, but see fine-grained section |
| Smooth movement via `transform` | 🟡 | Only as a full `style` string; no `style` object; no way to reach the element to write `el.style.transform` without `querySelector` |
| WebSockets / multiplayer sync | N/A (app code) | Network messages will call `set()` often — no batching means one render per message |
| Lobby / nickname / countdown / chat / screens | 🟡 | Doable with current state + router, but switching screens cannot unsubscribe old listeners (leaks, stale renders) |
| Chat (growing list) | 🟠 | Appending is cheap (append at end), but the whole chat list is re-diffed on **every** game-state render if it lives in the same tree |

---

## 11. Performance Risks

Ranked from most to least relevant. "Actual" = present in code; "Likely" = will appear in Bomberman if the current pattern is followed.

| Risk | Actual / Likely | Where | Notes |
|---|---|---|---|
| Whole-app virtual rebuild + diff on every `set()` | Actual | `todo/app.js:11-13,32-33`; pattern is the only documented way | Cost ∝ total UI size |
| No batching; multiple renders per frame/interaction | Actual | `store.js:18-20` | Startup already renders 2–3 times |
| Keyless list patching | Actual | `dom.js:112-126` | Middle removal = O(n) patches; wrong-element reuse |
| Listener churn from inline handlers | Actual | `dom.js:101-105`, `todo/view.js:131,135,140,148,149` | remove+add per inline handler per render |
| Whole-`style`-string rewrite for movement | Likely | `dom.js:29` | `setAttribute("style", …)` reparses all declarations; `el.style.transform = …` is cheaper |
| `querySelector` for element access | Actual (TodoMVC, once per dblclick) / Likely (game, per frame) | `todo/view.js:95`; `dom.js:64` runs `document.querySelector` on every `render()` | Negligible for TodoMVC; avoid per-frame in a game |
| `innerHTML` | Not present | — | ✅ |
| Layout thrashing | Not present in framework | — | Framework never reads layout. Game code must not interleave reads/writes |
| DOM creation in hot loops | Not present unless tags change | `dom.js:142-144` | Conditional rendering that swaps tags (e.g. `bomb` `div` → `explosion` `span`) recreates nodes — keep tags stable |
| Expensive array work in render | Minor | `todo/view.js:231,242` | Two `filter`s per render; fine for TodoMVC |
| Memory leaks | Actual | `store.js:23-25`, `router.js:52` | Un-removable subscriptions and `hashchange` listeners |

**`transform: translate()` / `translate3d()`:** Yes, possible today via `style: \`transform: translate(${x}px, ${y}px)\`` (the framework does not force any layout-heavy property such as `top`/`left`). For best results the moving element should be absolutely positioned inside the board and only `transform` should change per frame, ideally with `will-change: transform` in CSS.

---

## 12. Documentation vs Implementation

No user-facing documentation exists. The mismatches below are between what `README.md`, `docs/Design.md` and `Todo.md` state and what the code does.

| Documented claim | Source | Reality in code |
|---|---|---|
| `hht.div()`, `hht.button()`, `hht.p()`, `hht.input()` helpers | `docs/Design.md:17-26, 200-238` | ❌ Do not exist |
| `import hht from "./hht.js"` | `docs/Design.md:1046` | ❌ No such file or default export |
| `hht.createElement("button", { attrs: {...}, children: [...] })` | `docs/Design.md:30-36` | ❌ Real signature is `createElement(tag, attrs, children)` in `framework/dom.js` |
| Content-first calls: `hht.button("Save", { onClick })` | `docs/Design.md:88-90, 218-221` | ❌ Not supported |
| Core element creator "returns the finished DOM element" | `docs/Design.md:230-236` | ❌ `createElement` returns a virtual node; DOM is created by `render`/`renderElement` |
| `hht.mount("#app", App())` and "when state changes, the UI should update automatically" | `docs/Design.md:132, 141, 909-927` | ❌ `mount` exists (unnamespaced) but never updates. Auto-update needs manual `subscribe` + `render` |
| `mount` accepts a DOM element | `docs/Design.md:694-702` | ❌ `getRoot` calls `document.querySelector(target)` — selector strings only |
| `mount` "clears existing content" | `docs/Design.md:708-711` | ❌ `mount` appends; `render` is the one that replaces |
| Dynamic text `hht.p("Count: ", () => count.get())` | `docs/Design.md:478-491, 918` | ❌ Function children throw a TypeError |
| Advanced events `events: { click: { handler, once, capture } }` | `docs/Design.md:617-629` | ❌ Not implemented; would become attribute `events="[object Object]"` |
| `onEnter: value => addTodo(value)` | `docs/Design.md:1067` | ❌ Would listen for a non-existent `"enter"` event |
| `onKeyDown` listed as supported | `docs/Design.md:561` | ✅ Works (lower-cased) |
| `hht.createState(0, { onChange })` | `docs/Design.md:817-822` | ❌ Not implemented |
| `hht.router({ "/": Home, "/todos": Todos })` | `docs/Design.md:156-162, 951-957` | ❌ Real API is `createRouter().register(path)` + `getCurrentView(renderFn)` |
| Dynamic routes `/todos/:id` with `params` | `docs/Design.md:978-1008` | ❌ Not implemented |
| `hht.createRouter({ routes, notFound })` | `docs/Design.md:1014-1027` | ❌ `createRouter()` takes no arguments |
| Error text `hht.js: Mount target "#app" was not found.` | `docs/Design.md:728` | 🟡 Real text starts with `HHT.js:` (`dom.js:67`) |
| Folder structure with `framework/index.js`, `framework/app.js`, `todo/components/`, `todo/styles.css`, `docs/documentation.md` | `README.md:7-30`, `Todo.md:45-68` | ❌ None exist |
| "HHT.js will use direct event listeners" | `README.md:32` | ✅ True |
| Todo object `{ id, text, completed }`; edit state stored separately; persistence rules | `README.md:34-89` | ✅ True (`todo/actions.js:40-42`, `todo/state.js:9`, `todo/storage.js`) |
| "HHT.js will use complete rerendering first" then "now uses a small index-based Virtual DOM diff" | `Todo.md:197-199` | ✅ The second statement matches the code |
| Empty list hides `.main` and `.footer` | `docs/TodoMVC-Study.md:220-228` | ❌ App always renders them |
| Persisted todo should use `title` | `docs/TodoMVC-Study.md:238-246` | 🟡 App uses `text` (deliberate, documented in README) |
| Milestones 1–4 unchecked | `Todo.md:549-589` | 🟡 The corresponding stages are all checked and tested — tracking is out of sync |

---

## 13. Existing Features

| Feature | Status | File | Evidence / Notes |
|---|---|---|---|
| Virtual node creation | ✅ Implemented | `framework/dom.js:33` | `createElement(tag, attrs, children)` |
| Virtual node → DOM | ✅ Implemented | `framework/dom.js:41` | `renderElement`, recursive |
| Generic attributes (+ removal on `null`) | ✅ Implemented | `framework/dom.js:17-31` | `tests/dom.test.js:88, 268` |
| `value` property sync (controlled inputs) | ✅ Implemented | `framework/dom.js:25-27, 93-95` | `tests/dom.test.js:322` |
| `checked` / `disabled` / `selected` property sync | ✅ Implemented | `framework/dom.js:4, 20-24, 96-97` | `tests/dom.test.js:322` |
| Text & number children (HTML-safe) | ✅ Implemented | `framework/dom.js:42-44` | `createTextNode` only |
| Nested children & array flattening | ✅ Implemented | `framework/dom.js:6-9` | `tests/dom.test.js:104, 306` |
| Conditional children (`null`/`undefined`/booleans skipped) | ✅ Implemented | `framework/dom.js:8` | `tests/dom.test.js:306` |
| Index-based VDOM diff & in-place patch | ✅ Implemented | `framework/dom.js:73-170` | `tests/dom.test.js:249, 268`; preserves focus/typed text |
| Stale attribute & child removal | ✅ Implemented | `framework/dom.js:80-89, 113-115` | `tests/dom.test.js:268` |
| Clear mount-target error | ✅ Implemented | `framework/dom.js:63-71` | Throws with selector in message |
| Multiple independent render roots | ✅ Implemented | `framework/dom.js:3, 155-170` | Previous tree stored per root element in a `WeakMap` — the basis for splitting UI into independently rendered regions |
| Declarative `on*` events (native event object) | ✅ Implemented | `framework/events.js`, `framework/dom.js:49-50` | `tests/dom.test.js:143-209` |
| Multiple events per element | ✅ Implemented | `framework/dom.js:48-54` | `tests/dom.test.js:190` |
| Handler swap/removal without duplicates | ✅ Implemented | `framework/dom.js:83-85, 101-105` | `tests/dom.test.js:289` |
| State creation / `get` / `set` | ✅ Implemented | `framework/store.js` | `tests/store.test.js` |
| Updater-function `set` | ✅ Implemented | `framework/store.js:12-13` | `tests/store.test.js:11` |
| Subscriptions | ✅ Implemented | `framework/store.js:18-25` | `tests/store.test.js:15` |
| Shared/global state via modules | ✅ Implemented | `todo/state.js` | `tests/state-sharing.test.js` |
| Hash router: register / navigate / start / current route / view / subscribe | ✅ Implemented | `framework/router.js:18-79` | `tests/router.test.js` |
| Refresh, direct URL edit, back/forward via `hashchange` | ✅ Implemented | `framework/router.js:50-60` | `tests/router.test.js:46-53`, `tests/todo-filter.test.js:71` |
| Path normalization | ✅ Implemented | `framework/router.js:4-9` | Adds leading `/`, strips `#` and trailing `/` |
| Built-in 404 view | ✅ Implemented | `framework/router.js:11-16, 69-72` | `tests/router.test.js:25` |
| TodoMVC functional behaviour (add, toggle, delete, edit, toggle-all, clear, count, filters, persistence) | ✅ Implemented | `todo/*` | 9 TodoMVC test files, all passing |
| Automated test suite with dependency-free fake DOM | ✅ Implemented | `tests/*` | 32 tests, `npm test` |

**Count: 25 implemented features.**

---

## 14. Partially Implemented Features

| Feature | Status | File | What is missing |
|---|---|---|---|
| Application mounting (`mount`) | 🟡 Partial | `framework/dom.js:151` | Appends, never clears, forgets the tree; disconnected from `render`; selector only |
| Automatic UI update on state change | 🟡 Partial | `todo/app.js:32-33` | Works only through manual `subscribe(renderApp)` wiring; not a framework feature |
| Boolean attributes | 🟡 Partial | `framework/dom.js:4` | Only 3 handled; `hidden:false`, `readonly:false`, etc. still apply the attribute |
| `style` | 🟡 Partial | `framework/dom.js:29` | String only; object form broken |
| `class` | 🟡 Partial | `framework/dom.js:29` | String only; no array/object helper |
| Event-name mapping | 🟡 Partial | `framework/events.js:6` | Lower-cases only; `onDoubleClick` silently fails; camelCase custom events impossible |
| Event handler values | 🟡 Partial | `framework/events.js:8` | `onClick: false` throws |
| Subscriptions | 🟡 Partial | `framework/store.js:23`, `framework/router.js:73` | No unsubscribe |
| State change detection | 🟡 Partial | `framework/store.js:11-21` | Notifies on identical values |
| List rendering | 🟡 Partial | `framework/dom.js:112-126` | Keyless / index-only |
| Children API | 🟡 Partial | `framework/dom.js:33` | Variadic children dropped silently; `attrs=null` crashes |
| Router | 🟡 Partial | `framework/router.js` | No route→view map, params, query strings, custom 404, `stop()` |
| Documentation | 🟡 Partial | `docs/Design.md`, `README.md` | Design sketches exist but describe a different API; no usage guide |
| DOM abstraction in app code | 🟡 Partial | `todo/view.js:95` | Focus needs `querySelector` (no refs) |
| TodoMVC empty state | 🟡 Partial | `todo/view.js:229-256` | `.main`/`.footer` shown with 0 todos (app issue) |

**Count: 15 partial features.**

---

## 15. Missing Features

### User documentation

**Status:** ❌ Missing

**Why it matters:** It is an explicit deliverable (`docs/project.md:110-128`): explain features, show how to create an element, create an event, nest elements, add attributes, and explain why things work that way. Auditors test the framework by following it. The existing `docs/Design.md` actively points them at non-existent APIs.

**Needed for:** Mini-framework

### Public entry point (`framework/index.js` / `hht` object)

**Status:** ❌ Missing

**Why it matters:** Users currently need to know four internal file paths, and internal helpers (`renderElement`, `isEvent`, `addEvent`) are exported alongside real API. A single entry point is what the README structure and design doc promise and what "export only the framework API" (`Todo.md:468`) asks for.

**Needed for:** Mini-framework

### Unsubscribe

**Status:** ❌ Missing

**Why it matters:** Without it, any view that subscribes while it is visible keeps receiving updates after it is gone. Bomberman will switch between lobby, countdown, game and results screens and receive WebSocket updates continually.

**Needed for:** Mini-framework (cleanliness), Bomberman (required)

### Keyed list children

**Status:** ❌ Missing

**Why it matters:** Index-based patching reuses the wrong DOM node when items are removed or reordered — wasted patches, focus jumping to another item, CSS animations attaching to the wrong entity.

**Needed for:** TodoMVC (nice), Bomberman (important: bombs, explosions, powerups, players, chat)

### Window / document event handling

**Status:** ❌ Missing

**Why it matters:** Game controls must work regardless of which element has focus. Today the only option is `window.addEventListener` in app code, which the brief says users should not need.

**Needed for:** Bomberman

### Element references (refs)

**Status:** ❌ Missing

**Why it matters:** Focus management (TodoMVC edit) and high-frequency direct updates (writing `transform` each frame) both need the real element. The current workaround is `querySelector`.

**Needed for:** TodoMVC (cleanliness), Bomberman (important)

### Render batching / scheduling

**Status:** ❌ Missing

**Why it matters:** Several `set()` calls in the same tick (multiple WebSocket messages, several game-state changes in one frame) each trigger a full render. **Caution:** TodoMVC's double-click handler relies on render being synchronous (`todo/view.js:90-96`), so any batching must either be opt-in or come with a way to run code after render.

**Needed for:** Bomberman

### Scoped / partial updates

**Status:** ❌ Missing as a documented feature (the mechanism partly exists — `render()` supports multiple roots)

**Why it matters:** A lives change should not diff the map, players and chat. Splitting the UI into several `render()` roots, each subscribed to its own state, already works except that roots must be CSS selectors and that subscriptions cannot be cleaned up.

**Needed for:** Bomberman

### Unmount

**Status:** ❌ Missing

**Why it matters:** Switching screens should clear a root *and* forget its stored tree; today the tree stays in `mountedTrees` until the element is garbage-collected, and there is no documented way to tear down.

**Needed for:** Bomberman

### Event options (`once`, `capture`, `passive`)

**Status:** ❌ Missing

**Why it matters:** `passive` matters for scroll/touch listeners; `once` is handy for "press any key to start". Documented in `docs/Design.md` but absent.

**Needed for:** Optional for mini-framework (documented promise), useful for Bomberman

### Style object / DOM property setting

**Status:** ❌ Missing

**Why it matters:** `style: { transform: ... }` fails today (`[object Object]`). Per-property style updates avoid rewriting the entire style attribute every frame.

**Needed for:** Bomberman

### Route parameters

**Status:** ❌ Missing

**Why it matters:** Documented in `docs/Design.md`. Not required by TodoMVC or the brief; Bomberman screens can be state-driven without params.

**Needed for:** Optional (documentation promise only)

**Count: 12 missing features.**

---

## 16. Bugs / Architecture Problems

Major problems (🔴 + 🟠): **6**.

### 🔴 No user documentation; design doc describes a different framework

**Current behavior:** No usage guide exists. `docs/Design.md` shows `hht.div()`, `hht.mount()`, `hht.router({...})`, function children and automatic UI updates — none of which exist.

**Why this is a problem:** Documentation is a mandatory deliverable, and auditors test the framework by following it. Every example in the current design doc fails when run.

**Affected:** Mini-framework (audit)

### 🟠 UI coupling: every state change rebuilds and diffs the whole application

**Current behavior:** The only rendering pattern is `state.subscribe(() => render("#app", WholeApp()))`.

**Why this becomes a problem:** For a game, cost scales with total UI (map + entities + HUD + chat) instead of what changed, and repeats per `set()`. Not a blocker at ~300 nodes, but it is the dominant cost and the easiest way to miss 16.67 ms once chat history, explosions and multiple renders per frame add up.

**Affected future project:** Bomberman-DOM

### 🟠 Keyless list diffing

**Current behavior:** `patchChildren` matches children by index and trims from the end (`framework/dom.js:112-126`).

**Why this becomes a problem:** Removing the first of N bombs re-patches N−1 elements and moves each DOM node to represent a different bomb; CSS animations and transitions tied to those nodes restart or jump. In TodoMVC, focus can land on a different todo after a filtered item disappears.

**Affected:** Bomberman-DOM (primarily), TodoMVC (minor a11y)

### 🟠 Subscriptions cannot be removed

**Current behavior:** `subscribe` returns `undefined` (`framework/store.js:23-25`); `router.subscribe` forwards it.

**Why this becomes a problem:** Screen changes and reconnections accumulate listeners that keep rendering hidden views (memory leak + wasted frames). The test helper already has to work around it (`tests/todo-dom.js:127-130`).

**Affected:** Mini-framework, Bomberman-DOM

### 🟠 No framework way to handle global keyboard events

**Current behavior:** Events can only be attached to rendered elements.

**Why this becomes a problem:** Bomberman input needs `keydown`/`keyup` on `window`/`document`, meaning raw `addEventListener` in app code — the very thing the event system is supposed to abstract.

**Affected:** Bomberman-DOM

### 🟠 No single public entry point

**Current behavior:** API spread over `framework/dom.js`, `store.js`, `router.js`; internals exported.

**Why this becomes a problem:** Auditors and the Bomberman project must import from internal paths; the documented `hht` object does not exist.

**Affected:** Mini-framework

### 🟡 No render batching

`framework/store.js:18-20` — every `set()` renders synchronously. Startup renders 2–3 times (`framework/router.js:56-59`, `todo/app.js:35`, browser `hashchange`). Must be designed carefully because TodoMVC edit-focus depends on synchronous rendering.

### 🟡 Listener churn for inline handlers

`framework/dom.js:101-105` — every render removes and re-adds every inline arrow handler (3–5 per todo row; per entity per frame in a game). Correct, but avoidable (e.g. one stable internal listener per event that calls the latest handler).

### 🟡 Boolean attributes other than `checked`/`disabled`/`selected`

`framework/dom.js:4` — `hidden: false`, `readonly: false`, `required: false` still apply the attribute, which the browser treats as *true*.

### 🟡 `style` object renders as `[object Object]`

`framework/dom.js:29`.

### 🟡 `mount()` and `render()` have inconsistent semantics

`framework/dom.js:151-170` — `mount` appends and forgets; mounting twice duplicates; `render` after `mount` discards the mounted DOM. Only one of them should be the documented entry point.

### 🟡 Event naming pitfalls

`framework/events.js:6-8` — `onDoubleClick` silently never fires; camelCase custom events cannot be listened to; `onClick: false` throws a TypeError.

### 🟡 TodoMVC renders `.main` and `.footer` with no todos (application)

`todo/view.js:236-256` — contradicts `docs/TodoMVC-Study.md:220-228` and reference TodoMVC; tests currently assert the non-standard behaviour (`tests/todo-add.test.js:14`).

### 🟡 Function children crash

`framework/dom.js:41-48` — documented as the way to do dynamic text, but throws.

### 🟢 Store: no change detection, no error isolation, re-entrancy

`framework/store.js:11-21` — same-value `set` notifies; one throwing listener stops the rest; a listener added during notification is invoked in the same pass.

### 🟢 `createElement(tag, null)` throws; variadic children dropped silently

`framework/dom.js:33, 48`.

### 🟢 `<select value>` applied before options exist

`framework/dom.js:48-58` — first render of a controlled select does not select the option.

### 🟢 Unknown TodoMVC route shows a bare 404 page

`framework/router.js:69-72` — no fallback/redirect option.

### 🟢 Router listener never removed; each `createRouter()` + `start()` adds a permanent `hashchange` listener

`framework/router.js:50-54`.

### 🟢 Any attribute starting with `on` is treated as an event

`framework/events.js:1-3` — undocumented rule.

---

## 17. Unused / Dead Code

| Item | Location | Status |
|---|---|---|
| Stage-10 demo app | `todo/demo-app.js` | Not loaded by `index.html`; only imported by `tests/rendering.test.js:84` (file comment says it is kept for that test) |
| Demo page | `todo/page.js` | Used only by `demo-app.js` and `tests/state-sharing.test.js` |
| Demo state | `todo/state.js:3-4` (`appState`, `counterState`) | Used only by demo page/tests |
| Demo actions | `todo/actions.js:3-29` (`increaseCount`, `decreaseCount`, `resetCount`, `setMessage`) | Used only by `todo/page.js` |
| `mount` | `framework/dom.js:151` | Not used by any application; only `tests/dom.test.js` |
| Internal helpers exported | `framework/dom.js:41` (`renderElement`), `framework/events.js` (`isEvent`, `addEvent`) | Exported but only used internally / by tests |
| View-component exports | `todo/view.js` (`createTodoApp`, `createHeader`, `createNewTodoInput`, `createMainSection`, `createTodoList`, `createTodoItem`, `createFooter`, `createTodoCount`, `createFilters`, `createClearCompleted`, `createInfoFooter`) | Exported but only used inside `view.js` (harmless; useful for tests) |
| Redundant fallback | `framework/dom.js:158` (`root.firstChild ?? root.childNodes[0]`) | `firstChild` always exists on real DOM nodes; fallback only serves minimal fake DOMs |
| Pasted HTML markup noise | `Todo.md:197` | Copied chat-UI HTML wrapping one sentence |
| Pasted project brief | `README.md:91-223`, duplicated in `docs/project.md` | Duplicate content in README |
| Planned-but-absent files | `README.md:7-30` | See §2 |
| TODO / FIXME / console.log | — | None found |
| Unreachable code paths | — | None found |
| Circular imports | — | None (see §18) |

---

## 18. Recommended Improvements Before Bomberman

### Dependency / architecture map (current)

```text
index.html
  └── todo/app.js ─────────────┬── framework/dom.js ──── framework/events.js
                               ├── framework/router.js ─┬── framework/dom.js
                               │                        └── framework/store.js
                               ├── todo/routes.js
                               ├── todo/state.js ─────── framework/store.js
                               ├── todo/storage.js       (window.localStorage)
                               └── todo/view.js ──────┬── framework/dom.js
                                                      ├── todo/actions.js ── todo/state.js
                                                      ├── todo/routes.js
                                                      └── todo/state.js

tests/rendering.test.js ── todo/demo-app.js ─┬── framework/dom.js, framework/router.js
                                             ├── todo/page.js ── framework/dom.js, todo/actions.js, todo/routes.js, todo/state.js
                                             ├── todo/routes.js
                                             └── todo/state.js
```

- `store.js` and `events.js` are leaves. `dom.js` depends only on `events.js`. `router.js` depends on `dom.js` (for the 404 vnode) and `store.js` (for its current-route state).
- **No circular dependencies.**
- Coupling note: the router depending on `dom.js` just to build a 404 page is the only cross-pillar dependency that is not strictly necessary.

### Architecture options for HHT.js (Step 15)

| Approach | Fit for HHT.js | Pros | Cons |
|---|---|---|---|
| **Direct DOM** (app mutates DOM) | Already used for focus; ideal for per-frame entity movement | Fastest, zero overhead, easy to explain | Not an abstraction by itself; app code gets imperative |
| **Virtual DOM** (current) | ✅ Keep for UI | Already built, tested, small (~130 lines), easy to reason about ("describe the page, framework patches it"), perfect for TodoMVC, lobby, HUD, chat | Whole-tree cost; needs keys for dynamic lists |
| **Templating** (strings → DOM) | ❌ | Familiar syntax | Needs parsing/`innerHTML`, loses node identity and event wiring; step backwards |
| **Reactive data binding** (two-way) | ❌ | Less boilerplate for forms | Hidden magic; hard to explain; not needed |
| **Fine-grained reactivity** (signals bound to nodes) | 🟡 Partial, opt-in only | Minimal updates | Requires dependency tracking, ownership and cleanup — a full rewrite of the mental model; `state()` would need to become a signal system |

**Recommendation:** Keep the small VDOM as the UI layer and make it *scoped* rather than *global*: several render roots (board, HUD, chat, lobby), each subscribed only to the state it uses. Handle 60 FPS entity motion outside the VDOM with direct `transform` writes on referenced elements. This keeps HHT.js small and educational, reuses what already works, and avoids both a React-style rewrite and a signals rewrite.

### Fine-grained update readiness (Step 10)

**Fact:** Not supported. `state.subscribe` delivers values but nothing connects a state to a specific DOM node; UI only updates via a whole-root `render()`.

**What already helps:** `render()` stores trees per root, so `render("#lives", Lives())` subscribed to `lives` would update only that span today — if `#lives` were a separate container element.

**What would need to change (smallest path):**

1. `render`/`mount` accept an `Element` as target (not only a selector), so regions can be created dynamically.
2. `subscribe` returns an unsubscribe function, so regions can be torn down.
3. A `ref` attribute (callback receiving the element) for direct, per-frame writes.
4. Optionally a tiny helper that combines 1+2 (e.g. "bind this state to render this function into this element, return a disposer").

A full signal/effect system is **not** required for Bomberman.

### `requestAnimationFrame` compatibility (Step 11)

**Fact:** HHT.js has no scheduler and no global loop, so it coexists with a user-written `requestAnimationFrame` loop without conflict.

**Conclusion:** The framework should **not** own the game loop. Application code should call `requestAnimationFrame` directly. An optional tiny helper (start/stop a loop, pass `dt`) is acceptable as a convenience but not needed; keeping it out keeps the framework generic. What the framework *should* provide is the pieces the loop needs: refs to elements, a cheap way to set `transform`, and (if batching is added) a documented "flush" point so UI renders happen at most once per frame.

### High-frequency state vs UI state (Step 12)

| Kind | Examples | Should use HHT `state()`? |
|---|---|---|
| UI / application state | nickname, lobby players, countdown, lives, powerups, chat, game status, current screen | ✅ Yes — changes a few times per second at most; VDOM render per change is fine, ideally into a scoped root |
| High-frequency game state | player x/y, velocity, held keys, bomb/explosion animation timers, interpolation buffers | ❌ No — plain mutable JS objects updated in the rAF loop, written to the DOM via refs (`el.style.transform = translate3d(...)`) |

**Can the current framework support this split?** Mostly yes: plain objects need nothing from the framework, and entity elements can be created once by `render()`. Missing pieces are refs (to avoid `querySelector`), keyed lists (so entity elements are stable), and unsubscribe (so screen changes are clean). Using `state()` for positions at 60 FPS would trigger a full-root diff per `set()` per player — avoid it.

### Recommended improvements (prioritised)

1. Write real user documentation that matches the code (and fix or clearly mark `docs/Design.md` as an early sketch).
2. Add `framework/index.js` exporting only the public API (optionally as an `hht` object); stop exporting internals from the public surface.
3. Make `subscribe` return an unsubscribe function (store and router).
4. Add keyed children (`key` attribute) to `patchChildren`.
5. Let `render` accept an `Element` target, and add `unmount(target)`.
6. Add a way to attach events to `window`/`document` through the framework.
7. Add a `ref` attribute.
8. Support `style` objects (and ideally per-property updates).
9. Fix boolean-attribute handling for `false` values; guard non-function event handlers.
10. Decide one mounting story (`mount` vs `render`) and document it.

---

## 19. Optional Future Improvements

- Tag helpers (`hht.div(...)`, `hht.button(...)`) built on `createElement` — matches the original design and is a nice "creative" feature, but not required.
- Variadic children in `createElement`.
- Event options (`once`, `capture`, `passive`) and modifiers (e.g. `onKeydown.enter`-style helpers).
- Render batching (opt-in, microtask/rAF-based) with an explicit "after render" hook.
- Stable internal listener per event type to eliminate listener churn.
- Change detection (`Object.is`) in `set()`.
- Computed/derived state.
- Route parameters, query parsing, custom 404 / redirect.
- `router.stop()` for cleanup.
- Lifecycle hooks (on mount / on remove).
- Debug mode (log state changes and render counts/timings).
- Middleware around `set()`.
- Array/object `class` helper.
- Function children / fine-grained text bindings (only if the simpler scoped-root approach proves insufficient).

---

## 20. Suggested Implementation Order

### Phase 1 — Finish Mini-Framework Requirements

- [ ] Create `framework/index.js` exposing the public API (`createElement`, `render`/`mount`, `state`, `createRouter`) and nothing internal.
- [ ] Unify or clearly separate `mount` and `render`; make the documented mount path support updates.
- [ ] Make `subscribe` (store + router) return an unsubscribe function.
- [ ] Fix boolean attributes with `false` (`hidden`, `readonly`, `required`, …) and ignore/validate non-function `on*` values.
- [ ] Fix TodoMVC empty state: omit `section.main` and `footer.footer` when there are no todos; update `tests/todo-add.test.js` accordingly.
- [ ] Compare final TodoMVC markup against the reference example the auditors use (IDs, classes, labels).
- [ ] Write the user documentation (install/run, import, create element, attributes, nesting, events incl. naming rules such as `onDblclick`, state, rendering/auto-update wiring, routing, why it works this way, inversion of control, complete counter example).
- [ ] Mark `docs/Design.md` as a historical design sketch or rewrite it to match the implementation.
- [ ] Clean `Todo.md:197` noise, trim the pasted brief from `README.md`, sync milestone checkboxes.
- [ ] Decide whether to keep `todo/demo-app.js` / `todo/page.js` / demo state & actions (move to an `examples/` folder or delete along with their tests).

### Phase 2 — Make Rendering Efficient

- [ ] Add keyed children (`key` attr) to `patchChildren`; use it for the todo list.
- [ ] Accept an `Element` as `render` target; add `unmount(target)`.
- [ ] Document the "scoped render roots" pattern (one root per independently changing region).
- [ ] Reduce listener churn (stable per-event listener that dispatches to the current handler).
- [ ] Optionally add opt-in batching; keep synchronous rendering available for code like TodoMVC edit focus.

### Phase 3 — Prepare for Bomberman

- [ ] Add a framework API for `window`/`document` events (keyboard, visibility), with cleanup.
- [ ] Add a `ref` attribute (callback receiving the element).
- [ ] Support `style` objects / per-property style updates.
- [ ] Add event options (`once`, `capture`, `passive`).
- [ ] Document the recommended game pattern: app-owned `requestAnimationFrame` loop, plain objects for positions, `transform: translate3d()` via refs, HHT `state` only for UI state.
- [ ] Add a `router.stop()` (or disposer from `start()`).

### Phase 4 — Optional Improvements

- [ ] Tag helper functions and variadic children.
- [ ] Change detection in `set()`, computed state.
- [ ] Route parameters / custom 404.
- [ ] Lifecycle hooks, debug mode, middleware.

---

## 21. Final Checklist

### Mini-framework requirements

- [x] DOM abstraction (virtual nodes + patching)
- [x] Event handling (declarative `on*`)
- [x] State management (`state` with updater + subscribe)
- [x] Routing (hash router)
- [x] TodoMVC functional behaviour
- [x] Automated tests pass (32/32)
- [ ] User documentation matching the real API
- [ ] Single public entry point
- [ ] Unsubscribe
- [ ] TodoMVC empty-state markup matches reference
- [ ] Docs/design mismatches resolved
- [ ] Auditor dry-run (Todo.md Stages 23 & 28)

### Before Bomberman

- [ ] Keyed list diffing
- [ ] Scoped render roots with `Element` targets + unmount
- [ ] Global (window/document) keyboard events via the framework
- [ ] Element refs
- [ ] `style` object / cheap `transform` updates
- [ ] Documented UI-state vs game-loop-state pattern
- [ ] (Optional) render batching with an after-render hook

### Summary counts

| Category | Count |
|---|---|
| ✅ Implemented features (§13) | 25 |
| 🟡 Partial features (§14) | 15 |
| ❌ Missing features (§15) | 12 |
| Major problems (🔴 1 + 🟠 5) (§16) | 6 |
| Medium problems (🟡) | 8 |
| Low problems (🟢) | 6 |

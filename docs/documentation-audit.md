# Documentation Audit Summary

> Date: 2026-09-27 · Commit audited: `3393f7e` · `npm test`: **153/153 passing**
>
> Scope: all framework source, TodoMVC source, tests and Markdown files were read and compared. The implementation was treated as the source of truth, followed by the tests, then TodoMVC usage. **No framework or TodoMVC source code was changed.** Only Markdown files were edited.

## Files Reviewed

**Framework:** `framework/index.js`, `framework/dom.js`, `framework/events.js`, `framework/store.js`, `framework/router.js`

**TodoMVC:** `todo/app.js`, `todo/state.js`, `todo/actions.js`, `todo/view.js`, `todo/routes.js`, `todo/storage.js`, `todo/demo-app.js`, `todo/page.js`

**Tests:** all 24 files in `tests/`: the 23 `*.test.js` files (`attributes`, `dom`, `event-listeners`, `global-events`, `public-api`, `refs`, `render-targets`, `rendering`, `router`, `state-sharing`, `store`, `styles`, `todo-*` tests, and the `todo-dom.js` fake DOM helper)

**Configuration and page:** `package.json`, `index.html`, and the installed Vite's `package.json` (for its Node.js requirement)

**Markdown:** `README.md`, `docs/documentation.md`, `docs/Design.md`, `docs/TodoMVC-Study.md`, `docs/project.md`, `Todo.md`, `PROJECT-AUDIT.md`

**Files named in the audit brief that do not exist:** `framework/app.js`, `todo/components/`, `todo/styles.css`. The TodoMVC styles come from the `todomvc-app-css` npm package. The old README and `Todo.md` both listed these files in their "project structure".

### How claims were verified

1. **Reading the source.** Every documented behaviour was traced to the code path that implements it.
2. **Tests.** The 153 test names and relevant assertions were checked against the documentation.
3. **Probe script (scratchpad, not committed).** Ran the real `store.js` and `dom.js` in Node to confirm edge cases: storing functions in state, subscriber errors, nested `set()`, how `createElement` normalises children, validation messages, and key comparison.
4. **Executing the documentation's examples.** The five complete examples (`hello.js`, `counter.js`, `profile.js`, `list.js`, `pages.js`) were extracted directly from `docs/documentation.md` and run against the real framework with a fake DOM. Clicks, Enter key presses and hash changes were simulated. All produced the documented output. The keyed list example was confirmed to keep the same `li` nodes on move and remove, and the routing example to keep state across routes and show the 404 view.
5. **Link check.** All 30 internal `#anchor` links in `docs/documentation.md` resolve to a heading.

---

## Problems Found

### `docs/documentation.md`

The existing documentation was already largely accurate and up to date with the named-export API. The problems were errors in specific details, missing edge cases, and missing sections.

| # | Location (old doc) | Problem | Why it was incorrect or confusing | What was changed |
| --- | --- | --- | --- | --- |
| 1 | State → "Any kind of value" | Said "you cannot store a function as the value" | **Incorrect.** `state(fn)` stores `fn` directly, and `set(() => fn)` stores `fn` because the updater's return value is stored (confirmed by probe) | Explains both ways to store a function |
| 2 | API Reference → import line | `import { createElement, render, mount, unmount, state, createRouter }` left out `on` | Inconsistent with the seven public exports | All seven exports listed |
| 3 | Children → summary table | "A function: not supported (causes an error)" | Imprecise. `createElement` **accepts** a function child. The error is a generic `TypeError` thrown later by `render()`. The same applies to any non-vnode object. | The table and Error Handling now say when the error happens and what kind it is. `""` and `NaN` children also documented. |
| 4 | Creating elements | "Pass `{}`, not `null`" with no consequence given | A reader could not tell what goes wrong: `createElement` succeeds and `render()` throws a `TypeError` | Consequence documented in Creating Elements, Error Handling and Limitations |
| 5 | Boolean attributes table | "A string: written as given" | Incomplete. **Any** value other than `false`/`null`/`undefined` turns the attribute on, including `0` and `"false"` (`isOn()` in `dom.js`) | Table rewritten, with explicit `0`/`"false"` examples. Case sensitivity (`readOnly: false` → still read-only) explained |
| 6 | State → subscribe | Did not say that `subscribe()` does not call the listener immediately | This is the reason every app calls `renderApp()` once by hand, a key beginner question | Documented in State and in Connecting State to Rendering |
| 7 | State | Missing: listener not validated; a throwing subscriber stops later subscribers (the value is already stored); a throwing updater leaves the value unchanged; nested `set()` inside a subscriber | Real behaviour with visible effects, confirmed by probe (nested `set()`: later subscribers see the newest value twice and never the intermediate one) | New "Errors inside `set()`" and "…setting during a notification" subsections |
| 8 | Styles | Missing: `{ color: cond && "red" }` does not remove the property | `false` is written to `element.style`, the browser rejects it and **keeps the previous value**, so the old style stays | Warning box added to Styles, plus a limitation entry |
| 9 | Forms (was a subsection of "Connecting state to rendering") | No explanation of `onInput` vs `onChange`; no checkbox, select or textarea guidance | HHT.js passes events through unchanged, so `onChange` on a text input fires only on commit. Readers who know React expect it to fire on every keystroke. | New top-level **Forms** section: event table, uncontrolled vs controlled inputs, `checked`, `selected`, `<textarea>`, and the `<select value>` limitation |
| 10 | Rendering → mount | Did not say that content mounted **after** a `render()` is removed by the next `render()` | `render()` removes any children beyond its root (`dom.js`, `render`) | Documented |
| 11 | Rendering → render | Did not say what the `vnode` argument accepts besides an element vnode | A string or number renders a text node; `null` throws | Documented, with "use `unmount()` to show nothing" |
| 12 | Routing | Missing several behaviours: current route is `"/"` before `start()`; `start()` notifies subscribers synchronously (and again after the `#/` hash is set); `register()` after `start()` can notify subscribers; matching is case-sensitive; trailing slashes in the URL are normalised; subscribers run even when the path is unchanged; `navigate()` before `start()`; `createRouter()` ignores arguments; `navigate()` adds a history entry | All visible to users, all confirmed in `router.js` | Each method now has its own subsection. A custom-404 workaround using only public API was added |
| 13 | Keys | "keeps focus in browsers that support `moveBefore()` (recent Chrome/Edge)" | A list of browsers goes out of date and cannot be checked from the code | Now says "browsers that support `Element.moveBefore()`" |
| 14 | Limitations | No mention of SVG | `dom.js` only uses `document.createElement`, so SVG elements are created in the HTML namespace and are not drawn | Added to Creating Elements and Limitations |
| 15 | Limitations | Nothing about changing vnodes or reusing `attrs` objects | `createElement` keeps the caller's `attrs` object (confirmed by probe), and the diff compares it by reference. Changing a vnode after rendering breaks the next diff. | Rule added in Creating Elements and Limitations |
| 16 | Events | Missing: `this` is the element; the return value is ignored; two spellings of the same event (`onClick` + `onclick`) attach two listeners | Confirmed in `events.js` and `tests/event-listeners.test.js` ("two attributes for the same event stay independent") | Documented |
| 17 | Refs table | No row for content added with `mount()` being removed | `mount()` does not track its content, so its refs are never called with `null` | Row added |
| 18 | Installation | No Node.js version | Vite 7.3.6 requires Node `^20.19.0 \|\| >=22.12.0` (from its `package.json`) | Version requirement added |
| 19 | Structure | Architecture was a sub-part of "Importing". Keys were buried inside "How Rendering Works". No TodoMVC section, Nested UI example, List example, Error Handling section, introduction, design philosophy, or future-features section. | The brief requires these, and several beginner tasks (render a list, use keys, understand errors) had no dedicated place | Document reorganised into the required structure (see "Missing Documentation Added") |
| 20 | Error handling | HHT.js error messages were scattered. Errors HHT.js does **not** check (null attrs, function children, invalid tag names, `subscribe(nonFunction)`, misspelled event names) were not documented. | Users need to know what they did wrong when they get a plain `TypeError`, or no error at all | New **Error Handling** section: every `HHT.js:` message with cause and fix, unchecked mistakes, errors from user code, and recovery after a failed render |

### `README.md`

| Problem | Why | Change |
| --- | --- | --- |
| Consisted of design notes, then the **entire project brief** (already in `docs/project.md`) | Didn't work as a quick introduction; duplicated the brief | Rewritten as a concise introduction |
| Listed a project structure with `framework/app.js`, `todo/components/`, `todo/styles.css` | These files do not exist | Real structure listed |
| No install or run commands, no example, no link to the documentation, no test command | Required README content | Added |
| Todo data model and persistence notes | Still accurate. **Kept** (condensed), because comments in `todo/state.js` and `todo/actions.js` refer to "the README" for them | Kept under "TodoMVC" |

### `docs/Design.md`

The existing banner only said the file "may not match". Almost none of its API exists. A stronger banner now lists each old idea next to the current API. The body was not changed, since it is a historical design record.

### `PROJECT-AUDIT.md`

This audit of commit `0719855` states that there are no keys, no unsubscribe, no refs and no global events. All of these exist now (confirmed with `git log 0719855..HEAD`). A banner now marks it as a historical snapshot and points to the current documentation. The body was not changed.

### Not changed

- **`Todo.md`** (roadmap checklist): still lists the nonexistent files in its "suggested structure", and has an item "Explain automatic rendering", but rendering is not automatic. Left as is because it is a planning document, not user documentation. `docs/documentation.md` explains the manual `subscribe(renderApp)` model.
- **`docs/TodoMVC-Study.md`**: accurate as study notes. See the TodoMVC observation below.
- **`docs/project.md`**: the original brief, unchanged.

---

## Outdated API Examples Found

All of these are in `docs/Design.md` (and summarised in `PROJECT-AUDIT.md`). None appear in the user-facing documentation or README. `Design.md` is now clearly labelled historical, with a table mapping each one to the current API.

| Old design example | Status |
| --- | --- |
| `import hht from "./hht.js"` (default export / `hht` namespace) | Never implemented. HHT.js has named exports only (`tests/public-api.test.js` asserts there is no default export) |
| `hht.div(...)`, `hht.button("Save", {...})`, `hht.p(...)`, `hht.input({...})`, `hht.element(...)` | Never implemented. Only `createElement(tag, attrs, children)` exists |
| Children as extra arguments: `hht.div(a, b, c)` | Not supported. Extra arguments to `createElement` are ignored |
| `hht.mount("#app", App())` as the way to show an app | `mount()` exists but only appends once. Apps use `render()` |
| `hht.p(() => \`Count: ${count.get()}\`)` (automatically updating function children) | Not supported. Function children cause a `TypeError` in `render()` |
| "When the state changes, hht.js should update…" (automatic rendering) | Not how it works. You subscribe a render function |
| `hht.router({ "/": Home, "/todos": Todos })` | Never implemented. Use `createRouter()` + `register()` + `getCurrentView()` |
| `"/todos/:id"` route parameters, `TodoDetails(params)` | Not supported |
| `hht.createRouter({ routes: [...] })`, `hht.createState(0, {...})`, advanced event config objects | Never implemented |

The previous `docs/documentation.md` already used the current API and contained none of these.

---

## Missing Documentation Added

- **Introduction** (feature table) and **Why HHT.js Exists** (design goals: small, understandable, explicit, beginner-friendly, lightweight, with no comparisons to other frameworks)
- **Virtual Nodes**: what a vnode is, and that `createElement` does not touch the DOM
- **Children**: `""` and `NaN` children; timing of the error for function and object children
- **Attributes**: HTML names vs DOM property names, with reasons; numbers; `true`/`false` on normal attributes; boolean attribute values `0` and `"false"`; case sensitivity; the full set of attributes synced with DOM properties
- **Styles**: the `false` gotcha; values inside style objects are not validated
- **Events**: `this`, return value, one handler per event, duplicate spellings, keyboard handling, `isComposing`, a cleanup table
- **Global Events**: listener lifetime relative to rendering
- **State**: no call on subscribe; listener not validated; nested `set()`; errors from updaters and subscribers; storing functions; reference comparison pattern (TodoMVC's save subscriber)
- **Connecting State to Rendering**: the forgotten-subscription failure mode; "views read, handlers write"
- **Rendering**: comparison table of `render`/`mount`/`unmount`; accepted `vnode` values; content changed or appended from outside
- **Virtual DOM and Diffing**: attribute diff table; "what HHT.js does not do" (no subtree skipping, no batching, keyed moves are not minimal)
- **Keys** (own section): insert/delete/reorder/tag-change table; keyed lists must contain only elements; `data-id` pattern
- **Refs**: when to use refs; mount removal row
- **Forms** (own section): `onInput` vs `onChange`; controlled and uncontrolled inputs; checkbox, select and textarea
- **Routing**: a subsection per method; normalisation rules; timing; custom-404 workaround; back/forward/refresh; the full "does not do" list
- **Architecture**: framework files, dependency graph, internal helpers, `todo/` files (including the status of `demo-app.js`/`page.js`), and a guide to the other Markdown files
- **TodoMVC Example**: wiring, add, complete, delete, edit, filter, route and conditional content, plus a table of every framework feature TodoMVC uses
- **Complete Examples**: new **Nested UI** and **List** examples, alongside Hello World, Counter and Routing
- **Error Handling**: all 10 `HHT.js:` messages with cause and fix; mistakes HHT.js does not check; errors from user code; recovery
- **Possible Future Features**: short, clearly marked as not implemented
- **Public API Reference**: overview table plus detailed tables, generated from the actual exports

### TodoMVC patterns checked against the documentation

Every framework pattern used in `todo/` is now documented: `key`, `ref` (conditional ref for focus), conditional `null` children, number children, nested child arrays (`createMainSection` passes its `children` array inside another array), `class: x || null`, `data-id`, `autofocus: ""`, `checked`, a controlled edit input (`value`), an uncontrolled new-todo input, `onKeydown`/`onChange`/`onClick`/`onDblclick`/`onBlur`, inline arrow handlers, updater functions with immutable updates, several subscribers on one state, router `register`/`start`/`subscribe`/`getCurrentView`, and a route used as a filter.

---

## Source/Documentation Inconsistencies

| Inconsistency | Resolution |
| --- | --- |
| Docs: "cannot store a function in state". Code: you can | Docs corrected |
| Docs' API reference import omitted `on` | Docs corrected |
| README/`Todo.md` structure lists `framework/app.js`, `todo/components/`, `todo/styles.css`. They don't exist | README corrected; `Todo.md` left as a planning doc |
| `Design.md`: `hht.*` API, `mount` as the main renderer, automatic re-rendering, route map with params | Labelled historical, with a mapping table |
| `PROJECT-AUDIT.md`: "no keys / no unsubscribe / no refs / no global events" | Labelled as a snapshot of `0719855` |
| `Todo.md`: "Explain automatic rendering" | Left (planning doc). The documentation states clearly that rendering is manual |

### Possible bugs and weak spots found (documented, not fixed)

Per the audit rules, these are documented rather than changed. None of them makes the documentation incorrect.

1. **TodoMVC shows `section.main` and `footer.footer` even with no todos.** `createTodoPage` in `todo/view.js` always renders both. The TodoMVC specification, and this project's own `docs/TodoMVC-Study.md` §11, say they should be hidden or omitted when the list is empty. This is app behaviour, not framework behaviour.
2. **`subscribe()` does not validate its listener.** A non-function is accepted, and the error appears on the next, unrelated `set()`. `on()` validates its handler; `subscribe()` could do the same.
3. **Some mistakes produce generic `TypeError`s instead of `HHT.js:` errors:** `attrs: null`, function or object children, and `render(target, null)`. Each is thrown by `render()`, not by `createElement()`. Validation in `createElement` would give clearer messages.
4. **A `render()` that throws halfway** leaves the DOM partly patched while the stored previous tree is not updated. Documented recovery: `unmount()`, then render again.
5. **`router.start()` with no hash notifies subscribers twice:** once synchronously, and once on the `hashchange` caused by setting `#/`. This only costs an extra render.
6. **Style values of `false`** are written to `element.style`, and the browser keeps the old value. This is correct per the code, but easy to get wrong, so it is documented with a warning.
7. **Controlled `<select value>`** is wrong on the first render because attributes are set before the options are added. This limitation was already known and remains documented.
8. **Minor stale comment:** `todo/view.js` `createTodoApp` says "Children are added in later steps", but the children are now passed in. Code comment only.

---

## Remaining Limitations

Things this audit could not fully verify, and why:

- **No real browser was used.** The examples ran against a fake DOM. Browser-specific statements come from web standards, not from running them here: SVG elements not being drawn, `onChange` timing on text inputs, `moveBefore()` focus retention, the browser rejecting `width: 100` or `color: false`, and `location.hash` assignments adding history entries. The HHT.js side of each statement (which DOM calls are made) was confirmed in the source.
- **Which browsers support `Element.moveBefore()`** is intentionally not listed, because the list changes over time.
- **Timing of `hashchange`** (fired after `navigate()` returns) is standard browser behaviour. The tests simulate it but cannot prove it.
- **Performance** is described only in terms of what work is done (the whole tree is compared, only changed DOM is written). No timing claims are made.

---

## Final Verification

The documentation was checked by working through the beginner tasks using only `README.md` and `docs/documentation.md`:

| Task | Where it is covered |
| --- | --- |
| Install the project | Installation (Node version and `npm install`) |
| Run it | Running the Project (`npm run dev`, `npm test`, why a server) |
| Import the framework | Importing HHT.js (named exports, relative path, no default export) |
| Create a div / add text | Quick Start, Creating Elements, Children |
| Add attributes | Attributes (HTML names, `null`, boolean attributes, `data-*`/`aria-*`), Styles |
| Nest elements | Children → Nested elements; Nested UI example |
| Handle a click | Events; Counter example |
| Handle an input event | Events → The event object; Forms |
| Create, read, update and subscribe to state | State |
| Render an app and update the UI | Connecting State to Rendering; Rendering |
| Render a list and use keys | Children → Arrays; Keys; List example |
| Use refs | Refs (focus and per-frame examples) |
| Create routes and navigate | Routing; Routing example |
| Handle cleanup | State → Stopping a subscription; Global Events → stop functions; Rendering → `unmount()` |
| Understand limitations | Current Limitations; Error Handling |

**Conclusion:** a new user can use every public HHT.js feature (all seven exports, every state and router method, and the `key`, `ref`, `style` and `on…` attribute rules) from the documentation alone, without opening the framework source. Every code example uses the current API. The five complete examples were executed against the real framework and behave as described.

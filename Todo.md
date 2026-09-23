# Mini-Framework Project Roadmap

Use this checklist as your step-by-step guide.

> **Rule:** Do not move to the next stage until the current stage works.

---

## Stage 1 — Understand the Project

- [X] Write down the 4 required framework features in your own words:
  - [X] DOM abstraction
  - [X] State management
  - [X] Event handling
  - [X] Routing
- [X] Write down what TodoMVC needs to do.
- [X] Decide on a name for your framework.
- [X] Decide what you want your framework syntax to look like.
- [X] Sketch how a user should create an element.
- [X] Sketch how a user should create an event.
- [X] Sketch how a user should update state.
- [X] Sketch how routing should look.
- [X] Make sure you understand this flow:

```text
event → state change → render → DOM update
```

---

## Stage 2 — Create the Project Structure

- [X] Create the main project folder.
- [X] Create `index.html`.
- [X] Create `package.json` if you plan to use a development server.
- [X] Create a `framework/` folder.
- [X] Create a `todo/` folder.
- [X] Create a `docs/` folder.
- [X] Create `README.md`.
- [X] Make sure you can run the project from the root folder.
- [X] Open the project in the browser and confirm basic JavaScript works.

Suggested structure:

```text
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

---

## Stage 3 — Design Your Framework API

- [X] Decide how elements will be created.
- [X] Decide how attributes will be passed.
- [X] Decide how child elements will be passed.
- [X] Decide how text children will work.
- [X] Decide how events will be declared.
- [X] Decide how the application will be mounted.
- [X] Decide how state will be created.
- [X] Decide how state will be updated.
- [X] Decide how routes will be registered.
- [X] Write some fake example code showing what you want your framework to feel like.
- [X] Do not worry yet about how to implement everything internally.

---

## Stage 4 — Build DOM Abstraction

- [X] Create a function that represents an HTML element as a JavaScript object.
- [X] Make it support a tag name.
- [X] Make it support attributes.
- [X] Make it support text.
- [X] Make it support child elements.
- [X] Make it support deeply nested elements.
- [X] Create a function that turns your JavaScript representation into a real DOM element.
- [X] Create a function that mounts it into the page.
- [X] Test a simple `div`.
- [X] Test attributes like:
  - [X] `class`
  - [X] `id`
  - [X] `placeholder`
  - [X] `type`
- [X] Test nested elements.
- [X] Test text nodes.
- [X] Test several sibling elements.
- [X] Make a tiny page using only your framework API.
- [X] Do not continue until you can create a page without manually using `document.createElement()` in your application code.

---

## Stage 5 — Build Your Event System

- [X] Decide how your framework user declares a click event.
- [X] Add click support.
- [X] Add input support.
- [X] Add change support.
- [X] Add keydown support.
- [X] Make sure the framework user does not need to call `addEventListener()` directly.
- [X] Test a button click.
- [X] Test typing into an input.
- [X] Test pressing Enter.
- [X] Test more than one event on the page.
- [X] Decide whether to use direct listeners or event delegation.
- [X] If using event delegation, understand how the framework finds the correct handler.
- [X] Do not continue until your event API feels simple to use.

---

## Stage 6 — Build State Management

- [X] Decide what a store looks like.
- [X] Create an initial state.
- [X] Create a way to read state.
- [X] Create a way to update state.
- [X] Create a way to subscribe to state changes.
- [X] Make state available to the whole application.
- [X] Decide whether state updates replace or merge values.
- [X] Decide whether updater functions are supported.

Yes. `set()` supports both direct values and updater functions.

Examples:

```js
state.set(10);

state.set(current => current + 1);
```

- [X] Test state without using the DOM first.
- [X] Create a counter state with `count: 0`.
- [X] Increase the count.
- [X] Decrease the count.
- [X] Confirm subscribers run when state changes.
- [X] Avoid directly modifying state from random places.

Yes. `set()` supports both direct values and updater functions.

Examples:

```js
state.set(10);

state.set(current => current + 1);
```

---

## Stage 7 — Connect State to Rendering

- [X] Make the application render from the current state.
- [X] Subscribe your renderer to state changes.
- [X] Change the state.
- [X] Confirm the page updates automatically.
- [X] Build a simple counter application.
- [X] Add a `+` button.
- [X] Add a `-` button.
- [X] Add a reset button.
- [X] Confirm events update state.
- [X] Confirm state causes rendering.
- [X] Confirm the visible DOM changes.
- [X] Verify this full cycle works:

```text
user action → event → state → render → DOM
```

- [X] Do not start TodoMVC until this works reliably.

---

## Stage 8 — Improve Rendering

- [X] Decide whether you will completely rerender the app after state changes or create DOM diffing.



<pre class="overflow-visible! px-0!" data-start="53" data-end="218"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="relative h-full w-full border-radius-3xl bg-(--code-block-surface) corner-superellipse/1.1 overflow-clip rounded-3xl [--code-block-surface:var(--bg-elevated-secondary)] dark:[--code-block-surface:var(--composer-surface-primary)] lxnfua_clipPathFallback"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class=""><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0 PDq2pG_selectionAnchorContainer"><code><span>Decision: HHT.js will use complete rerendering first.</span></code><span aria-hidden="true" class="PDq2pG_selectionAnchor"></span></pre></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></div></div></pre>

Current renderer: after starting with complete rerendering, HHT.js now uses a small index-based Virtual DOM diff.

- [X] Start with complete rerendering if necessary.
- [X] Make sure rerendering does not break events.
- [X] Make sure input values behave correctly.
- [X] Make sure attributes update correctly.
- [X] If everything else is finished, consider creating a simple Virtual DOM diff.
- [X] Do not build a complex diffing system just because React has one.
- [X] Focus on correctness first.

---

## Stage 9 — Build Routing

- [ ] Decide whether you will use hash routing.
- [ ] Start with routes such as:
  - [ ] `/`
  - [ ] `/active`
  - [ ] `/completed`
- [ ] Create a router object or function.
- [ ] Create a way to register routes.
- [ ] Create a way to navigate.
- [ ] Detect URL changes.
- [ ] Get the current route.
- [ ] Connect the current route to application state.
- [ ] Test manually changing the URL.
- [ ] Test clicking a navigation link.
- [ ] Confirm changing the route changes what is rendered.
- [ ] Confirm refreshing the page keeps the correct route.
- [ ] Confirm browser back/forward navigation works if your routing design supports it.

---

## Stage 10 — Make a Small Framework Test App

- [ ] Do not use TodoMVC yet.
- [ ] Create a small app using only your framework.
- [ ] Include nested elements.
- [ ] Include attributes.
- [ ] Include at least two event types.
- [ ] Include shared state.
- [ ] Include at least two routes.
- [ ] Confirm all four framework requirements work together.
- [ ] Fix framework problems now instead of while building TodoMVC.

---

## Stage 11 — Study TodoMVC Carefully

- [ ] Open a TodoMVC example.
- [ ] Use the application normally.
- [ ] Make a list of everything it can do.
- [ ] Inspect the HTML structure.
- [ ] Look at important classes.
- [ ] Look at IDs if present.
- [ ] Look at filters.
- [ ] Look at completed todo styling.
- [ ] Look at editing behavior.
- [ ] Look at the item counter.
- [ ] Look at clear-completed behavior.
- [ ] Look at toggle-all behavior.
- [ ] Check what happens when the todo list becomes empty.
- [ ] Check what happens when you refresh.
- [ ] Check each URL/filter.

---

## Stage 12 — Design Your TodoMVC State

- [ ] Decide what one todo object contains.
- [ ] Give every todo a unique ID.
- [ ] Store its text/title.
- [ ] Store whether it is completed.
- [ ] Decide whether edit mode belongs in application state.
- [ ] Store the current filter or derive it from the router.
- [ ] Write the initial state.
- [ ] Keep the state as small as possible.
- [ ] Avoid storing information that can easily be calculated from existing state.

---

## Stage 13 — Build TodoMVC Layout First

- [ ] Create the main TodoMVC container.
- [ ] Create the title.
- [ ] Create the new-todo input.
- [ ] Create the main todo section.
- [ ] Create the todo list.
- [ ] Create one temporary fake todo.
- [ ] Create the footer.
- [ ] Create the remaining-items text.
- [ ] Create All/Active/Completed links.
- [ ] Create Clear Completed.
- [ ] Match the required classes and IDs.
- [ ] Do not implement all behavior yet.
- [ ] First make the structure visually correct.

---

## Stage 14 — Add Todo Functionality

- [ ] Capture text from the input.
- [ ] Detect Enter.
- [ ] Ignore empty todos.
- [ ] Create a new todo.
- [ ] Add it to state.
- [ ] Clear the input after adding.
- [ ] Confirm the framework rerenders automatically.
- [ ] Test adding many todos.

---

## Stage 15 — Complete / Uncomplete Todos

- [ ] Add a checkbox to each todo.
- [ ] Connect it to an event.
- [ ] Find the todo by ID.
- [ ] Change its completed state.
- [ ] Update the store.
- [ ] Apply the correct completed class.
- [ ] Test completing and uncompleting several todos.

---

## Stage 16 — Delete Todos

- [ ] Add the delete/destroy button.
- [ ] Pass the correct todo ID.
- [ ] Remove the correct todo from state.
- [ ] Test deleting the first item.
- [ ] Test deleting the middle item.
- [ ] Test deleting the last item.
- [ ] Test deleting everything.

---

## Stage 17 — Remaining Count

- [ ] Calculate active todos.
- [ ] Display the correct count.
- [ ] Use correct singular/plural text if required.
- [ ] Verify the number changes when adding.
- [ ] Verify it changes when completing.
- [ ] Verify it changes when deleting.

---

## Stage 18 — Filters and Routing

- [ ] Connect All to the `/` route.
- [ ] Connect Active to `/active`.
- [ ] Connect Completed to `/completed`.
- [ ] Filter the visible todos based on the route.
- [ ] Do not delete hidden todos from state.
- [ ] Add the selected class to the current filter.
- [ ] Test browser refresh on every route.
- [ ] Test navigating between all three filters.

---

## Stage 19 — Clear Completed

- [ ] Show the button when completed todos exist.
- [ ] Remove all completed todos when clicked.
- [ ] Keep active todos.
- [ ] Update the counter.
- [ ] Confirm filters still work correctly.

---

## Stage 20 — Toggle All

- [ ] Add the toggle-all control.
- [ ] Detect whether every todo is completed.
- [ ] If not all are completed, complete them all.
- [ ] If all are completed, make them active.
- [ ] Check that the control reflects the correct state.

---

## Stage 21 — Editing Todos

- [ ] Detect the required action for entering edit mode, usually double-click.
- [ ] Show an edit input.
- [ ] Fill it with the current todo title.
- [ ] Save when Enter is pressed.
- [ ] Handle blur if TodoMVC requires it.
- [ ] Handle Escape if required.
- [ ] Remove the todo if the edited text becomes empty if that matches TodoMVC behavior.
- [ ] Exit edit mode correctly.
- [ ] Test editing several different todos.

---

## Stage 22 — Persistence

- [ ] Decide whether TodoMVC state should survive refresh.
- [ ] Research `localStorage`.
- [ ] Save state when todos change.
- [ ] Load saved state when the app starts.
- [ ] Keep persistence logic separate from framework internals unless persistence is intentionally a framework feature.
- [ ] Test refreshing the page.

---

## Stage 23 — Test Your Framework Like an Auditor

- [ ] Pretend you have never seen your framework before.
- [ ] Import it into a new small file.
- [ ] Create a `div`.
- [ ] Add attributes.
- [ ] Nest elements.
- [ ] Add a button event.
- [ ] Create state.
- [ ] Change state.
- [ ] Add routes.
- [ ] If anything feels confusing, improve the API or documentation.
- [ ] Make sure users do not need to inspect your source code just to learn basic usage.

---

## Stage 24 — Write the Documentation

- [ ] Explain what your framework is.
- [ ] Explain its philosophy/design.
- [ ] Explain how to install/run it.
- [ ] Explain how to import it.
- [ ] Explain how to create an element.
- [ ] Show a simple element example.
- [ ] Explain attributes.
- [ ] Show an attributes example.
- [ ] Explain nested elements.
- [ ] Show a nesting example.
- [ ] Explain events.
- [ ] Show an event example.
- [ ] Explain state management.
- [ ] Show state creation.
- [ ] Show state updates.
- [ ] Explain automatic rendering.
- [ ] Explain routing.
- [ ] Show route registration.
- [ ] Show navigation.
- [ ] Explain why your framework works this way.
- [ ] Explain inversion of control.
- [ ] Add a complete small example, such as a counter.
- [ ] Document every public function you expect an auditor to use.

---

## Stage 25 — Clean Your Framework API

- [ ] Look for duplicated code.
- [ ] Rename confusing functions.
- [ ] Rename confusing variables.
- [ ] Remove unused code.
- [ ] Keep internal functions private when users do not need them.
- [ ] Export only the framework API.
- [ ] Add useful error messages for invalid usage.
- [ ] Keep framework code separate from TodoMVC code.

---

## Stage 26 — Add Your Own Creativity

- [ ] Choose at least one idea that makes your framework feel like yours.
- [ ] Consider lifecycle hooks.
- [ ] Consider a debug mode.
- [ ] Consider a custom element syntax.
- [ ] Consider small component helpers.
- [ ] Consider middleware for state changes.
- [ ] Consider route parameters.
- [ ] Consider derived/computed state.
- [ ] Consider custom event modifiers.
- [ ] Only add creative features after the required features work.
- [ ] Be able to explain why your creative feature is useful.

---

## Stage 27 — Final TodoMVC Testing

- [ ] Add one todo.
- [ ] Add many todos.
- [ ] Add an empty todo.
- [ ] Complete one.
- [ ] Uncomplete one.
- [ ] Complete all.
- [ ] Uncomplete all.
- [ ] Delete one.
- [ ] Delete all.
- [ ] Edit one.
- [ ] Test All.
- [ ] Test Active.
- [ ] Test Completed.
- [ ] Test Clear Completed.
- [ ] Test item count.
- [ ] Test browser navigation.
- [ ] Test refreshing each URL.
- [ ] Check required IDs/classes.
- [ ] Check the browser console for errors.

---

## Stage 28 — Final Auditor Test

- [ ] Clone/open your project as if you were another person.
- [ ] Follow only your README/documentation.
- [ ] Run the project from the root.
- [ ] Build a tiny test app using your framework.
- [ ] Create an element.
- [ ] Add attributes.
- [ ] Nest elements.
- [ ] Add events.
- [ ] Use state.
- [ ] Use routing.
- [ ] If you get stuck anywhere, improve your documentation.
- [ ] Confirm TodoMVC still runs after cleanup.

---

# Main Milestones

## Milestone 1 — DOM + Events

Make this work first:

```text
Create an element
        ↓
Add attributes
        ↓
Nest elements
        ↓
Put it on the page
        ↓
Trigger an event
```

- [ ] Milestone 1 complete

## Milestone 2 — State

```text
Event
  ↓
Update state
  ↓
Framework detects change
  ↓
Render again
```

- [ ] Milestone 2 complete

## Milestone 3 — Routing

```text
URL changes
    ↓
Router detects route
    ↓
Application state/view changes
```

- [ ] Milestone 3 complete

## Milestone 4 — TodoMVC

- [ ] Add todo
- [ ] Complete todo
- [ ] Delete todo
- [ ] Edit todo
- [ ] Toggle all
- [ ] Clear completed
- [ ] Item counter
- [ ] All filter
- [ ] Active filter
- [ ] Completed filter
- [ ] Correct routes

## Milestone 5 — Documentation

- [ ] A new user can use the framework without reading its source code.

---

# Important Rule

Do not think:

> "I need to build the whole framework today."

Think:

> "I need to finish the next unchecked task."

Start with:

```text
DOM abstraction
      ↓
Events
      ↓
State
      ↓
Automatic rendering
      ↓
Routing
      ↓
TodoMVC
      ↓
Documentation
      ↓
Cleanup + creativity
```

## Add-on: AI Todo Generator

> Add this feature only after finishing the core project requirements.

* [ ] Add a `Generate with AI` button.
* [ ] Add an input where the user can describe a goal or what they want to do.
* [ ] Send the user input to an AI API.
* [ ] Make the AI return a structured list of todos.
* [ ] Convert the AI response into tasks inside the app.
* [ ] Show the suggested tasks before adding them.
* [ ] Let the user choose which tasks to add.
* [ ] Add an `Add Selected` button.
* [ ] Add an `Add All` button.
* [ ] Save the added tasks in the app state.
* [ ] Save the tasks in `localStorage`.

### AI Task Data

* [ ] Make the AI return a `title` for each task.
* [ ] Support `priority`:

  * [ ] Low
  * [ ] Medium
  * [ ] High
* [ ] Support `category` or `project`.
* [ ] Support a `due date` when requested.
* [ ] Support `notes` when needed.

### AI Settings

* [ ] Add an `AI Settings` section or page.
* [ ] Add a field for entering the API key.
* [ ] Do not hardcode the API key in the source code.
* [ ] Allow choosing an AI provider.
* [ ] Allow choosing a model if needed.
* [ ] Add a button to test the AI API connection.

### Error Handling

* [ ] Handle API errors.
* [ ] Show an error if the API key is invalid.
* [ ] Show a message if the free API limit is reached.
* [ ] Handle invalid AI responses.
* [ ] Prevent empty tasks from being added.
* [ ] Avoid duplicate tasks when possible.

### Future AI Features

* [ ] `Plan my day` — turn daily goals into tasks.
* [ ] `Break down task` — split a large task into smaller tasks.
* [ ] `Suggest next tasks` — suggest the next useful steps.
* [ ] `Prioritize tasks` — suggest task priorities.
* [ ] `Create study plan` — turn a learning goal into a study plan.
* [ ] `Create project plan` — turn a project idea into actionable tasks.
* [ ] Let the AI understand how much time the user has available.
* [ ] Let the AI suggest due dates or time blocks.
* [ ] Export AI-generated tasks to `todo.md`.

### Important

* [ ] Finish the core TodoMVC and framework first.
* [ ] Keep AI as a separate add-on.
* [ ] Make sure the Todo app still works normally if the AI API is unavailable.

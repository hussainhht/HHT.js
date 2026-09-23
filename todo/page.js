import { createElement } from "../framework/dom.js";
import { increaseCount, decreaseCount, resetCount } from "./actions.js";
import { routePaths } from "./routes.js";
import { appState, counterState } from "./state.js";

function getRouteTitle(route) {
  if (route === routePaths.home) return appState.get().title;
  if (route === routePaths.active) return "Active items";
  if (route === routePaths.completed) return "Completed items";
  return "Not found";
}

export function createPage(route = routePaths.home) {
  return createElement("main", { class: "app" }, [
    createElement("h1", {}, [getRouteTitle(route)]),
    createElement("p", { id: "count" }, [`Count: ${counterState.get().count}`]),
    createElement("div", {}, [
      createElement("button", { onClick: decreaseCount }, ["-"]),
      createElement("button", { onClick: increaseCount }, ["+"]),
      createElement("button", { onClick: resetCount }, ["Reset"]),
    ]),
    createElement("nav", { "aria-label": "Main navigation" }, [
      createElement("a", { href: `#${routePaths.home}` }, ["Home"]),
      createElement("a", { href: `#${routePaths.active}` }, ["Active"]),
      createElement("a", { href: `#${routePaths.completed}` }, ["Completed"]),
    ]),
  ]);
}

import { createElement } from "../framework/dom.js";
import { increaseCount, decreaseCount, resetCount } from "./actions.js";
import { appState, counterState } from "./state.js";

export function createPage() {
  return createElement("main", { class: "app" }, [
    createElement("h1", {}, [appState.get().title]),
    createElement("p", { id: "count" }, [`Count: ${counterState.get().count}`]),
    createElement("div", {}, [
      createElement("button", { onClick: decreaseCount }, ["-"]),
      createElement("button", { onClick: increaseCount }, ["+"]),
      createElement("button", { onClick: resetCount }, ["Reset"]),
    ]),
  ]);
}

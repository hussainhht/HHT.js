import { createElement } from "../framework/dom.js";
import { appState } from "./state.js";

export function createPage() {
  return createElement("main", { class: "app" }, [
    createElement("h1", {}, [appState.get().title]),
    createElement("p", {}, ["This page was built with the framework API."]),
    createElement("ul", {}, [
      createElement("li", {}, ["Create elements"]),
      createElement("li", {}, ["Add text and children"]),
      createElement("li", {}, ["Mount the page"]),
    ]),
  ]);
}

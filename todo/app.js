import { render } from "../framework/dom.js";
import { createPage } from "./page.js";
import { appState, counterState } from "./state.js";

function renderApp() {
  render("#app", createPage());
}

appState.subscribe(renderApp);
counterState.subscribe(renderApp);
renderApp();

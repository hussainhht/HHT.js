// Counter + message demo; only used by tests/rendering.test.js.
import { createRouter, render } from "../framework/index.js";
import { createPage } from "./page.js";
import { routePaths } from "./routes.js";
import { appState, counterState } from "./state.js";

const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path));

function renderApp() {
  render("#app", router.getCurrentView(createPage));
}

appState.subscribe(renderApp);
counterState.subscribe(renderApp);
router.subscribe(renderApp);
router.start();
renderApp();

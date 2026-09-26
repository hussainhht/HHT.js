// Stage 10 framework test app (counter + message demo). No longer the page
// entry point, which is now TodoMVC in app.js; kept so tests/rendering.test.js
// can still exercise state-driven re-rendering end to end.
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

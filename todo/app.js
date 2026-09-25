import { render } from "../framework/dom.js";
import { createRouter } from "../framework/router.js";
import { routePaths } from "./routes.js";
import { createTodoPage } from "./view.js";

const router = createRouter();
Object.values(routePaths).forEach((path) => router.register(path));

function renderApp() {
  render("#app", router.getCurrentView(createTodoPage));
}

router.subscribe(renderApp);
router.start();
renderApp();

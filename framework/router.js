import { createElement } from "./dom.js";
import { state } from "./store.js";

function normalizePath(path) {
  let normalized = String(path).replace(/^#/, "");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, "");
  return normalized || "/";
}

export function notFound(path) {
  return createElement("main", { class: "not-found" }, [
    createElement("h1", {}, ["404 Not Found"]),
    createElement("p", {}, [`No route matches ${path}.`]),
  ]);
}

export function createRouter() {
  const routes = new Set();
  const currentRoute = state("/");
  let started = false;

  function pathFromHash() {
    return normalizePath(window.location.hash || "/");
  }

  function syncFromHash() {
    currentRoute.set(pathFromHash());
  }

  function register(path) {
    routes.add(normalizePath(path));
    return router;
  }

  function navigate(path) {
    const normalized = normalizePath(path);
    const hash = `#${normalized}`;
    if (window.location.hash === hash) {
      syncFromHash();
    } else {
      window.location.hash = hash;
    }
  }

  function start() {
    if (!started) {
      window.addEventListener("hashchange", syncFromHash);
      started = true;
    }

    if (!window.location.hash) {
      window.location.hash = `#${currentRoute.get()}`;
    }
    syncFromHash();
  }

  const router = {
    register,
    navigate,
    start,
    getCurrentRoute() {
      return currentRoute.get();
    },
    getCurrentView(renderRoute) {
      const path = currentRoute.get();
      return routes.has(path) ? renderRoute(path) : notFound(path);
    },
    subscribe(listener) {
      return currentRoute.subscribe(listener);
    },
  };

  return router;
}

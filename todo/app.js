import { createElement, mount } from "../framework/dom.js";

const app = createElement("main", { class: "app" }, [
  createElement("h1", {}, ["Hello HHT.js"]),
  createElement("p", {}, ["This page was built with the framework API."]),
  createElement("ul", {}, [
    createElement("li", {}, ["Create elements"]),
    createElement("li", {}, ["Add text and children"]),
    createElement("li", {}, ["Mount the page"]),
  ]),
]);

mount("#app", app);

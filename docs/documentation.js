const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function highlightJavaScript(source) {
  const tokens =
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|const|let|function|return|if|else|new|true|false|null|undefined|typeof|class|this|async|await)\b|\b\d+(?:\.\d+)?\b|=>/g;
  let result = "";
  let lastIndex = 0;

  for (const match of source.matchAll(tokens)) {
    result += escapeHtml(source.slice(lastIndex, match.index));
    const value = match[0];
    let kind = "operator";
    if (value.startsWith("//") || value.startsWith("/*")) kind = "comment";
    else if (/^["'`]/.test(value)) kind = "string";
    else if (/^\d/.test(value)) kind = "number";
    else if (value !== "=>") kind = "keyword";
    result += `<span class="token-${kind}">${escapeHtml(value)}</span>`;
    lastIndex = match.index + value.length;
  }

  return result + escapeHtml(source.slice(lastIndex));
}

function highlightHtml(source) {
  const tokens = /<\/?[a-z][\w-]*|\b[a-z][\w-]*(?==)|"[^"]*"|\/?>/gi;
  let result = "";
  let lastIndex = 0;

  for (const match of source.matchAll(tokens)) {
    result += escapeHtml(source.slice(lastIndex, match.index));
    const value = match[0];
    const kind =
      value.startsWith("<") || value === ">" || value === "/>"
        ? "tag"
        : value.startsWith('"')
          ? "string"
          : "keyword";
    result += `<span class="token-${kind}">${escapeHtml(value)}</span>`;
    lastIndex = match.index + value.length;
  }

  return result + escapeHtml(source.slice(lastIndex));
}

const copyIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
const copyStatus = document.createElement("span");
copyStatus.className = "sr-only";
copyStatus.setAttribute("role", "status");
copyStatus.setAttribute("aria-live", "polite");
document.body.append(copyStatus);

function announceCopy(message) {
  copyStatus.textContent = "";
  requestAnimationFrame(() => {
    copyStatus.textContent = message;
  });
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // The fallback also works when clipboard permission is unavailable.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy was unavailable.");
}

for (const pre of document.querySelectorAll("pre[data-language]")) {
  const code = pre.querySelector("code");
  if (!code) continue;

  const source = code.textContent.replace(/\s+$/, "");
  const language = pre.dataset.language;
  if (language === "JavaScript") code.innerHTML = highlightJavaScript(source);
  else if (language === "HTML") code.innerHTML = highlightHtml(source);

  const toolbar = document.createElement("div");
  toolbar.className = "code-toolbar";

  const label = document.createElement("span");
  label.className = "code-language";
  label.textContent = language;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.setAttribute("aria-label", `Copy ${language} code`);
  button.innerHTML = `${copyIcon}<span>Copy</span>`;
  let resetTimer;
  button.addEventListener("click", async () => {
    try {
      await copyText(source);
      button.classList.add("copied");
      button.querySelector("span").textContent = "Copied";
      button.setAttribute("aria-label", `${language} code copied`);
      announceCopy(`${language} code copied to clipboard.`);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.classList.remove("copied");
        button.querySelector("span").textContent = "Copy";
        button.setAttribute("aria-label", `Copy ${language} code`);
      }, 1800);
    } catch {
      button.querySelector("span").textContent = "Retry";
      button.setAttribute(
        "aria-label",
        `Could not copy ${language} code; retry`,
      );
      announceCopy(`Could not copy ${language} code. Please retry.`);
    }
  });

  toolbar.append(label, button);
  pre.prepend(toolbar);
}

const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeColors = { light: "#f8fafc", dark: "#0a121c" };
const THEME_KEY = "theme-hhtjs";

// The inline script in docs.html already chose the theme before first paint;
// this keeps the button and the browser's toolbar colour in step with it.
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeColor.content = themeColors[theme];
}

setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Blocked storage: the choice only lasts until the page is closed.
  }
});

const menuButton = document.querySelector(".menu-button");
const scrim = document.querySelector(".mobile-scrim");
const sidebar = document.querySelector(".sidebar");
const mainContent = document.querySelector(".main-content");
const search = document.querySelector("#nav-search");
const navLinks = [...document.querySelectorAll(".section-nav a")];
const sections = [...document.querySelectorAll(".hero[id], .doc-section[id]")];

function setMenuOpen(open) {
  const wasOpen = document.body.classList.contains("menu-open");
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute(
    "aria-label",
    open ? "Close documentation menu" : "Open documentation menu",
  );
  mainContent.inert = open;
  if (open) {
    requestAnimationFrame(() => {
      if (document.body.classList.contains("menu-open")) search.focus();
    });
  } else if (
    wasOpen &&
    sidebar.contains(document.activeElement) &&
    window.innerWidth <= 900
  ) {
    menuButton.focus();
  }
}

menuButton.addEventListener("click", () =>
  setMenuOpen(!document.body.classList.contains("menu-open")),
);
scrim.addEventListener("click", () => setMenuOpen(false));
document.addEventListener("keydown", (event) => {
  if (!document.body.classList.contains("menu-open")) return;
  if (event.key === "Escape") {
    setMenuOpen(false);
    menuButton.focus();
  } else if (event.key === "Tab") {
    const focusable = [
      themeToggle,
      menuButton,
      search,
      ...navLinks.filter(
        (link) => !link.hidden && !link.closest(".nav-group").hidden,
      ),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      search.focus();
    }
  }
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 900 && document.body.classList.contains("menu-open"))
    setMenuOpen(false);
});
for (const link of navLinks)
  link.addEventListener("click", () => {
    const wasOpen = document.body.classList.contains("menu-open");
    setMenuOpen(false);
    if (wasOpen) {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }
  });

search.addEventListener("input", () => {
  const query = search.value.trim().toLocaleLowerCase();
  let matches = 0;
  for (const group of document.querySelectorAll(".nav-group")) {
    let groupMatches = 0;
    for (const link of group.querySelectorAll("a")) {
      const visible = link.textContent.toLocaleLowerCase().includes(query);
      link.hidden = !visible;
      if (visible) groupMatches += 1;
    }
    group.hidden = groupMatches === 0;
    matches += groupMatches;
  }
  document.querySelector(".search-empty").hidden = matches !== 0;
});

let scrollQueued = false;
function updateCurrentSection() {
  let current = sections[0]?.id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 180) current = section.id;
    else break;
  }
  for (const link of navLinks) {
    const active = link.getAttribute("href") === `#${current}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  scrollQueued = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateCurrentSection);
  },
  { passive: true },
);
window.addEventListener("hashchange", () =>
  requestAnimationFrame(updateCurrentSection),
);
updateCurrentSection();

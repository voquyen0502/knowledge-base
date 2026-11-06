(function () {
  "use strict";

  var SIDEBAR_STORAGE_KEY = "wiki.primary-sidebar-collapsed";

  function ensureStyle() {
    if (document.getElementById("nav-collapse-style")) return;
    var s = document.createElement("style");
    s.id = "nav-collapse-style";
    s.textContent = [
      "@media screen and (min-width: 76.25em) {",
      "  .md-sidebar--primary .md-nav__item--nested > .md-toggle:not(:checked) ~ .md-nav {",
      "    display: none !important;",
      "  }",
      "  .md-sidebar--primary .md-nav__item--nested > .md-nav__container > label.md-nav__link {",
      "    display: flex;",
      "    align-items: center;",
      "    cursor: pointer;",
      "    pointer-events: auto !important;",
      "    margin: 0;",
      "    padding: 4px 0.2rem 0 0.4rem;",
      "  }",
      "  .md-sidebar--primary .md-nav__item--nested > .md-nav__container > label.md-nav__link .md-nav__icon {",
      "    display: block;",
      "  }",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function applyDefaultState() {
    var sidebar = document.querySelector(".md-sidebar--primary");
    if (!sidebar) return;
    if (sidebar.querySelector(".md-nav__item--nested > .md-toggle:checked")) return;

    var sections = sidebar.querySelectorAll(".md-nav__item--nested");
    if (sections.length > 0) {
      var firstToggle = sections[0].querySelector(":scope > .md-toggle");
      if (firstToggle) firstToggle.checked = true;
    }
  }

  function readSidebarPreference() {
    try {
      var value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return value === null ? null : value === "true";
    } catch (_) {
      return null;
    }
  }

  function writeSidebarPreference(collapsed) {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch (_) {}
  }

  function setSidebarCollapsed(collapsed, remember) {
    document.documentElement.classList.toggle("sidebar-nav-collapsed", collapsed);

    var button = document.querySelector("[data-sidebar-toggle]");
    if (button) {
      var label = collapsed ? "Hiện thanh bên" : "Ẩn thanh bên";
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }

    if (remember) writeSidebarPreference(collapsed);
  }

  function initSidebarToggle() {
    var button = document.querySelector("[data-sidebar-toggle]");
    var sidebar = document.querySelector(".md-sidebar--primary");
    if (!button || !sidebar || sidebar.hidden) {
      if (button) button.hidden = true;
      return;
    }

    sidebar.id = "primary-navigation";
    button.hidden = false;

    var preference = readSidebarPreference();
    var collapsed = preference === null
      ? document.documentElement.classList.contains("sidebar-nav-collapsed")
      : preference;
    setSidebarCollapsed(collapsed, false);

    if (button.getAttribute("data-sidebar-toggle-bound") !== "true") {
      button.setAttribute("data-sidebar-toggle-bound", "true");
      button.addEventListener("click", function () {
        var next = !document.documentElement.classList.contains("sidebar-nav-collapsed");
        setSidebarCollapsed(next, true);
      });
    }
  }

  function init() {
    ensureStyle();
    applyDefaultState();
    initSidebarToggle();
  }

  document.addEventListener("DOMContentLoaded", init);
  if (window.document$) window.document$.subscribe(init);
})();
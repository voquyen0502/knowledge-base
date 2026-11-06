(function () {
  "use strict";

  // ─── CONSTANTS ──────────────────────────────────────────────────────────
  const STORAGE_KEY = "wiki.primary-sidebar-collapsed";

  const CLASSES = { collapsed: "sidebar-nav-collapsed" };

  const SELECTORS = {
    toggle:       "[data-sidebar-toggle]",
    sidebar:      ".md-sidebar--primary",
    announcer:    "#sidebar-state-announcer",
    nested:       ".md-nav__item--nested",
    nestedToggle: ":scope > .md-toggle",
    nestedLabelScoped: ":scope > .md-nav__container > label.md-nav__link",
    nestedLabelAny:    ".md-sidebar .md-nav__item--nested > .md-nav__container > label.md-nav__link",
    activeLink:   ".md-nav__link--active",
    drawerLabel:  'label[for="__drawer"]',
    drawerCheckbox: "#__drawer",
    searchLabel:  'label[for="__search"]',
  };

  const SR_TEXT = {
    collapsed: "Đã ẩn thanh bên",
    expanded:  "Đã hiện thanh bên",
    drawerOpened: "Đã mở menu điều hướng",
    drawerClosed: "Đã đóng menu điều hướng",
  };

  // ─── state (thuần, chỉ localStorage) ────────────────────────────────────
  const readUserPref = () => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      return v === null ? null : v === "true";
    } catch (err) {
      console.warn("[WikiNav] Không đọc được localStorage", err);
      return null;
    }
  };

  const writeUserPref = (collapsed) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch (err) {
      console.warn("[WikiNav] Không ghi được localStorage", err);
    }
  };

  const isDesktop = () => window.matchMedia("(min-width: 76.25em)").matches;

  // ─── dom ────────────────────────────────────────────────────────────────
  const applySidebarState = (collapsed, { remember = false } = {}) => {
    const sidebar = document.querySelector(SELECTORS.sidebar);
    const toggle  = document.querySelector(SELECTORS.toggle);
    const hadFocusInside = collapsed && sidebar && sidebar.contains(document.activeElement);

    document.documentElement.classList.toggle(CLASSES.collapsed, collapsed);

    if (toggle) {
      const label = collapsed ? "Hiện thanh bên" : "Ẩn thanh bên";
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }

    if (hadFocusInside) {
      const fallback = document.querySelector(SELECTORS.drawerLabel);
      (toggle && !toggle.hidden ? toggle : fallback)?.focus();
    }

    // M11: chỉ lưu preference trên desktop — mobile dùng drawer, không có state collapse
    if (remember && isDesktop()) writeUserPref(collapsed);
  };

  const applySectionAria = () => {
    const sidebar = document.querySelector(SELECTORS.sidebar);
    if (!sidebar) return;
    sidebar.querySelectorAll(SELECTORS.nested).forEach((item) => {
      const toggle = item.querySelector(SELECTORS.nestedToggle);
      const label  = item.querySelector(SELECTORS.nestedLabelScoped);
      if (!toggle || !label) return;
      label.setAttribute("aria-expanded", String(toggle.checked));
      if (!label.hasAttribute("role")) label.setAttribute("role", "button");
      if (!label.hasAttribute("tabindex")) label.setAttribute("tabindex", "0");
    });
  };

  // Chỉ mở section chứa link active — không auto-open section đầu (Nielsen #3).
  const expandActiveSection = () => {
    const sidebar = document.querySelector(SELECTORS.sidebar);
    if (!sidebar) return;
    const active = sidebar.querySelector(SELECTORS.activeLink);
    if (!active) return;
    let node = active;
    while ((node = node.parentElement) && node !== sidebar) {
      if (node.classList.contains("md-nav__item--nested")) {
        const t = node.querySelector(SELECTORS.nestedToggle);
        if (t) t.checked = true;
      }
    }
  };

  const announce = (text) => {
    const el = document.getElementById("sidebar-state-announcer");
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = text; });
  };

  // M1/M3: đồng bộ aria-expanded cho hamburger + trả focus khi đóng drawer
  const onDrawerChange = (event) => {
    const label = document.querySelector(SELECTORS.drawerLabel);
    if (!label) return;
    const open = event.target.checked;
    label.setAttribute("aria-expanded", String(open));
    label.setAttribute("aria-label", open ? "Đóng menu điều hướng" : "Mở menu điều hướng");
    announce(open ? SR_TEXT.drawerOpened : SR_TEXT.drawerClosed);

    if (!open) {
      const sidebar = document.querySelector(SELECTORS.sidebar);
      if (sidebar && sidebar.contains(document.activeElement)) {
        label.focus();
      }
    }
  };

  // ─── handlers ───────────────────────────────────────────────────────────
  const onClick = (event) => {
    // 1. Nút toggle sidebar
    if (event.target.closest(SELECTORS.toggle)) {
      const next = !document.documentElement.classList.contains(CLASSES.collapsed);
      applySidebarState(next, { remember: true });
      announce(next ? SR_TEXT.collapsed : SR_TEXT.expanded);
      return;
    }
    // 2. Label section nested: đồng bộ aria-expanded sau khi checkbox đổi state
    if (event.target.closest(SELECTORS.nestedLabelAny)) {
      requestAnimationFrame(applySectionAria);
    }
  };

  const onKeydown = (event) => {
    const { key, target } = event;

    if (key === "Escape") {
      // M2: mobile — đóng drawer nếu đang mở, trả focus về hamburger
      const drawer = document.getElementById("__drawer");
      if (drawer && drawer.checked) {
        event.preventDefault();
        drawer.checked = false;
        drawer.dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector(SELECTORS.drawerLabel)?.focus();
        return;
      }

      // M2: desktop — collapse sidebar khi focus đang trong sidebar.
      // Trên mobile không có class effect, không ghi localStorage sai.
      if (!isDesktop()) return;
      const sidebar = document.querySelector(SELECTORS.sidebar);
      if (!sidebar) return;
      const isCollapsed = document.documentElement.classList.contains(CLASSES.collapsed);
      if (sidebar.contains(document.activeElement) && !isCollapsed) {
        event.preventDefault();
        applySidebarState(true, { remember: true });
        announce(SR_TEXT.collapsed);
      }
      return;
    }

    // Enter / Space trên label-as-button (drawer, search, nested section)
    if (key === "Enter" || key === " ") {
      if (target.tagName !== "LABEL") return;
      const isFakeButton =
        target.matches(SELECTORS.drawerLabel) ||
        target.matches(SELECTORS.searchLabel) ||
        target.matches(SELECTORS.nestedLabelAny);
      if (isFakeButton) {
        event.preventDefault();
        target.click();
      }
    }
  };

  // ─── lifecycle ──────────────────────────────────────────────────────────
  const isMounted = () =>
    document.documentElement.dataset.navCollapseMounted === "true";

  const mount = () => {
    if (isMounted()) return;
    const sidebar = document.querySelector(SELECTORS.sidebar);
    const toggle  = document.querySelector(SELECTORS.toggle);

    if (!sidebar || !toggle || sidebar.hidden) {
      if (toggle) toggle.hidden = true;
      return;
    }

    document.documentElement.dataset.navCollapseMounted = "true";
    if (!sidebar.id) sidebar.id = "primary-navigation";
    if (toggle) toggle.setAttribute("aria-controls", sidebar.id);
    toggle.hidden = false;

    document.addEventListener("click",   onClick,   true);
    document.addEventListener("keydown", onKeydown, true);

    // M1: bind listener cho checkbox drawer (chỉ gắn 1 lần, guard qua dataset)
    const drawer = document.getElementById("__drawer");
    if (drawer && !drawer.dataset.wikiBound) {
      drawer.dataset.wikiBound = "true";
      drawer.addEventListener("change", onDrawerChange);
    }

    // M11: chỉ apply collapse state trên desktop — mobile không có CSS effect
    if (isDesktop()) {
      const pref = readUserPref();
      const collapsed = pref === null
        ? document.documentElement.classList.contains(CLASSES.collapsed)
        : pref;
      applySidebarState(collapsed, { remember: false });
    }

    applySectionAria();
    expandActiveSection();
    applySectionAria(); // chạy lại vì expandActiveSection vừa đổi checked
  };

  const unmount = () => {
    if (!isMounted()) return;
    document.removeEventListener("click",   onClick,   true);
    document.removeEventListener("keydown", onKeydown, true);
    const drawer = document.getElementById("__drawer");
    if (drawer) {
      drawer.removeEventListener("change", onDrawerChange);
      delete drawer.dataset.wikiBound;
    }
    delete document.documentElement.dataset.navCollapseMounted;
  };

  // ─── boot ───────────────────────────────────────────────────────────────
  if (window.document$) {
    window.document$.subscribe(() => { unmount(); mount(); });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

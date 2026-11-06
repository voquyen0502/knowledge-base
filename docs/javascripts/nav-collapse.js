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
    searchLabel:  'label[for="__search"]',
    drawerBackLabel: '.md-nav--primary .md-nav__item--nested .md-nav__title[for="__drawer"]',
  };

  const SR_TEXT = {
    collapsed: "Đã ẩn thanh bên",
    expanded:  "Đã hiện thanh bên",
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

    if (remember) writeUserPref(collapsed);
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
    // D3: back-button drill-down là <label for="__drawer"> — mặc định không
    // nhận Tab, phải nâng thành role=button + tabindex=0 thủ công.
    sidebar.querySelectorAll(SELECTORS.drawerBackLabel).forEach((label) => {
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

    // Escape: mobile đóng drawer, desktop thu gọn sidebar
    if (key === "Escape") {
      if (window.matchMedia("(max-width: 76.1875em)").matches) {
        const drawer = document.getElementById("__drawer");
        if (drawer && drawer.checked) {
          event.preventDefault();
          drawer.checked = false;
          // E2: drawer bị display:none → focus rơi về <body>, trả về hamburger
          document.querySelector(SELECTORS.drawerLabel)?.focus();
          announce(SR_TEXT.collapsed);
        }
        return;
      }
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

    // Enter / Space trên label-as-button (drawer, search, nested section, back)
    if (key === "Enter" || key === " ") {
      if (target.tagName !== "LABEL") return;
      const isFakeButton =
        target.matches(SELECTORS.drawerLabel) ||
        target.matches(SELECTORS.searchLabel) ||
        target.matches(SELECTORS.nestedLabelAny) ||
        target.matches(SELECTORS.drawerBackLabel);
      if (isFakeButton) {
        event.preventDefault();
        target.click();
      }
    }
  };

  // E2: drawer đóng bằng click overlay / label → trả focus về hamburger,
  // nhưng chỉ khi focus đang thực sự nằm trong sidebar (tránh cướp focus
  // khi drawer tự đóng lúc điều hướng SPA).
  const onChange = (event) => {
    if (event.target.id !== "__drawer" || event.target.checked) return;
    const sidebar = document.querySelector(SELECTORS.sidebar);
    if (!sidebar || !sidebar.contains(document.activeElement)) return;
    document.querySelector(SELECTORS.drawerLabel)?.focus();
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
    document.addEventListener("change",  onChange,  true);

    const pref = readUserPref();
    const collapsed = pref === null
      ? document.documentElement.classList.contains(CLASSES.collapsed)
      : pref;

    applySidebarState(collapsed, { remember: false });
    applySectionAria();
    expandActiveSection();
    applySectionAria(); // chạy lại vì expandActiveSection vừa đổi checked
  };

  const unmount = () => {
    if (!isMounted()) return;
    document.removeEventListener("click",   onClick,   true);
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("change",  onChange,  true);
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

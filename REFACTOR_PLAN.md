# REFACTOR_PLAN.md

> **Phạm vi:** `overrides/partials/header.html`, `docs/stylesheets/book-theme.css`,
> `docs/javascripts/nav-collapse.js`, `hooks/auto_encrypt.py`, `mkdocs.yml`.
> **Mục tiêu:** WCAG 2.1 AA + 10 Heuristics của Nielsen + Clean Code / KISS / DRY / SOLID.
> **Không sửa:** `unlock-tracker.js`, `sync.sh`, `mermaid-init.js`, nội dung `docs/**/*.md`.
> **Nguyên tắc thực thi (theo CLAUDE.md):** surface tradeoff, surgical changes, mỗi bước có tiêu chí verify rõ ràng.

---

## 1. AUDIT & GAP ANALYSIS

### 1.1. UX / A11y Audit

| # | Vị trí | Vi phạm | Chuẩn |
|---|--------|---------|-------|
| A1 | `book-theme.css :root` — `--astro-interactive: #8ba43a` trên nền `#fcfcf9` | Contrast ≈ **2.8:1** — fail cả chữ (4.5:1) lẫn non-text (3:1). Ảnh hưởng: `a:hover`, `li::marker`, vạch active nav, `headerlink:hover`. | WCAG 1.4.3, 1.4.11 |
| A2 | `book-theme.css [data-md-color-scheme="slate"]` — `--astro-muted: #ebebeb99` | Màu alpha không opaque → contrast phụ thuộc backdrop; dễ fail ở viền màn hình. | WCAG 1.4.3 |
| A3 | Toàn `book-theme.css` | **Không có `:focus-visible`**. `.md-search__input { outline: none !important }` chặn ring mặc định. | WCAG 2.4.7 |
| A4 | `overrides/partials/header.html` | **Không có skip-link** tới `#main-content`. | WCAG 2.4.1 |
| A5 | `header.html` — `<label for="__drawer">`, `<label for="__search">` | Không nhận Tab, không phải `<button>`, không có `role`/`aria-expanded`. | WCAG 2.1.1, 4.1.2 |
| A6 | `header.html` — tất cả `{% include ".icons/..." %}` | SVG không có `aria-hidden="true" focusable="false"`; SR đọc rác alt. | WCAG 1.1.1 |
| A7 | `header.html` — `.sidebar-toggle` hardcode `aria-expanded="true"` | Trạng thái ARIA luôn sai khi localStorage đã lưu collapsed. | WCAG 4.1.2 |
| A8 | Toàn cụm interactive | Không có `aria-live` region thông báo trạng thái sidebar khi toggle. | WCAG 4.1.3, Nielsen #1 |
| A9 | `nav-collapse.js` | Không bắt `Escape`; không khoá focus trong sidebar; focus biến mất về `<body>` khi `.md-sidebar--primary` bị `display:none`. | WCAG 2.1.2, 2.4.3 |
| A10 | `nav-collapse.js applyDefaultState()` | Tự mở section đầu tiên bất kể lựa chọn người dùng → override user agency. | Nielsen #3 (User control) |
| A11 | `header.html` — `.md-header__title` là `<div>`, `.md-header__topic` là `<span>` | Không có `<h1>`/landmark heading; SR không nhảy được tới tiêu đề trang. | WCAG 1.3.1 |
| A12 | `book-theme.css .md-content__button { display:none !important }` | Ẩn chức năng `content.action.edit/view` đã bật trong `mkdocs.yml` → dead config, mất khả năng truy cập. | Nielsen #4 |

### 1.2. Code Quality & Technical Debt

#### 1.2.1. CSS (`book-theme.css`, ~430 dòng)

| # | Vấn đề | Chuẩn bị vi phạm |
|---|--------|------------------|
| C1 | **~62 lần `!important`** (đa số để chống Material). Đặc biệt `body { background-color: ... !important }`. | KISS / Clean Code |
| C2 | **Thiếu design token cho spacing / z-index / radius / motion / font-size**. Chỉ có color token. Hard-code rải rác: `padding: 20px 24px`, `margin: 2em 0`, `border-radius: 4px`, `height: 57px`, `28px`. | DRY |
| C3 | **Selector lồng >3 cấp**: `.md-sidebar--primary .md-nav--primary > .md-nav__title::after`, `.md-typeset :is(h2, h3, h4):hover .headerlink`. | Clean Code |
| C4 | **Trùng lặp**: `.md-sidebar--primary { width: 13.5rem }` khai báo 2 lần (section 5 và 6). `.md-sidebar--secondary { width: 13rem; ... }` và `13.5rem` ở 2 media query (section 5 và 7). `scrollbar` style chỉ đặt cho secondary không đặt primary. | DRY |
| C5 | **Magic numbers không kiểm soát**: `76.25em` (breakpoint Material) rải ở 6 nơi; `44rem`; `13rem/13.5rem`; `2px`; `8px`; `20px` — không token. | Clean Code |
| C6 | **Section 5 và 7 override chồng chéo** cùng breakpoint (76.25em), chồng `.md-sidebar--primary/secondary` với mâu thuẫn width. | DRY |
| C7 | **`@media (prefers-reduced-motion)` vắng mặt**; transition 0.15s/0.2s không có cơ chế tắt. | WCAG 2.3.3 |

#### 1.2.2. JavaScript (`nav-collapse.js`, 98 dòng)

| # | Vấn đề | Chuẩn bị vi phạm |
|---|--------|------------------|
| J1 | `ensureStyle()` **inject CSS bằng JS** → vi phạm SRP (JS sinh style); khó debug cascade, khó purge. | SOLID (SRP), Clean Code |
| J2 | **Không cleanup trên PJAX**: `document$.subscribe(init)` chạy lại `init()`, chỉ guard button bằng `data-sidebar-toggle-bound`; sidebar element bị replace → listener cũ treo, listener mới không rebind. | KISS, robustness |
| J3 | Double entry point: `DOMContentLoaded` + `document$.subscribe(init)` → `init()` có thể chạy 2 lần trên first load. | DRY |
| J4 | **Trộn 3 trách nhiệm** trong `setSidebarCollapsed(collapsed, remember)`: mutate DOM class, cập nhật ARIA attribute, ghi localStorage. | SRP |
| J5 | Magic strings rải rác: `"sidebar-nav-collapsed"`, `"wiki.primary-sidebar-collapsed"`, `"data-sidebar-toggle"`, `"aria-expanded"`. | DRY |
| J6 | `try {} catch (_) {}` rỗng ở `writeSidebarPreference` — swallow lỗi âm thầm. | Clean Code |
| J7 | Không có `keydown` handler (Escape, Enter/Space cho label-as-button). | WCAG 2.1.1, 2.1.2 |
| J8 | `applyDefaultState()` query DOM phức tạp mỗi lần init (`sidebar.querySelectorAll(".md-nav__item--nested")`) — không quan sát thay đổi. | KISS |

#### 1.2.3. Python hook (`auto_encrypt.py`) — điểm tích hợp

| # | Vấn đề | Ghi chú |
|---|--------|---------|
| P1 | `open(...).read()` **không try/except**; page.file.abs_src_path không tồn tại → `MKdocs build --strict` fail toàn cục. | robustness |
| P2 | `content.startswith("---")` là heuristic; nếu file MD mở đầu bằng thematic break thì frontmatter bị bóp méo. | correctness |
| P3 | Nối chuỗi `f"---\npassword: '{WIKI_PASSWORD}'\n..."` — nếu password chứa `'` hoặc `\n` → YAML hỏng. | correctness |
| P4 | **Điểm tích hợp với nav-collapse.js**: hook không phụ thuộc — nhưng khi trang bị lock, `html.is-locked` do `unlock-tracker.js` set, độc lập với `html.sidebar-nav-collapsed`. Cần regression test: collapse sidebar → unlock trang → TOC xuất hiện đúng (không bị `display:none` kế thừa). | integration |

#### 1.2.4. Config (`mkdocs.yml`)

| # | Vấn đề | Chuẩn |
|---|--------|-------|
| Y1 | `accent: indigo` xung đột với `--astro-interactive` olive override trong CSS → Material render 2 lớp màu. | Nielsen #4 |
| Y2 | Search plugin không cấu hình `lang` → tokenize tiếng Việt kém (dấu, từ ghép). | Nielsen #6 |
| Y3 | `content.action.edit` + `content.action.view` bật nhưng CSS ẩn (A12) — dead config. | Nielsen #4 |
| Y4 | Thiếu `extra.homepage`; logo link dựa fallback `nav.homepage` → điều hướng SR không đoán được. | WCAG 2.4.4 |

---

## 2. ENGINEERING & CODING STANDARDS

### 2.1. CSS Standards

**S1. Token taxonomy bắt buộc** — mở rộng block `:root` hiện tại, giữ prefix `--astro-` cho color để surgical:

```css
:root {
  /* Font */
  --font-sans: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-serif: 'Newsreader', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;

  /* Space (base 4px) */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
  --space-4: 1rem;    --space-5: 1.5rem; --space-6: 2rem;

  /* Radius */
  --radius-sm: 3px; --radius-md: 4px; --radius-pill: 20px;

  /* Z-index */
  --z-skip: 100; --z-drawer: 50; --z-toast: 200;

  /* Motion */
  --motion-fast: 0.15s ease;
  --motion-base: 0.2s ease;

  /* Layout */
  --layout-breakpoint-wide: 76.25em;
  --layout-content-max: 44rem;
  --layout-sidebar-primary: 13.5rem;
  --layout-sidebar-secondary: 13rem;
}
```

**S2. Cấm `!important`** — quy tắc:
- `extra_css` được Material nạp **sau** stylesheet theme → chỉ cần specificity ngang là thắng.
- Khi cần override `!important` của Material: tăng specificity bằng `html body .md-xxx` hoặc `:where(html) body ...`. Không dùng `!important`.
- **Ngoại lệ duy nhất**: utility `.sr-only` (được phép `!important` để diagnostic lớp đè).

**S3. Fluid typography** — dùng `clamp()` cho `h1`, `.md-typeset p`, `.md-typeset h2` thay cho chuỗi media query.

**S4. Relative units** — bắt buộc `rem`/`em` cho typography và spacing; giữ `px` chỉ cho hairline (`1px border`).

**S5. Motion safety** — cuối file bắt buộc:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms;
    transition-duration: 0.01ms;
    scroll-behavior: auto;
  }
}
```

**S6. Focus system** — khối đầu file sau reset:

```css
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--astro-interactive);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

**S7. Utility class bắt buộc:**

```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
.skip-link { position: absolute; left: -9999px; top: 0; }
.skip-link:focus-visible {
  left: var(--space-4); top: var(--space-4); z-index: var(--z-skip);
  padding: var(--space-2) var(--space-4);
  background: var(--astro-surface);
  border: 2px solid var(--astro-interactive);
  border-radius: var(--radius-md);
  font-family: var(--font-sans); font-weight: 700;
}
```

### 2.2. JavaScript Standards

**S8. Naming & module shape** — file `nav-collapse.js` được viết lại thành **IIFE duy nhất** trả về namespace `WikiNav`, với 4 nhóm trách nhiệm tách biệt:

```text
CONSTANTS  → SELECTORS, CLASSES, STORAGE_KEY, SR_TEXT
state      → readUserPref, writeUserPref  (thuần, chỉ localStorage)
dom        → applySidebarState, applySectionAria, announce
handlers   → onClick, onKeydown  (delegate trên document)
lifecycle  → mount, unmount
```

**S9. Event Delegation** — gắn `click` và `keydown` **một lần** trên `document`. Không loop `addEventListener` trên từng nút.

**S10. Không inject CSS từ JS** — toàn bộ rule hiện có trong `ensureStyle()` chuyển vào `book-theme.css`. JS chỉ mutate class + ARIA.

**S11. Lifecycle Material** — vào `mount()`, ra `unmount()`:

```js
let unsubscribe = null;
function mount() {
  if (document.documentElement.dataset.navCollapseMounted === "true") return;
  document.documentElement.dataset.navCollapseMounted = "true";
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeydown, true);
  // apply persisted state
}
function unmount() { /* remove listeners, clear flag */ }
```

Đăng ký:

```js
if (window.document$) {
  window.document$.subscribe(() => { unmount(); mount(); });
} else {
  document.addEventListener("DOMContentLoaded", mount);
}
```

**S12. Bọc try/catch tại điểm nhạy cảm**: `localStorage.*`, `querySelector` lồng (không cần — đã null-check), `announce` (phòng trường hợp SR element bị remove bởi PJAX).

**S13. ES6+**: `const`/`let`, arrow function cho handler ngắn, destructuring tham số event, optional chaining `btn?.focus()`, template literal cho SR text.

**S14. Phím tắt & keyboard map:**

| Key | Ngữ cảnh | Hành vi |
|-----|---------|---------|
| `Escape` | focus đang trong `.md-sidebar--primary` và sidebar đang mở | collapse + `toggle.focus()` |
| `Enter` / `Space` | focus vào `label.md-nav__link` của `.md-nav__item--nested` | `preventDefault()` + `.click()` |
| `Enter` / `Space` | focus vào `<label for="__drawer">` / `<label for="__search">` | `.click()` (sau khi thêm `role="button" tabindex="0"`) |

### 2.3. Markup & Template Standards

**S15. 100% semantic HTML5** — Không dùng `<div>`/`<span>` cho interactive. Nút điều khiển dùng `<button type="button">` khi có thể; giữ `<label>` cho `__drawer`/`__search` (vì Material bind vào `for=`) nhưng bổ sung `role="button" tabindex="0" aria-controls aria-expanded`.

**S16. Không inline style & không inline handler** — toàn bộ style/event đi qua CSS class + JS listener.

**S17. ARIA đúng ngữ nghĩa:**
- SVG: `aria-hidden="true" focusable="false"`.
- Sidebar toggle: `aria-expanded` (bool), `aria-controls="primary-navigation"`, `aria-label` động.
- Live region: `<span id="sidebar-state-announcer" class="sr-only" role="status" aria-live="polite"></span>`.
- H1 duy nhất trên trang: đưa `.md-header__topic` chứa page title thành `<h1 class="md-header__topic">` (giữ CSS style để không phá layout).

---

## 3. FILE-BY-FILE REFACTORING MATRIX

### 3.1. `overrides/partials/header.html`

| File | Vấn đề UX / Code Smell | Giải pháp kiến trúc & Kỹ thuật chi tiết | Chuẩn | Priority |
|------|-----------------------|------------------------------------------|-------|----------|
| `header.html` | Không skip-link (A4) | Tạo `overrides/main.html` mới extends `base.html`; trong `{% block content %}` chèn `<a class="skip-link" href="#main-content">Bỏ qua điều hướng</a>` và đặt `id="main-content"` lên wrapper `.md-content__inner`. | WCAG 2.4.1 | **P0** |
| `header.html` | `<label for>` không nhận bàn phím (A5) | Thêm `role="button" tabindex="0" aria-controls="__drawer"` (drawer) và `aria-controls="__search"` (search) cho `<label>`. JS `onKeydown` xử lý Enter/Space. | WCAG 2.1.1, 4.1.2 | **P0** |
| `header.html` | SVG không aria-hidden (A6) | Thêm `aria-hidden="true" focusable="false"` cho mọi `{% include ".icons/..." %}` — drawer menu icon, sidebar toggle, palette, search. | WCAG 1.1.1 | **P0** |
| `header.html` | `aria-expanded="true"` hardcode (A7) | **_Xoá_** attribute trong template; giữ `aria-haspopup="true"`; JS là nguồn chân lý duy nhất set initial + update. | WCAG 4.1.2 | **P0** |
| `header.html` | Không có live region (A8) | Thêm ngay trước `</nav>`: `<span id="sidebar-state-announcer" class="sr-only" role="status" aria-live="polite"></span>`. | WCAG 4.1.3, Nielsen #1 | **P1** |
| `header.html` | Site/page title là `<div>` (A11) | Đổi `<div class="md-header__topic"><span class="md-ellipsis">{{ config.site_name }}</span></div>` → giữ nhưng cho topic thứ hai (page title) dùng `<h1 class="md-header__topic"><span class="md-ellipsis">...</span></h1>`. Reset `font-size`/`margin` bằng CSS `.md-header__topic { font: inherit; margin: 0; }`. | WCAG 1.3.1 | **P1** |
| `header.html` | Nút `.sidebar-toggle` có `hidden` mặc định | Giữ nguyên; CSS `.sidebar-toggle[hidden] { display: none; }` đã đủ — JS unhide khi tìm thấy sidebar. | KISS | — |

### 3.2. `docs/stylesheets/book-theme.css`

| File | Vấn đề UX / Code Smell | Giải pháp kiến trúc & Kỹ thuật chi tiết | Chuẩn | Priority |
|------|-----------------------|------------------------------------------|-------|----------|
| `book-theme.css` | Focus ring biến mất (A3) | Thêm block S6 (`:focus-visible`) ngay sau section 3 reset. **_Xoá_** dòng `.md-search__input { outline: none !important; }`. | WCAG 2.4.7 | **P0** |
| `book-theme.css` | Contrast light fail (A1) | Đổi `:root { --astro-interactive: #5c7526; }` — verify ≈ **5.13:1** trên `#fcfcf9`. Đổi tương ứng `--md-accent-fg-color` theo token. | WCAG 1.4.3 | **P1** |
| `book-theme.css` | Contrast dark brittle (A2) | Đổi `[data-md-color-scheme="slate"] { --astro-muted: #b8b8b8; }` (opaque, ≈ **7.9:1** trên `#242424`). | WCAG 1.4.3 | **P1** |
| `book-theme.css` | ~62 `!important` (C1) | Xoá **toàn bộ** `!important` khỏi file, trừ `.sr-only`. Thay bằng: (a) giữ nguyên selector specificity (đủ do `extra_css` load sau), (b) khi cần tăng specificity dùng `html body .md-xxx`, (c) xoá mọi rule block Material đã có default tương đương. | KISS / Clean Code | **P0** |
| `book-theme.css` | Thiếu token spacing/z/radius/motion/layout (C2, C5) | Bổ sung block token S1 vào `:root`. Thay toàn bộ magic number trong file: `20px 24px` → `var(--space-5) var(--space-6)`; `border-radius: 4px` → `var(--radius-md)`; `margin: 2em 0` → `margin: var(--space-6) 0`. | DRY | **P1** |
| `book-theme.css` | Trùng lặp width sidebar (C4, C6) | Gộp tất cả rule `.md-sidebar--primary` và `.md-sidebar--secondary` về một media query duy nhất tại breakpoint `(--layout-breakpoint-wide)`; xoá 3 khối trùng. | DRY | **P1** |
| `book-theme.css` | Selector lồng sâu (C3) | Rút gọn: `.md-sidebar--primary .md-nav--primary > .md-nav__title::after` → dùng class riêng `.md-nav__title--fake` (thêm trong `header.html`/`nav.html` override) HOẶC giữ nhưng bọc trong `:is()`; ưu tiên cách 1. | Clean Code | **P2** |
| `book-theme.css` | Không có reduced-motion (C7) | Thêm block S5 cuối file. | WCAG 2.3.3 | **P1** |
| `book-theme.css` | Ẩn `content.action.*` (A12) | **_Xoá_** rule `.md-content__button { display: none !important; }`. Style lại nhẹ: `.md-content__button { opacity: 0.55; } .md-content__button:hover, :focus-visible { opacity: 1; }`. | Nielsen #4 | **P2** |
| `book-theme.css` | Nav active chỉ đổi màu (C8) | `.md-nav--secondary .md-nav__link--active`: dùng `box-shadow: inset 2px 0 0 var(--astro-interactive)` thay `border-left + margin-left: -1px + padding-left: 13px` — triệt tiêu layout shift, giữ màu + đậm + vạch (3 dấu hiệu). | WCAG 1.4.1 | **P1** |
| `book-theme.css` | Rule `ensureStyle()` cần chuyển từ JS (J1) | Nhận 3 rule từ `nav-collapse.js`: block `@media (min-width: 76.25em)` cho `.md-nav__item--nested > .md-toggle:not(:checked) ~ .md-nav`, `label.md-nav__link` của nested item, và `.md-nav__icon` — chèn vào section 6 hiện có. | SOLID | **P0** |
| `book-theme.css` | `sidebar-toggle:not([hidden])` logic đảo (C5 cũ) | Thay: `.sidebar-toggle[hidden] { display: none; }` (ngoài media) và `@media (--layout-breakpoint-wide) { .sidebar-toggle:not([hidden]) { display: inline-flex; } }`. | KISS | **P1** |

### 3.3. `docs/javascripts/nav-collapse.js`

| File | Vấn đề UX / Code Smell | Giải pháp kiến trúc & Kỹ thuật chi tiết | Chuẩn | Priority |
|------|-----------------------|------------------------------------------|-------|----------|
| `nav-collapse.js` | `ensureStyle()` inject CSS (J1) | **_Xoá_** hàm. 3 rule chuyển vào `book-theme.css` (xem 3.2). | SOLID | **P0** |
| `nav-collapse.js` | Không có Escape (J7, A9) | Thêm `onKeydown(e)`: nếu `e.key === "Escape"` VÀ `document.activeElement.closest(".md-sidebar--primary")` VÀ không collapsed → `applySidebarState(true)` + `toggleBtn.focus()` + announce. | WCAG 2.1.2, 2.4.3 | **P0** |
| `nav-collapse.js` | Không hỗ trợ Enter/Space cho label nested (J7) | Trong `onKeydown`, nếu `e.key === "Enter" \|\| e.key === " "` VÀ `e.target.matches("label.md-nav__link")` → `e.preventDefault()`, `e.target.click()`. | WCAG 2.1.1 | **P0** |
| `nav-collapse.js` | Focus mất khi collapse (A9) | Trong `applySidebarState(collapsed)`: nếu `collapsed === true` VÀ `sidebar.contains(document.activeElement)` → sau khi mutate class, gọi `document.querySelector(SELECTORS.toggle)?.focus()`. | WCAG 2.4.3 | **P0** |
| `nav-collapse.js` | PJAX làm treo listener (J2, J3) | Bỏ `DOMContentLoaded`; chỉ dùng `document$.subscribe(() => { unmount(); mount(); })`. Trong `mount()`: guard `document.documentElement.dataset.navCollapseMounted`; trong `unmount()`: remove listener + xoá flag. | KISS | **P0** |
| `nav-collapse.js` | Trộn 3 trách nhiệm (J4) | Tách 4 nhóm S8: `state.readUserPref/writeUserPref`, `dom.applySidebarState/applySectionAria/announce`, `handlers.onClick/onKeydown`, `lifecycle.mount/unmount`. Class collapse truyền qua `applySidebarState`. | SRP | **P1** |
| `nav-collapse.js` | Magic strings (J5) | Chuẩn hoá `const CLASSES = { collapsed: "sidebar-nav-collapsed" }`, `const STORAGE_KEY = "wiki.primary-sidebar-collapsed"`, `const SELECTORS = { toggle: "[data-sidebar-toggle]", sidebar: ".md-sidebar--primary", announcer: "#sidebar-state-announcer", nested: ".md-nav__item--nested", nestedToggle: ":scope > .md-toggle", nestedLabel: ":scope > .md-nav__container > label.md-nav__link" }`, `const SR_TEXT = { collapsed: "Đã ẩn thanh bên", expanded: "Đã hiện thanh bên" }`. | DRY | **P1** |
| `nav-collapse.js` | Không sync ARIA của section toggle (A8) | Thêm `applySectionAria()` gọi sau mọi mutation: với mỗi `.md-nav__item--nested`, đọc `.md-toggle.checked` và set `aria-expanded` tương ứng trên `label.md-nav__link`. | WCAG 4.1.2 | **P1** |
| `nav-collapse.js` | `applyDefaultState()` override user (A10, J8) | Đổi hành vi: **chỉ mở section chứa link active**. Query `const active = sidebar.querySelector(".md-nav__link--active"); if (active) active.closest(".md-nav__item--nested")?.querySelector(SELECTORS.nestedToggle).checked = true;`. Bỏ auto-open section đầu tiên. | Nielsen #3 | **P1** |
| `nav-collapse.js` | `try/catch` rỗng (J6) | Bọc `state.readUserPref/writeUserPref` bằng `try/catch (err) { console.warn("[WikiNav] localStorage unavailable", err); }`. | Clean Code | **P2** |
| `nav-collapse.js` | Không announce SR (A8) | Thêm `announce(text)`: `const el = document.getElementById("sidebar-state-announcer"); if (!el) return; el.textContent = ""; requestAnimationFrame(() => { el.textContent = text; });`. | WCAG 4.1.3 | **P1** |

### 3.4. `hooks/auto_encrypt.py`

| File | Vấn đề UX / Code Smell | Giải pháp kiến trúc & Kỹ thuật chi tiết | Chuẩn | Priority |
|------|-----------------------|------------------------------------------|-------|----------|
| `auto_encrypt.py` | Không try/except (P1) | Bọc `open(...)` trong `try/except (OSError, UnicodeDecodeError)` → `return None` (fallback nội dung gốc) + log `warnings.warn`. | robustness | **P1** |
| `auto_encrypt.py` | Heuristic `startswith("---")` (P2) | Thay bằng regex `^---\r?\n.*?\r?\n---\r?\n` với `re.DOTALL` để xác nhận có block frontmatter hợp lệ; ngược lại tạo mới. | correctness | **P2** |
| `auto_encrypt.py` | Nối chuỗi có thể hỏng YAML (P3) | Dùng `yaml.safe_dump({"password": WIKI_PASSWORD}, allow_unicode=True).strip()` để build block password, giữ phần frontmatter cũ bằng regex, không nối tay. | correctness | **P1** |
| `auto_encrypt.py` | Không tương tác có kiểm soát với theme | Thêm comment block ở đầu hàm nêu rõ: side effect chỉ là bơm frontmatter; nav-collapse nhận diện trạng thái lock qua class `html.is-locked` do `unlock-tracker.js` set — **không phụ thuộc trực tiếp**. | Clean Code | **P2** |

### 3.5. `mkdocs.yml`

| File | Vấn đề UX / Code Smell | Giải pháp kiến trúc & Kỹ thuật chi tiết | Chuẩn | Priority |
|------|-----------------------|------------------------------------------|-------|----------|
| `mkdocs.yml` | `accent: indigo` xung đột (Y1) | Đổi `accent: indigo` → `accent: custom` (nếu Material support) hoặc `accent: lime` ở cả 2 scheme. Đồng bộ với `--astro-interactive: #5c7526`. | Nielsen #4 | **P2** |
| `mkdocs.yml` | Search không có lang (Y2) | Trong `plugins.search:` thêm: `lang: [vi, en]`, `separator: '[\s\-\.]+'`. | Nielsen #6 | **P2** |
| `mkdocs.yml` | Dead config `content.action.*` (Y3, A12) | Quyết định: giữ (vì đã có style lại ở 3.2). Giữ nguyên YAML, không cần sửa. | — | **P2** |
| `mkdocs.yml` | Thiếu `extra.homepage` (Y4) | Thêm block: `extra: { homepage: "/" }`. | WCAG 2.4.4 | **P1** |
| `mkdocs.yml` | `theme.font.text` không khớp font thực tế (Manrope ở CSS) | Giữ nguyên vì đây chỉ là fallback JS-injected; không cần thiết khi `book-theme.css` đã `@import` Google Fonts. Cân nhắc **xoá** để đơn giản hơn. | KISS | **P2** |

---

## 4. PHASED EXECUTION ROADMAP

### Phase 1 — Semantic Markup & Token System (P0 / P1)

**Mục tiêu:** Skip-link hoạt động, ARIA primitive đúng, token nền tảng có mặt.

1. Tạo `overrides/main.html` extends `base.html`; chèn skip-link + đặt `id="main-content"` (theo 3.1 matrix dòng 1). Verify: `mkdocs build --strict` pass.
2. Sửa `overrides/partials/header.html` cho cả 6 dòng P0/P1 của matrix 3.1:
   - `role="button" tabindex="0"` cho 2 `<label>`.
   - `aria-hidden="true" focusable="false"` cho mọi icon.
   - Bỏ `aria-expanded="true"` hardcode; giữ `aria-haspopup="true"`.
   - Thêm `#sidebar-state-announcer`.
   - Đổi `.md-header__topic` (page title) thành `<h1>`.
3. Trong `book-theme.css` thêm block S1 (design tokens) ngay sau `:root` — **chưa sửa gì khác**.

**Verify Phase 1:** `axe-core` trên trang chủ báo 0 lỗi *serious*/ *critical* liên quan `landmark`, `label`, `heading`, `button-name`.

### Phase 2 — CSS Architecture & Accessibility Polish (P0 / P1)

**Mục tiêu:** Contrast pass toàn bộ, focus visible, xoá trùng lặp và `!important`.

1. Đổi contrast: `--astro-interactive: #5c7526`; dark `--astro-muted: #b8b8b8`.
2. Thêm block S6 (`:focus-visible`) + S7 (`.sr-only`, `.skip-link`) + S5 (`prefers-reduced-motion`).
3. **Xoá dòng `.md-search__input { outline: none !important }`**.
4. Refactor selector `.sidebar-toggle` theo matrix 3.2 dòng 11.
5. Gộp rule width sidebar, xoá 3 khối trùng (matrix C4/C6).
6. Sửa `.md-nav__secondary .md-nav__link--active` dùng `box-shadow: inset`.
7. Style lại `.md-content__button` (bỏ `display: none`).
8. Chuyển 3 rule từ `ensureStyle()` (Chrome) vào file — **phối hợp với Phase 3**.
9. Chạy `grep -n '!important' book-theme.css` — kỳ vọng chỉ còn `.sr-only`.

**Verify Phase 2:**
- WebAIM contrast checker: `--astro-ink`, `--astro-muted`, `--astro-interactive` đều ≥ 4.5:1 trên cả 2 scheme.
- Tab traversal lần qua mọi interactive element đều hiện ring.
- DevTools Rendering → `prefers-reduced-motion: reduce`: transition collapse = 0ms.

### Phase 3 — JS Refactoring & State Handling (P0 / P1)

**Mục tiêu:** Tương tác bàn phím đầy đủ, kiến trúc SRP, lifecycle PJAX sạch.

1. Viết lại `nav-collapse.js` với cấu trúc `WikiNav = (() => { const SELECTORS, CLASSES, STORAGE_KEY, SR_TEXT; const state/don/handlers/lifecycle; return { mount, unmount }; })()`.
2. Implement đủ 8 event/handler theo matrix 3.3: `onClick`, `onKeydown` (Escape + Enter/Space), `applySidebarState`, `applySectionAria`, `announce`, `state.readUserPref/writeUserPref`, `mount/unmount` (S11).
3. Bỏ `ensureStyle`, bỏ double init.
4. Guard `document.documentElement.dataset.navCollapseMounted`.
5. Đăng ký: `window.document$ ? document$.subscribe(() => { unmount(); mount(); }) : DOMContentLoaded → mount`.

**Verify Phase 3:**
- Rebind không nhân đôi: điều hướng SPA 5 lần → `getEventListeners(document).click.length` không tăng.
- Keyboard-only: Tab → drawer → toggle → section nested (Enter mở) → Escape đóng sidebar + focus về toggle; NVDA/VoiceOver đọc đúng `Đã ẩn thanh bên`.
- Lock + unlock trang qua form password → sidebar collapse state không bị reset, TOC reappear đúng.

### Phase 4 — Verification & Regression Gate

**Gate (bắt buộc pass trước merge):**

| # | Kiểm thử | Ngưỡng |
|---|----------|--------|
| G1 | `mkdocs build --strict` | Status 0, không warning plugin |
| G2 | axe-core CLI trên 3 mẫu (home / chapter có admonition+code / chapter có mermaid) | 0 lỗi *serious* + 0 *critical* |
| G3 | Lighthouse Accessibility (desktop + mobile) | ≥ 95 (mục tiêu 98) |
| G4 | Contrast spot-check WebAIM: `--astro-ink`, `--astro-muted`, `--astro-interactive`, `--astro-accent-ink` (trên `--astro-accent`) | ≥ 4.5:1 |
| G5 | Keyboard-only traversal (Chrome + Firefox + Safari) | Skip-link nhảy, focus ring hiện, Escape hoạt động |
| G6 | Reduced-motion emulation | Không animate sidebar, không animate scroll |
| G7 | Zoom 200% + viewport 320px | Không overflow ngang, không cắt chữ |
| G8 | Integration `auto_encrypt.py`: build với `WIKI_PASSWORD` chứa ký tự `'` và `"` | Build pass, không lỗi YAML |
| G9 | Integration `unlock-tracker.js`: submit password → state `html.is-unlocked` + `html.sidebar-nav-collapsed` cùng tồn tại | TOC hiển thị, sidebar collapsed vẫn collapsed |

**Không hồi quy:**
- Không sửa `docs/**/*.md`, `unlock-tracker.js`, `mermaid-init.js`, `sync.sh`.
- Không đổi danh sách `mkdocs.yml features` trừ khi cần thiết cho Y3.
- Không thêm dependency mới (JS/CSS/Python).

---

## 5. TRADEOFFS & QUYẾT ĐỊNH ĐÃ CHỐT (CLAUDE.md §1)

| # | Tradeoff | Quyết định | Lý do |
|---|----------|------------|-------|
| T1 | Xoá hết `!important` vs giữ một số để chắc thắng Material | **Xoá hết** (trừ `.sr-only`) | `extra_css` load sau Material; 90% rule thắng bằng cascade thông thường. Nếu phát hiện rule nào thua, tăng specificity bằng `:is(html) body ...` — vẫn không cần `!important`. |
| T2 | Refactor `nav-collapse.js` thành module IIFE vs class ES6 | **IIFE trả về namespace** | Đồng bộ với `unlock-tracker.js` (IIFE) → tránh tạo 2 style JS trong cùng dự án. |
| T3 | Sửa Python hook vs để nguyên | **Sửa (P1/P2)** vì P3 (YAML injection) là bug thực có thể phá build CI khi password đổi. Không mở rộng scope ngoài matrix. | CLAUDE.md §3 — sửa orphan từ chính bug. |
| T4 | Sửa `/docs/**/*.md` để thêm landmark? | **Không** | Ngoài scope; nằm ngoài whitelist file được phép sửa. |
| T5 | `--astro-interactive` → `#5c7526` có làm mất vibe olive sáng của thiết kế? | **Chấp nhận** | WCAG 1.4.3 không thương lượng. Có thể bù bằng `--astro-accent` (giữ neon sáng) cho badge/decoration — vốn không cần contrast. |

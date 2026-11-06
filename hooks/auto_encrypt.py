import os
import re
import warnings

import yaml

# Mật khẩu đọc từ GitHub Secret khi build CI/CD, fallback về pass local khi test máy nhà
WIKI_PASSWORD = os.environ.get("WIKI_PASSWORD", "MatKhauLocalTamThoi2026!")

# Frontmatter hợp lệ: mở ---, nội dung, đóng ---
_FRONTMATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n", re.DOTALL)


def on_page_read_source(page, config):
    """
    Can thiệp TRƯỚC KHI MkDocs phân tích trang.
    Tự động bơm frontmatter chứa mật khẩu dạng chuỗi cho toàn bộ trang (trừ index.md).

    Side effect: chỉ bơm frontmatter. Trạng thái sidebar collapsed độc lập — do
    unlock-tracker.js set html.is-unlocked / html.is-locked; nav-collapse.js chỉ
    phản ứng với html.sidebar-nav-collapsed. Không phụ thuộc trực tiếp.
    """
    src_path = page.file.src_path.replace("\\", "/")
    
    if src_path == "index.md":
        return None

    # P1: fail-safe khi file không đọc được — không crash --strict
    try:
        with open(page.file.abs_src_path, "r", encoding="utf-8") as f:
            content = f.read()
    except (OSError, UnicodeDecodeError) as err:
        warnings.warn(f"[auto_encrypt] Cannot read {page.file.abs_src_path}: {err}")
        return None

    # P3: yaml.safe_dump xử lý an toàn mọi ký tự đặc biệt trong mật khẩu (', ", \n, :)
    block = yaml.safe_dump(
        {"password": WIKI_PASSWORD},
        allow_unicode=True,
        default_flow_style=False,
    ).strip()

    # P2: regex xác nhận có block frontmatter hợp lệ (không nhầm thematic break)
    m = _FRONTMATTER_RE.match(content)
    if m:
        # Đã có frontmatter — chèn password làm key đầu tiên
        return f"---\n{block}\n{m.group(1)}\n---\n{content[m.end():]}"
    # Chưa có frontmatter — tạo mới
    return f"---\n{block}\n---\n\n{content}"


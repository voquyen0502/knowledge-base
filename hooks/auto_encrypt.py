import os

# Mật khẩu đọc từ GitHub Secret khi build CI/CD, fallback về pass local khi test máy nhà
WIKI_PASSWORD = os.environ.get("WIKI_PASSWORD", "MatKhauLocalTamThoi2026!")

def on_page_read_source(page, config):
    """
    Can thiệp TRƯỚC KHI MkDocs phân tích trang.
    Tự động bơm frontmatter chứa mật khẩu dạng chuỗi cho toàn bộ trang (trừ index.md).
    """
    src_path = page.file.src_path.replace("\\", "/")
    
    # Bỏ qua trang chủ
    if src_path == "index.md":
        return None

    # Đọc nội dung file markdown gốc từ đĩa
    with open(page.file.abs_src_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Bơm password dạng String vào metadata
    if content.startswith("---"):
        # File đã có sẵn frontmatter: chèn password vào ngay sau dấu --- đầu tiên
        parts = content.split("---", 2)
        return f"---\npassword: '{WIKI_PASSWORD}'\n{parts[1]}---{parts[2]}"
    else:
        # File chưa có frontmatter: tạo mới khối frontmatter
        return f"---\npassword: '{WIKI_PASSWORD}'\n---\n\n{content}"
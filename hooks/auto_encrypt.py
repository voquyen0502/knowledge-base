def on_page_markdown(markdown: str, page, config, files) -> str:
    """
    Tự động gắn cờ mã hóa cho tất cả các bài viết trong thư mục docs/books/
    trước khi plugin encryptcontent thực thi.
    """
    src_path = page.file.src_path.replace("\\", "/")
    
    # Mã hóa toàn bộ sách trong thư mục books/
    if src_path.startswith("books/"):
        page.meta["password"] = True

    return markdown
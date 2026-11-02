import os
import shutil

# Đường dẫn nguồn từ máy của bạn (dùng raw string hoặc gạch chéo xuôi)
SRC_DIR = r"D:/01_Workspace/01_Projects/ai-agent-book"
BOOK_EN = os.path.join(SRC_DIR, "book-en")
DEST_DIR = "docs/books/ai-agents"

os.makedirs(DEST_DIR, exist_ok=True)

# 1. Map introduction.md thành index.md của cuốn sách
shutil.copy2(os.path.join(BOOK_EN, "introduction.md"), os.path.join(DEST_DIR, "index.md"))

# 2. Copy và chuẩn hóa tên 10 chương (chapter1 -> chapter-01)
for i in range(1, 11):
    src_file = os.path.join(BOOK_EN, f"chapter{i}.md")
    dest_file = os.path.join(DEST_DIR, f"chapter-{i:02d}.md")
    if os.path.exists(src_file):
        shutil.copy2(src_file, dest_file)

# 3. Copy file giải đáp bài tập (nếu có)
ref_file = os.path.join(BOOK_EN, "reference-answers.md")
if os.path.exists(ref_file):
    shutil.copy2(ref_file, os.path.join(DEST_DIR, "reference-answers.md"))

# 4. Copy thư mục hình ảnh figures
src_figures = os.path.join(BOOK_EN, "images")
dest_figures = os.path.join(DEST_DIR, "images")
if os.path.exists(src_figures):
    shutil.copytree(src_figures, dest_figures, dirs_exist_ok=True)
    print("✅ Đã copy toàn bộ figures/ sang wiki")
else:
    print("⚠️ Lưu ý: Chưa tìm thấy thư mục figures/ tại " + src_figures)

print("✅ Đã import thành công cuốn sách vào " + DEST_DIR)
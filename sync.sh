#!/usr/bin/env bash
set -e

# Tự động lấy timestamp hoặc nhận commit message từ tham số dòng lệnh
MSG="${1:-update wiki notes $(date '+%Y-%m-%d %H:%M')}"

git add docs/
git commit -m "$MSG"
git push origin main

echo "🚀 Đã đẩy thay đổi lên main. GitHub Actions đang tự động deploy..."
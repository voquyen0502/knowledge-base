// docs/javascripts/unlock-tracker.js
(function () {
  function checkUnlockStatus() {
    const decryptForm = document.getElementById("mkdocs-decrypt-form");
    const container = document.getElementById("mkdocs-decrypted-content");
    const sessionUnlocked = sessionStorage.getItem("wiki_decrypted") === "true";

    // Trường hợp 1: Trang đang bị khóa (Form nhập mật khẩu đang hiển thị)
    if (decryptForm) {
      document.documentElement.classList.add("is-locked");
      document.documentElement.classList.remove("is-unlocked");
      return;
    }

    // Trường hợp 2: Trang đã được mở khóa thành công (hoặc phiên đã xác thực)
    if ((container && !decryptForm) || sessionUnlocked) {
      sessionStorage.setItem("wiki_decrypted", "true");
      document.documentElement.classList.remove("is-locked");
      document.documentElement.classList.add("is-unlocked");
      return;
    }

    // Trường hợp 3: Trang công khai không cài mật khẩu (như trang chủ index.md)
    document.documentElement.classList.remove("is-locked");
  }

  document.addEventListener("DOMContentLoaded", checkUnlockStatus);

  if (typeof document$ !== "undefined") {
    document$.subscribe(checkUnlockStatus);
  }

  const observer = new MutationObserver(() => {
    checkUnlockStatus();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
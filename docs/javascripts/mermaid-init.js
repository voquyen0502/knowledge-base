document$.subscribe(() => {
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: false,
      theme: document.body.getAttribute("data-md-color-scheme") === "slate" ? "dark" : "default"
    });
    mermaid.run({
      nodes: document.querySelectorAll(".mermaid")
    });
  }
});
(function () {
  function isMermaidReady() {
    return typeof window.mermaid !== 'undefined';
  }

  function renderAll() {
    if (!isMermaidReady()) return;
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.getAttribute('data-md-color-scheme') === 'slate'
          ? 'dark'
          : 'default',
        securityLevel: 'loose',
        flowchart: { curve: 'basis', useMaxWidth: true },
      });
      window.mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
    } catch (e) {
      console.warn('[mermaid] render failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', renderAll);
  if (window.document$) window.document$.subscribe(renderAll);

  new MutationObserver(renderAll)
    .observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-md-color-scheme']
    });
})();
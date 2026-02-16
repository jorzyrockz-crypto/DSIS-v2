(function initLucideIcons(){
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
  const refresh = function(){
    window.lucide.createIcons();
  };
  window.refreshIcons = refresh;
  refresh();
  let rafId = 0;
  const observer = new MutationObserver(function(mutations){
    for (const mutation of mutations){
      if (!mutation || mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes){
        if (!node || node.nodeType !== 1) continue;
        const hasLucide = (typeof node.matches === 'function' && node.matches('[data-lucide]'))
          || (typeof node.querySelector === 'function' && !!node.querySelector('[data-lucide]'));
        if (!hasLucide) continue;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function(){
          rafId = 0;
          refresh();
        });
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

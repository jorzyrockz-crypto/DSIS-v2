function initializeModalScrollShadows(){
  document.querySelectorAll('.actions-modal').forEach((modal) => {
    const body = modal.querySelector('.modal-body');
    const foot = modal.querySelector('.modal-foot');
    if (!body || !foot) return;
    const syncShadow = () => {
      const isScrollable = body.scrollHeight > body.clientHeight + 1;
      const showShadow = isScrollable && body.scrollTop > 2;
      modal.classList.toggle('modal-body-scrolled', showShadow);
    };
    body.addEventListener('scroll', syncShadow, { passive: true });
    window.addEventListener('resize', syncShadow);
    requestAnimationFrame(syncShadow);
  });
}

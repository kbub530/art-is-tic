
// Tiny lightbox (no dependencies)
(function(){
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-cap');
  const closeBtn = document.getElementById('lightbox-close');

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-lightbox]');
    if (!a) return;
    e.preventDefault();
    img.src = a.getAttribute('href');
    const fc = a.parentElement.querySelector('figcaption');
    cap.textContent = fc ? fc.textContent : '';
    lb.hidden = false;
  });

  function closeLB(){ lb.hidden = true; img.src = ''; }
  closeBtn.addEventListener('click', closeLB);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeLB(); });
  lb.addEventListener('click', (e)=>{ if(e.target === lb) closeLB(); });
})();

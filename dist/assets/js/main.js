
(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-main-nav]');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  const search = document.querySelector('[data-search]');
  const status = document.querySelector('[data-status-filter]');
  const rows = Array.from(document.querySelectorAll('[data-navod-card]'));
  function applyFilters() {
    const query = (search && search.value || '').toLowerCase().trim();
    const selected = status && status.value || 'sve';
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const rowStatus = row.getAttribute('data-status') || '';
      const okQuery = !query || text.includes(query);
      const okStatus = selected === 'sve' || rowStatus === selected;
      row.style.display = okQuery && okStatus ? '' : 'none';
    });
  }
  if (search) search.addEventListener('input', applyFilters);
  if (status) status.addEventListener('change', applyFilters);

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button type="button" aria-label="Zatvori prikaz slike">Zatvori ×</button><img alt="">';
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector('img');
  const close = () => lightbox.classList.remove('open');
  lightbox.querySelector('button').addEventListener('click', close);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-lightbox]');
    if (!link) return;
    event.preventDefault();
    lightboxImg.src = link.getAttribute('href');
    lightboxImg.alt = link.querySelector('img')?.alt || 'Dokaz';
    lightbox.classList.add('open');
  });
})();

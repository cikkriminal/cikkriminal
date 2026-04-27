const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`Upozorenje: ne mogu pročitati ${file}: ${error.message}`);
    return fallback;
  }
}

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({ ...readJson(path.join(dir, file), {}), __file: file }))
    .filter(item => item.title || item.broj || item.slug)
    .sort((a, b) => {
      if (typeof a.broj === 'number' || typeof b.broj === 'number') return (a.broj || 0) - (b.broj || 0);
      return String(b.date || b.updated || '').localeCompare(String(a.date || a.updated || ''));
    });
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeFile(file, contents) { ensureDir(path.dirname(file)); fs.writeFileSync(file, contents, 'utf8'); }
function cleanDist() { fs.rmSync(DIST, { recursive: true, force: true }); ensureDir(DIST); }

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dest, entry));
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#096;'); }

function renderInline(text = '') {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  return out;
}

function renderMarkdown(markdown = '') {
  const input = String(markdown || '').replace(/\r\n/g, '\n').trim();
  if (!input) return '<p class="muted">Nema unesenog sadržaja.</p>';
  const blocks = input.split(/\n\s*\n/g);
  return blocks.map(block => {
    const lines = block.split('\n');
    const trimmed = block.trim();
    if (/^```/.test(trimmed)) {
      const code = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
    if (/^###\s+/.test(trimmed)) return `<h3>${renderInline(trimmed.replace(/^###\s+/, ''))}</h3>`;
    if (/^##\s+/.test(trimmed)) return `<h2>${renderInline(trimmed.replace(/^##\s+/, ''))}</h2>`;
    if (/^#\s+/.test(trimmed)) return `<h2>${renderInline(trimmed.replace(/^#\s+/, ''))}</h2>`;
    if (lines.every(line => /^[-*]\s+/.test(line.trim()))) {
      return `<ul>${lines.map(line => `<li>${renderInline(line.trim().replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    if (lines.every(line => /^>\s?/.test(line.trim()))) {
      return `<blockquote>${lines.map(line => renderInline(line.trim().replace(/^>\s?/, ''))).join('<br>')}</blockquote>`;
    }
    return `<p>${lines.map(line => renderInline(line)).join('<br>')}</p>`;
  }).join('\n');
}

function formatDate(value) {
  if (!value) return 'Nije uneseno';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}.`;
  return escapeHtml(value);
}

function statusLabel(value = '') {
  const map = {
    nacrt: 'Nacrt',
    objavljeno: 'Objavljeno',
    dopunjeno: 'Dopunjeno',
    ceka_odgovor: 'Čeka odgovor',
    sporno: 'Sporno',
    potrebna_redakcija: 'Potrebna redakcija',
    redigovano: 'Redigovano',
    zalba: 'Žalba',
    odgovor_organa: 'Odgovor organa',
    prilog: 'Prilog',
    dopis: 'Dopis',
    drugo: 'Drugo'
  };
  return map[value] || value || 'Bez statusa';
}

function badge(value) { return `<span class="badge ${escapeAttr(value)}">${escapeHtml(statusLabel(value))}</span>`; }

function navLinks(current) {
  const links = [
    ['/', 'Početna', 'home'],
    ['/o-predmetu/', 'O predmetu', 'predmet'],
    ['/navodi/', 'Žalbeni navodi', 'navodi'],
    ['/dokumenti/', 'Dokumenti', 'dokumenti'],
    ['/vremenska-linija/', 'Vremenska linija', 'timeline'],
    ['/metodologija/', 'Metodologija', 'metodologija'],
    ['/pravo-na-odgovor/', 'Pravo na odgovor', 'odgovor'],
    ['/kontakt/', 'Kontakt', 'kontakt']
  ];
  return links.map(([href, label, key]) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}

function layout({ site, title, description, current, body }) {
  const pageTitle = title ? `${title} | ${site.site_name}` : `${site.site_name} | ${site.site_subtitle}`;
  const robots = site.noindex ? '<meta name="robots" content="noindex,nofollow">' : '<meta name="robots" content="index,follow">';
  const canonicalUrl = current === 'home' ? (site.domain || '').replace(/\/$/, '') + '/' : '';
  return `<!doctype html>
<html lang="${escapeAttr(site.language || 'bs')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${robots}
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeAttr(description || site.site_subtitle || '')}">
  <meta property="og:title" content="${escapeAttr(pageTitle)}">
  <meta property="og:description" content="${escapeAttr(description || site.site_subtitle || '')}">
  <meta property="og:type" content="website">
  ${canonicalUrl ? `<meta property="og:url" content="${escapeAttr(canonicalUrl)}">` : ''}
  <link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <a class="skip-link" href="#main">Preskoči na sadržaj</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="Početna">
        <span class="brand-mark">CIK</span>
        <span class="brand-text"><strong>${escapeHtml(site.site_name || 'CIK Kriminal')}</strong><span>${escapeHtml(site.site_subtitle || '')}</span></span>
      </a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false">Meni</button>
      <nav class="main-nav" data-main-nav aria-label="Glavna navigacija">${navLinks(current)}</nav>
    </div>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <strong>${escapeHtml(site.site_name || '')}</strong><br>
        <span>${escapeHtml(site.legal_note || '')}</span>
      </div>
      <div class="footer-links">
        <a href="/pravo-na-odgovor/">Ispravke i pravo na odgovor</a>
        <a href="/kontakt/">Kontakt</a>
        <a href="/admin/">Admin</a>
      </div>
    </div>
  </footer>
  <script src="/assets/js/main.js"></script>
</body>
</html>`;
}

function pageHeader(title, lead, crumbs = []) {
  const bc = crumbs.length ? `<div class="breadcrumbs">${crumbs.map(c => c.href ? `<a href="${c.href}">${escapeHtml(c.label)}</a>` : escapeHtml(c.label)).join(' / ')}</div>` : '';
  return `<section class="page-title"><div class="container">${bc}<h1>${escapeHtml(title)}</h1>${lead ? `<p class="lead">${escapeHtml(lead)}</p>` : ''}</div></section>`;
}

function navodCard(navod) {
  const evidenceCount = Array.isArray(navod.dokazi) ? navod.dokazi.length : 0;
  return `<article class="card" data-navod-card data-status="${escapeAttr(navod.status || '')}">
    <div class="navod-meta"><span class="meta-pill">Navod ${String(navod.broj).padStart(2, '0')}</span>${badge(navod.status)}</div>
    <h3><a href="/navodi/${escapeAttr(navod.slug)}/">${escapeHtml(navod.title)}</a></h3>
    <p>${escapeHtml(navod.kratki_sazetak || '')}</p>
    <div class="card-footer"><span>${evidenceCount} dokaz(a)</span><a href="/navodi/${escapeAttr(navod.slug)}/">Otvori navod →</a></div>
  </article>`;
}

function renderIndex(site, navodi, documents) {
  const published = navodi.filter(n => n.status === 'objavljeno' || n.status === 'dopunjeno').length;
  const evidenceCount = navodi.reduce((acc, n) => acc + (Array.isArray(n.dokazi) ? n.dokazi.filter(d => d.slika || d.opis).length : 0), 0);
  const body = `
<section class="hero">
  <div class="container hero-grid">
    <div>
      <span class="eyebrow">Javni dosije predmeta</span>
      <h1>${escapeHtml(site.home?.hero_title || 'Analiza žalbenih navoda')}</h1>
      <p class="lead">${escapeHtml(site.home?.hero_lead || '')}</p>
      <div class="hero-actions">
        <a class="button primary" href="/navodi/">${escapeHtml(site.home?.cta_primary_label || 'Pregled navoda')}</a>
        <a class="button" href="/dokumenti/">${escapeHtml(site.home?.cta_secondary_label || 'Dokumenti')}</a>
      </div>
    </div>
    <aside class="panel case-panel" aria-label="Podaci o predmetu">
      <h2>Podaci o predmetu</h2>
      <dl>
        <dt>Organ</dt><dd>${escapeHtml(site.predmet?.organ || '')}</dd>
        <dt>Broj predmeta</dt><dd>${escapeHtml(site.predmet?.broj_predmeta || 'Nije uneseno')}</dd>
        <dt>Datum žalbe</dt><dd>${formatDate(site.predmet?.datum_zalbe)}</dd>
        <dt>Datum odgovora</dt><dd>${formatDate(site.predmet?.datum_odgovora)}</dd>
      </dl>
      <p class="notice"><strong>Napomena:</strong> ${escapeHtml(site.legal_note || '')}</p>
    </aside>
  </div>
</section>
<section class="section">
  <div class="container stats">
    <div class="stat"><strong>${navodi.length}</strong><span>žalbenih navoda</span></div>
    <div class="stat"><strong>${published}</strong><span>objavljeno/dopunjeno</span></div>
    <div class="stat"><strong>${documents.length}</strong><span>dokumenta u arhivi</span></div>
    <div class="stat"><strong>${evidenceCount}</strong><span>dokaznih stavki</span></div>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="section-header">
      <div><h2>Pregled navoda</h2><p>Svaki navod ima istu strukturu: žalba, odgovor organa, dokumentovana analiza, dokazi i zaključak.</p></div>
      <a class="button" href="/navodi/">Svi navodi</a>
    </div>
    <div class="cards">${navodi.slice(0, 6).map(navodCard).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="container panel case-panel">
    <h2>Metodologija</h2>
    <div class="prose">${renderMarkdown(site.predmet?.metodologija || '')}</div>
    <p><a href="/metodologija/">Pročitaj metodologiju i pravila redakcije podataka →</a></p>
  </div>
</section>`;
  return layout({ site, title: '', description: site.home?.hero_lead, current: 'home', body });
}

function renderAboutPage(site) {
  const predmet = site.predmet || {};
  const body = `${pageHeader('O predmetu', 'Kontekst predmeta i osnovni podaci, bez ulaska u svih 19 pojedinačnih navoda.', [{ href: '/', label: 'Početna' }, { label: 'O predmetu' }])}
<section class="section"><div class="container">
  <div class="panel case-panel">
    <h2>Sažetak predmeta</h2>
    <p class="lead">${escapeHtml(predmet.kratak_opis || '')}</p>
    <dl>
      <dt>Organ</dt><dd>${escapeHtml(predmet.organ || '')}</dd>
      <dt>Broj predmeta</dt><dd>${escapeHtml(predmet.broj_predmeta || 'Nije uneseno')}</dd>
      <dt>Datum žalbe</dt><dd>${formatDate(predmet.datum_zalbe)}</dd>
      <dt>Datum odgovora</dt><dd>${formatDate(predmet.datum_odgovora)}</dd>
    </dl>
  </div>
  <div class="cards" style="margin-top:16px;">
    <article class="card"><h3>Šta se objavljuje</h3><p>Za svaki žalbeni navod objavljuje se tekst navoda, odgovor organa, dokumentovana analiza i dokazi.</p></article>
    <article class="card"><h3>Šta se ne objavljuje</h3><p>Ne objavljuju se lični podaci koji nisu nužni za razumijevanje predmeta ili dokazivanje navoda.</p></article>
    <article class="card"><h3>Pravo na odgovor</h3><p>Organ i druga lica mogu dostaviti ispravku, demanti ili dodatnu dokumentaciju koja će biti razmotrena.</p></article>
  </div>
</div></section>`;
  return layout({ site, title: 'O predmetu', description: predmet.kratak_opis || 'Kontekst predmeta.', current: 'predmet', body });
}

function renderNavodiPage(site, navodi) {
  const statuses = [...new Set(navodi.map(n => n.status).filter(Boolean))];
  const body = `${pageHeader('Žalbeni navodi', 'Filtriraj navode po statusu ili pretraži naslov, sažetak i opis.', [{ href: '/', label: 'Početna' }, { label: 'Žalbeni navodi' }])}
<section class="section"><div class="container">
  <div class="filterbar">
    <input class="searchbox" type="search" data-search placeholder="Pretraži navode..." aria-label="Pretraži navode">
    <select class="status-select" data-status-filter aria-label="Filtriraj po statusu">
      <option value="sve">Svi statusi</option>
      ${statuses.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(statusLabel(s))}</option>`).join('')}
    </select>
  </div>
  <div class="navod-grid">
    ${navodi.map(n => `<article class="navod-row" data-navod-card data-status="${escapeAttr(n.status || '')}">
      <div class="navod-number">${String(n.broj).padStart(2, '0')}</div>
      <div>
        <div class="navod-meta">${badge(n.status)}<span class="meta-pill">Ažurirano: ${formatDate(n.updated)}</span><span class="meta-pill">Dokaza: ${Array.isArray(n.dokazi) ? n.dokazi.length : 0}</span></div>
        <h2><a href="/navodi/${escapeAttr(n.slug)}/">${escapeHtml(n.title)}</a></h2>
        <p>${escapeHtml(n.kratki_sazetak || '')}</p>
      </div>
      <div><a class="button" href="/navodi/${escapeAttr(n.slug)}/">Otvori →</a></div>
    </article>`).join('')}
  </div>
</div></section>`;
  return layout({ site, title: 'Žalbeni navodi', description: 'Pregled svih žalbenih navoda.', current: 'navodi', body });
}

function renderEvidence(d) {
  const img = d.slika ? `<a class="evidence-media" href="${escapeAttr(d.slika)}" data-lightbox><img src="${escapeAttr(d.slika)}" alt="${escapeAttr(d.naslov || 'Dokaz')}"></a>` : `<div class="no-image">Slika još nije dodata u CMS-u</div>`;
  return `<figure class="evidence">
    ${img}
    <figcaption class="evidence-body">
      <h3>${escapeHtml(d.naslov || 'Dokaz')}</h3>
      <div class="meta-list">
        ${d.vrsta ? `<span class="meta-pill">${escapeHtml(statusLabel(d.vrsta) || d.vrsta)}</span>` : ''}
        ${d.dokument ? `<span class="meta-pill">${escapeHtml(d.dokument)}</span>` : ''}
        ${d.strana ? `<span class="meta-pill">Strana ${escapeHtml(d.strana)}</span>` : ''}
      </div>
      <div class="prose">${renderMarkdown(d.opis || '')}</div>
    </figcaption>
  </figure>`;
}

function renderNavodDetail(site, navodi, navod, index) {
  const prev = navodi[index - 1];
  const next = navodi[index + 1];
  const body = `${pageHeader(`Navod ${String(navod.broj).padStart(2, '0')}: ${navod.title}`, navod.kratki_sazetak || '', [{ href: '/', label: 'Početna' }, { href: '/navodi/', label: '19 navoda' }, { label: `Navod ${String(navod.broj).padStart(2, '0')}` }])}
<section class="section"><div class="container">
  <div class="meta-list">${badge(navod.status)}<span class="meta-pill">Ažurirano: ${formatDate(navod.updated)}</span><span class="meta-pill">Dokaza: ${Array.isArray(navod.dokazi) ? navod.dokazi.length : 0}</span></div>
  <div class="triad">
    <article><h2>1. Šta sam napisao u žalbi</h2><div class="prose">${renderMarkdown(navod.zalba || '')}</div></article>
    <article><h2>2. Šta je odgovorio organ</h2><div class="prose">${renderMarkdown(navod.odgovor_organa || '')}</div></article>
    <article><h2>3. Šta dokumenti pokazuju</h2><div class="prose">${renderMarkdown(navod.istina || '')}</div></article>
  </div>
  <div class="conclusion"><h2>Zaključak za ovaj navod</h2><div class="prose">${renderMarkdown(navod.zakljucak || '')}</div></div>
</div></section>
<section class="section"><div class="container">
  <div class="section-header"><div><h2>Dokazi</h2><p>Svaka slika treba imati izvor, stranu dokumenta i kratko objašnjenje šta potkrepljuje.</p></div></div>
  ${(Array.isArray(navod.dokazi) && navod.dokazi.length) ? `<div class="evidence-grid">${navod.dokazi.map(renderEvidence).join('')}</div>` : '<div class="empty-state">Za ovaj navod još nisu uneseni dokazi.</div>'}
</div></section>
${(Array.isArray(navod.reference) && navod.reference.length) ? `<section class="section"><div class="container panel case-panel"><h2>Dodatne reference</h2><ul>${navod.reference.map(ref => `<li><a href="${escapeAttr(ref.url || '#')}" rel="noopener noreferrer" target="_blank">${escapeHtml(ref.label || ref.url || 'Referenca')}</a></li>`).join('')}</ul></div></section>` : ''}
<section class="section"><div class="container prev-next">
  ${prev ? `<a class="button" href="/navodi/${escapeAttr(prev.slug)}/">← Navod ${String(prev.broj).padStart(2, '0')}</a>` : '<span></span>'}
  ${next ? `<a class="button" href="/navodi/${escapeAttr(next.slug)}/">Navod ${String(next.broj).padStart(2, '0')} →</a>` : '<span></span>'}
</div></section>`;
  return layout({ site, title: `Navod ${String(navod.broj).padStart(2, '0')}: ${navod.title}`, description: navod.kratki_sazetak, current: 'navodi', body });
}

function renderDocumentsPage(site, docs) {
  const body = `${pageHeader('Dokumenti', 'Centralna arhiva žalbe, odgovora organa i priloga. Objavljuj samo redigovane dokumente.', [{ href: '/', label: 'Početna' }, { label: 'Dokumenti' }])}
<section class="section"><div class="container">
  <div class="notice"><strong>Prije objave:</strong> provjeri da su uklonjeni JMBG, adrese, privatni telefoni, e-mailovi, potpisi i podaci trećih lica koji nisu nužni za predmet.</div>
  <div class="doc-list" style="margin-top:16px;">
  ${docs.map(d => `<article class="card document-card">
    <div class="kind">${escapeHtml(statusLabel(d.kind) || d.kind || 'dokument')}</div>
    <h3>${escapeHtml(d.title)}</h3>
    <div class="meta-list">${d.date ? `<span class="meta-pill">${formatDate(d.date)}</span>` : ''}${d.pages ? `<span class="meta-pill">${escapeHtml(d.pages)} str.</span>` : ''}${badge(d.redaction_status)}</div>
    <p>${escapeHtml(d.summary || '')}</p>
    ${d.file ? `<a class="button primary" href="${escapeAttr(d.file)}">Otvori dokument</a>` : '<span class="button" aria-disabled="true">Fajl još nije dodat</span>'}
  </article>`).join('')}
  </div>
</div></section>`;
  return layout({ site, title: 'Dokumenti', description: 'Arhiva dokumenata predmeta.', current: 'dokumenti', body });
}

function renderTimelinePage(site, timeline) {
  const items = Array.isArray(timeline.items) ? timeline.items.slice().sort((a,b) => String(a.date).localeCompare(String(b.date))) : [];
  const body = `${pageHeader('Vremenska linija', 'Hronološki pregled radnji u predmetu.', [{ href: '/', label: 'Početna' }, { label: 'Vremenska linija' }])}
<section class="section"><div class="container timeline">
  ${items.map(item => `<article class="timeline-item"><div class="timeline-date">${formatDate(item.date)}</div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || '')}</p></article>`).join('')}
</div></section>`;
  return layout({ site, title: 'Vremenska linija', description: 'Hronologija predmeta.', current: 'timeline', body });
}

function renderMethodologyPage(site) {
  const body = `${pageHeader('Metodologija i redakcija podataka', 'Kako su navodi strukturisani i šta treba provjeriti prije objave.', [{ href: '/', label: 'Početna' }, { label: 'Metodologija' }])}
<section class="section"><div class="container">
  <div class="panel case-panel prose">${renderMarkdown(site.predmet?.metodologija || '')}</div>
  <div class="cards" style="margin-top:16px;">
    <article class="card"><h3>1. Razdvajanje tvrdnji</h3><p>Ne miješaj tekst žalbe, odgovor organa i svoje tumačenje. Čitalac treba odmah vidjeti šta je izvorni tekst, a šta analiza.</p></article>
    <article class="card"><h3>2. Dokaz uz svaku tvrdnju</h3><p>Svaki dokaz označi nazivom dokumenta, stranom i kratkim objašnjenjem. Slike bez objašnjenja imaju manju dokaznu vrijednost.</p></article>
    <article class="card"><h3>3. Redakcija ličnih podataka</h3><p>Prije objave ukloni podatke trećih lica koji nisu nužni: JMBG, adrese, telefone, privatne e-mailove, potpise i osjetljive podatke.</p></article>
  </div>
</div></section>`;
  return layout({ site, title: 'Metodologija', description: 'Metodologija objave i redakcije podataka.', current: 'metodologija', body });
}

function renderReplyPage(site) {
  const email = site.contact?.email || '';
  const body = `${pageHeader('Ispravke i pravo na odgovor', 'Ova stranica je namijenjena demantijima, ispravkama i dodatnoj dokumentaciji.', [{ href: '/', label: 'Početna' }, { label: 'Pravo na odgovor' }])}
<section class="section"><div class="container">
  <div class="panel case-panel prose">
    <h2>Kako poslati ispravku</h2>
    <p>Ako organ ili bilo koje lice smatra da je neki navod netačan, nepotpun ili izvučen iz konteksta, može dostaviti odgovor, ispravku ili dodatnu dokumentaciju.</p>
    <p>Relevantne ispravke mogu biti objavljene uz odgovarajući žalbeni navod, uz napomenu kada su zaprimljene i na šta se odnose.</p>
    <h2>Šta ispravka treba sadržavati</h2>
    <ul>
      <li>na koji se navod odnosi,</li>
      <li>koji je dio sporan,</li>
      <li>kratko obrazloženje,</li>
      <li>dokument ili drugi dokaz koji potkrepljuje ispravku.</li>
    </ul>
    <p>Kontakt: <a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a></p>
  </div>
</div></section>`;
  return layout({ site, title: 'Ispravke i pravo na odgovor', description: 'Uslovi za dostavu ispravki i odgovora.', current: 'odgovor', body });
}

function renderContactPage(site) {
  const email = site.contact?.email || '';
  const body = `${pageHeader('Kontakt', 'Kontakt za ispravke, pravo na odgovor i tehnička pitanja.', [{ href: '/', label: 'Početna' }, { label: 'Kontakt' }])}
<section class="section"><div class="container">
  <div class="panel case-panel prose">
    <h2>E-mail</h2>
    <p><a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a></p>
    <p>${escapeHtml(site.contact?.napomena || '')}</p>
    <h2>Napomena</h2>
    <p>Za svaku ispravku navedite na koji se navod odnosi i priložite dokument koji potkrepljuje vaše navode.</p>
  </div>
</div></section>`;
  return layout({ site, title: 'Kontakt', description: 'Kontakt stranica.', current: 'kontakt', body });
}

function renderUpdates(site, updates) {
  const published = updates.filter(u => u.status === 'objavljeno');
  const body = `${pageHeader('Ažuriranja', 'Kratke novosti i dopune dosijea.', [{ href: '/', label: 'Početna' }, { label: 'Ažuriranja' }])}
<section class="section"><div class="container cards">
  ${published.length ? published.map(u => `<article class="card"><div class="meta-list"><span class="meta-pill">${formatDate(u.date)}</span></div><h3>${escapeHtml(u.title)}</h3><p>${escapeHtml(u.summary || '')}</p><div class="prose">${renderMarkdown(u.body || '')}</div></article>`).join('') : '<div class="empty-state">Još nema objavljenih ažuriranja.</div>'}
</div></section>`;
  return layout({ site, title: 'Ažuriranja', description: 'Novosti i dopune.', current: 'updates', body });
}

function sitemap(site, navodi) {
  const base = (site.domain || 'https://cikkriminal.com').replace(/\/$/, '');
  const urls = ['/', '/o-predmetu/', '/navodi/', '/dokumenti/', '/vremenska-linija/', '/metodologija/', '/pravo-na-odgovor/', '/kontakt/', ...navodi.map(n => `/navodi/${n.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>`;
}

function build() {
  const site = readJson(path.join(ROOT, 'content/site.json'));
  const navodi = readJsonDir(path.join(ROOT, 'content/navodi'));
  const docs = readJsonDir(path.join(ROOT, 'content/dokumenti')).sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  const updates = readJsonDir(path.join(ROOT, 'content/azuriranja')).sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  const timeline = readJson(path.join(ROOT, 'content/vremenska-linija.json'), { items: [] });

  cleanDist();
  copyRecursive(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  copyRecursive(path.join(ROOT, 'admin'), path.join(DIST, 'admin'));

  writeFile(path.join(DIST, 'index.html'), renderIndex(site, navodi, docs));
  writeFile(path.join(DIST, 'o-predmetu/index.html'), renderAboutPage(site));
  writeFile(path.join(DIST, 'navodi/index.html'), renderNavodiPage(site, navodi));
  navodi.forEach((navod, index) => writeFile(path.join(DIST, 'navodi', navod.slug, 'index.html'), renderNavodDetail(site, navodi, navod, index)));
  writeFile(path.join(DIST, 'dokumenti/index.html'), renderDocumentsPage(site, docs));
  writeFile(path.join(DIST, 'vremenska-linija/index.html'), renderTimelinePage(site, timeline));
  writeFile(path.join(DIST, 'metodologija/index.html'), renderMethodologyPage(site));
  writeFile(path.join(DIST, 'pravo-na-odgovor/index.html'), renderReplyPage(site));
  writeFile(path.join(DIST, 'kontakt/index.html'), renderContactPage(site));
  writeFile(path.join(DIST, 'azuriranja/index.html'), renderUpdates(site, updates));
  writeFile(path.join(DIST, 'robots.txt'), site.noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\nSitemap: ' + (site.domain || 'https://cikkriminal.com').replace(/\/$/, '') + '/sitemap.xml\n');
  writeFile(path.join(DIST, 'sitemap.xml'), sitemap(site, navodi));
  console.log(`Build završen: ${DIST}`);
}

build();

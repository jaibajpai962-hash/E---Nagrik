(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Mobile menu
  const toggle = $('#menu-toggle'), nav = $('#nav');
  if (toggle && nav) {
    const setMenu = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '✕' : '☰';
    };
    toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== toggle) setMenu(false);
    });
  }

  // Toasts auto-dismiss (with a short exit animation)
  $$('.toast').forEach((t) => setTimeout(() => t.classList.add('out'), 3280));
  $$('.toast').forEach((t) => setTimeout(() => t.remove(), 3520));

  // Generic dialog open/close
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.open).showModal()));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
  const auto = $('dialog[data-autoopen]'); if (auto) auto.showModal();

  // Photo preview (report form)
  const photo = $('#photo'), prev = $('#photo-preview'), photoName = $('#photo-file-name');
  if (photo && prev) photo.addEventListener('change', () => {
    const f = photo.files[0];
    if (!f) {
      prev.hidden = true;
      if (photoName) photoName.textContent = 'No file selected';
      return;
    }
    prev.src = URL.createObjectURL(f);
    prev.hidden = false;
    if (photoName) photoName.textContent = f.name;
  });

  const aiFile = $('#ai-file'), aiName = $('#ai-file-name');
  if (aiFile && aiName) aiFile.addEventListener('change', () => {
    aiName.textContent = aiFile.files && aiFile.files[0] ? aiFile.files[0].name : 'No file selected';
  });

  // Live location fetch (report form)
  const detect = $('#detect-location'), locInput = $('#location'), locStatus = $('#loc-status');
  if (detect && locInput) {
    const setStatus = (msg) => { if (!locStatus) return; locStatus.hidden = !msg; locStatus.textContent = msg || ''; };
    // street + locality + city + state, aur end me exact lat/lng (DB column 150 chars tak)
    const MAX = 150;
    const uniq = (arr) => arr.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    const buildAddress = (a, coords) => {
      const road = a.road || a.pedestrian || a.footway || a.path;
      const street = a.house_number && road ? `${a.house_number}, ${road}` : road || a.house_number;
      const parts = uniq([
        street,
        a.neighbourhood || a.quarter || a.suburb || a.locality,
        a.hamlet || a.village || a.town || a.city_district || a.borough || a.county || a.city,
        a.postcode,
        a.state
      ]);
      const tail = ` (${coords})`;
      let out = '';
      for (const p of parts) {
        const next = out ? `${out}, ${p}` : p;
        if ((next + tail).length > MAX) break;
        out = next;
      }
      return out ? out + tail : coords;
    };

    detect.addEventListener('click', () => {
      if (!navigator.geolocation) { setStatus('❌ Is browser me location support nahi hai — location manually type karein.'); return; }
      detect.disabled = true; setStatus('Fetching your current location…');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=19&addressdetails=1&accept-language=en`);
          const d = await r.json();
          locInput.value = buildAddress(d.address || {}, coords);
        } catch (e) { locInput.value = coords; }
        setStatus(`📍 Exact coordinates: ${coords} · accuracy ~${Math.round(accuracy)} m${locInput.value === coords ? ' · street address nahi mili, coordinates use kiye' : ''}`);
        detect.disabled = false;
      }, (err) => {
        detect.disabled = false;
        setStatus(err.code === 1
          ? '❌ Location permission denied — browser me location allow karein ya manually type karein.'
          : '❌ Location nahi mil paayi, dobara try karein ya manually type karein.');
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  }

  // Admin manage dialog
  const md = $('#manage-dialog');
  if (md) {
    const fill = (d) => {
      $('#m-title').textContent = 'Manage ' + d.code;
      $('#m-ctitle').textContent = d.title; $('#m-desc').textContent = d.desc;
      ['citizen', 'category', 'location', 'priority'].forEach((k) => ($('#m-' + k).textContent = d[k]));
      $('#m-status').value = d.status; $('#m-remark').value = d.remark;
      $('#m-form').action = d.action;
      const img = $('#m-photo'); img.hidden = !d.photo; if (d.photo) img.src = d.photo;
      $('#m-noimg').hidden = !!d.photo;
      md.showModal();
    };
    $$('.manage').forEach((b) => b.addEventListener('click', () => fill(b.dataset)));
    if (window.OPEN_CODE) { const b = $$('.manage').find((x) => x.dataset.code === window.OPEN_CODE); if (b) fill(b.dataset); }
  }

  // Quiz: fetch a fresh Gemini-generated set immediately when the button is clicked
  const qd = $('#quiz-dialog'), qb = $('#quiz-body'), qo = $('#quiz-open');
  if (qd && qo) {
    let i, answers, sel, changed, pool, src, fetching = false;
    const esc = (s) => s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fallback = () => ({ list: window.QUIZ || [], source: 'standard' });
    const badge = () => src === 'gemini'
      ? '<span class="pill">✦ AI generated</span>'
      : '<span class="pill">Standard questions</span>';

    const render = () => {
      const q = pool[i];
      qb.innerHTML = `<p class="muted small">Question ${i + 1} of ${pool.length} ${badge()}</p>` +
        `<p class="strong">${esc(q.q)}</p>` +
        q.options.map((o, k) => `<button type="button" class="opt" role="radio" aria-checked="false" data-k="${k}">${esc(o)}</button>`).join('') +
        `<div class="actions"><button type="button" class="btn btn-primary block" id="q-next" disabled>${i === pool.length - 1 ? 'Finish' : 'Next'}</button></div>`;
      $$('.opt', qb).forEach((b) => b.addEventListener('click', () => {
        sel = +b.dataset.k;
        $$('.opt', qb).forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-checked', String(x === b)); });
        $('#q-next').disabled = false;
      }));
      $('#q-next').addEventListener('click', next);
    };

    const next = async () => {
      answers.push(sel); sel = null;
      if (i < pool.length - 1) { i++; return render(); }
      const res = await fetch('/citizen/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': document.body.dataset.csrf }, body: JSON.stringify({ answers }) });
      const r = await res.json();
      changed = r.awarded;
      const msg = r.awarded ? `You earned +${r.earned} Green Point${r.earned === 1 ? '' : 's'}.` : r.already ? 'Quiz points were already claimed earlier.' : 'No correct answers yet. Review the tips and try again.';
      qb.innerHTML = `<div class="center"><p class="big">${r.score} / ${r.total}</p><p>${msg}</p><p class="strong">Points earned: ${r.earned}</p><button type="button" class="btn btn-primary" id="q-close">Close</button></div>`;
      $('#q-close').addEventListener('click', () => qd.close());
    };

    const start = () => { i = 0; answers = []; sel = null; changed = false; render(); };
    const loading = '<div class="skel-block"><span class="skel lg"></span><span class="skel"></span>' +
      '<span class="skel md"></span><span class="skel sm"></span></div>' +
      '<p class="muted small center">Generating... Please Wait....</p>';

    const fetchQuiz = async () => {
      qb.innerHTML = loading;
      try {
        const r = await fetch('/citizen/quiz/questions?fresh=1&t=' + Date.now(), { headers: { 'X-CSRF': document.body.dataset.csrf } });
        if (!r.ok) throw new Error('questions unavailable');
        const d = await r.json();
        const qs = d.questions;
        if (Array.isArray(qs) && qs.length && qs.every((q) => q && Array.isArray(q.options) && q.options.length === 4)) {
          pool = qs; src = d.source || 'standard';
          return;
        }
        throw new Error('malformed questions');
      } catch (e) {
        pool = null;
        src = 'standard';
      }
      if (!Array.isArray(pool) || !pool.length) {
        pool = null;
        qb.innerHTML = '<div class="center"><p class="strong">Questions unavailable right now.</p>' +
          '<p class="muted small">Please try again in a moment.</p>' +
          '<div class="actions"><button type="button" class="btn btn-primary" id="q-retry">Try again</button></div></div>';
        $('#q-retry').addEventListener('click', () => { fetchQuiz().then(() => { if (qd.open) start(); }); });
      }
    };

    qo.addEventListener('click', async () => {
      if (fetching) return;
      qd.showModal();
      fetching = true;
      try {
        await fetchQuiz();
      } finally {
        fetching = false;
      }
      if (qd.open && pool) start();
    });
    qd.addEventListener('close', () => { if (changed) location.reload(); });
  }

  // ---- premium motion: entrance + scroll reveal (content stays visible without JS) ----
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = ['.page', '.admin-main', '.auth-card']
    .map((s) => document.querySelector(s)).filter(Boolean);
  const targets = [];
  groups.forEach((root) => {
    Array.from(root.children).forEach((el, i) => {
      if (el.tagName === 'DIALOG' || el.classList.contains('bg-layer')) return;
      el.classList.add('rv');
      el.style.setProperty('--rd', Math.min(i * 0.07, 0.35).toFixed(2) + 's');
      targets.push(el);
    });
  });

  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseInt(el.textContent, 10);
    if (!isFinite(target) || target <= 0 || reduceMotion) return;
    const start = performance.now(), dur = 700;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = String(target);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };

  const showNow = (el) => {
    el.classList.add('in');
    el.querySelectorAll('.summary .num').forEach(countUp);
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(showNow);
  } else {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showNow(entry.target);
          io.unobserve(entry.target);   // animate once, then stop observing
        });
      }, { rootMargin: '0px 0px -50px 0px', threshold: 0 });
      targets.forEach((t) => io.observe(t));
    } catch (err) {
      targets.forEach(showNow);        // fail-safe: never leave content hidden
    }
  }

  // ---- prevent duplicate form submissions (spinner state) ----
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || e.defaultPrevented || form.tagName !== 'FORM') return;
    const btn = form.querySelector('button.btn:not([type="button"])');
    if (!btn || btn.classList.contains('loading')) return;
    btn.classList.add('loading');
    btn.setAttribute('aria-busy', 'true');
    setTimeout(() => { btn.classList.remove('loading'); btn.removeAttribute('aria-busy'); }, 8000);
  });
})();

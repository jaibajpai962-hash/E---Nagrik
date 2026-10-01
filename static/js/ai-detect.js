// AI Waste Detector (Report Issue page) — talks to POST /api/ai/waste-detect
(function () {
  const file = document.getElementById('ai-file');
  const analyze = document.getElementById('ai-analyze');
  const preview = document.getElementById('ai-preview');
  const status = document.getElementById('ai-status');
  const errorBox = document.getElementById('ai-error');
  const errorText = document.getElementById('ai-error-text');
  const result = document.getElementById('ai-result');
  const another = document.getElementById('ai-another');
  const report = document.getElementById('ai-report');
  const skel = document.getElementById('ai-skeleton');
  const retry = document.getElementById('ai-retry');
  if (!file || !analyze) return;

  const MAX = 3 * 1024 * 1024; // server upload limit
  const SOFT = 2.5 * 1024 * 1024; // above this we resize/recompress before upload
  const ALLOWED_EXT = /\.(png|jpe?g|gif|webp)$/i;
  let selected = null, last = null;

  // some files (screenshots, WhatsApp forwards) carry no MIME type -> fall back to extension
  const isImageFile = (f) => !!(f && ((f.type && f.type.indexOf('image/') === 0) || ALLOWED_EXT.test(f.name || '')));
  const ensureExt = (name) => (ALLOWED_EXT.test(name || '') ? name : 'waste-image.jpg');

  const showError = (msg) => {
    errorText.textContent = msg; errorBox.hidden = false; result.hidden = true;
    if (retry) retry.hidden = false;
  };
  const clearState = () => {
    errorBox.hidden = true; result.hidden = true;
    if (retry) retry.hidden = true;
    if (skel) skel.hidden = true;
  };

  function pick(input) {
    const f = input.files && input.files[0];
    clearState();
    result.hidden = true;
    if (!f) { selected = null; analyze.disabled = true; preview.hidden = true; return; }
    if (!isImageFile(f)) {
      selected = null; analyze.disabled = true; preview.hidden = true; input.value = '';
      showError('Please choose an image file (PNG, JPG, GIF or WEBP).');
      return;
    }
    // NOTE: big photos are NOT rejected here — they are resized + compressed before upload
    selected = f;
    preview.src = URL.createObjectURL(f);
    preview.hidden = false;
    analyze.disabled = false;
  }

  file.addEventListener('change', () => pick(file));

  // Downscale/recompress large photos so any phone image fits the 3 MB upload limit.
  async function prepareUpload(file) {
    if (file.size <= SOFT) return { blob: file, name: ensureExt(file.name) };
    let source;
    try {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      source = await new Promise((res, rej) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
        img.src = url;
      });
    }
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    if (!sw || !sh) throw new Error('unreadable image');
    const scale = Math.min(1, 1600 / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(source, 0, 0, w, h);
    if (source.close) source.close();
    for (const q of [0.85, 0.7, 0.55]) {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
      if (blob && blob.size <= SOFT) return { blob, name: 'waste-' + Date.now() + '.jpg' };
    }
    throw new Error('could not compress image');
  }

  async function runAnalysis() {
    if (!selected) return;
    clearState();
    result.hidden = true;
    analyze.disabled = true;
    analyze.classList.add('loading');
    analyze.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = 'Analyzing waste image...';
    if (skel) skel.hidden = false;
    let stage = 'prepare';
    try {
      const upload = await prepareUpload(selected);
      stage = 'request';
      const fd = new FormData();
      fd.append('image', upload.blob, upload.name);
      const res = await fetch('/api/ai/waste-detect', {
        method: 'POST',
        headers: { 'X-CSRF': document.body.dataset.csrf || '' },
        body: fd
      });
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && data.success) render(data);
      else showError((data && data.error) || 'Unable to analyze the uploaded image.');
    } catch (e) {
      showError(stage === 'prepare'
        ? 'Could not read this image. Please try another photo (PNG, JPG or WEBP).'
        : 'Could not reach the server. Check your connection and try again.');
    } finally {
      status.hidden = true;
      if (skel) skel.hidden = true;
      analyze.classList.remove('loading');
      analyze.removeAttribute('aria-busy');
      analyze.disabled = !selected;
    }
  }

  analyze.addEventListener('click', runAnalysis);
  if (retry) retry.addEventListener('click', runAnalysis);

  function render(d) {
    last = d;
    document.getElementById('ai-item').textContent = d.detected_item || 'Unknown';
    document.getElementById('ai-category').textContent = d.category || 'Mixed / Uncertain';
    document.getElementById('ai-confidence').textContent = (typeof d.confidence === 'number' ? d.confidence : '—') + '%';
    document.getElementById('ai-disposal').textContent = d.disposal_guidance || '';
    document.getElementById('ai-warning').textContent = d.low_confidence
      ? (d.low_confidence_note || 'AI confidence is low. Please verify the waste type manually.')
      : 'AI estimate only — please verify the waste type before disposal.';
    document.getElementById('ai-warning').hidden = false;
    errorBox.hidden = true;
    result.hidden = false;
  }

  function attachAIPhotoToReport() {
    const photoInput = document.getElementById('photo');
    const photoName = document.getElementById('photo-file-name');
    const preview = document.getElementById('photo-preview');
    if (!photoInput || !selected) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(selected);
      photoInput.files = dt.files;
      if (photoName) photoName.textContent = selected.name;
      if (preview) {
        preview.src = URL.createObjectURL(selected);
        preview.hidden = false;
      }
    } catch (e) {
      // Some browsers may not support DataTransfer; in that case the uploaded file remains selected by the user.
    }
  }

  another.addEventListener('click', () => {
    file.value = '';
    selected = null; last = null;
    preview.src = ''; preview.hidden = true;
    analyze.disabled = true;
    status.hidden = true;
    errorBox.hidden = true;
    result.hidden = true;
    if (skel) skel.hidden = true;
    if (retry) retry.hidden = true;
    file.click();
  });

  // Optional integration with the existing complaint/reporting form below.
  report.addEventListener('click', () => {
    if (!last) return;
    const form = document.getElementById('report-form');
    if (!form) return;
    const cat = form.querySelector('[name=category]');
    const title = form.querySelector('[name=title]');
    const desc = form.querySelector('[name=description]');
    if (cat && last.suggested_category) {
      for (const o of cat.options) if (o.value === last.suggested_category || o.text === last.suggested_category) { cat.value = o.value; break; }
    }
    const generatedTitle = (last.title || 'AI detected: ' + (last.detected_item || 'Waste item') + ' (' + (last.category || '') + ')').slice(0, 150);
    const generatedDescription = (last.description || [
      'Reported with the AI Waste Detector.',
      'Detected item: ' + (last.detected_item || 'Unknown'),
      'Category: ' + (last.category || 'Mixed / Uncertain'),
      'AI confidence: ' + (typeof last.confidence === 'number' ? last.confidence + '%' : 'n/a'),
      'Recommended action: ' + (last.disposal_guidance || ''),
      last.low_confidence ? 'Note: AI confidence is low, please verify the waste type manually.' : '',
      'AI estimate only — please confirm details before submitting.'
    ].filter(Boolean).join('\n')).slice(0, 500);
    if (title) title.value = generatedTitle;
    if (desc) desc.value = generatedDescription;
    attachAIPhotoToReport();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (title) title.focus({ preventScroll: true });
  });
})();

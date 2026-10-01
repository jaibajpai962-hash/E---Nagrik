// Auth pages: password visibility toggle + live password strength meter
(function () {
  document.querySelectorAll('[data-pw-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.pwToggle);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      input.focus();
    });
  });

  const pw = document.getElementById('reg-password');
  const meter = document.getElementById('pw-meter');
  const label = document.getElementById('pw-strength');
  const confirm = document.getElementById('reg-password2');
  if (!pw || !meter) return;

  const LABELS = ['—', 'Weak', 'Fair', 'Good', 'Strong'];
  const rules = {
    len: (v) => v.length >= 8,
    alpha: (v) => /[A-Za-z]/.test(v),
    num: (v) => /\d/.test(v)
  };

  const evaluate = () => {
    const v = pw.value;
    let score = 0;
    Object.keys(rules).forEach((k) => {
      const li = meter.querySelector('[data-rule="' + k + '"]');
      const ok = rules[k](v);
      if (li) li.classList.toggle('ok', ok);
      if (ok) score++;
    });
    if (v.length >= 12 && score === 3 && /[^A-Za-z0-9]/.test(v)) score = 4;
    meter.dataset.score = String(v ? score : 0);
    label.textContent = v ? LABELS[v ? score : 0] : '—';

    if (confirm && confirm.value) confirm.setCustomValidity(match(v, confirm.value) ? '' : 'Passwords do not match.');
  };

  const match = (a, b) => a === b && a.length > 0;

  pw.addEventListener('input', evaluate);
  if (confirm) {
    confirm.addEventListener('input', () => {
      confirm.setCustomValidity(match(pw.value, confirm.value) ? '' : 'Passwords do not match.');
    });
  }
  evaluate();
})();

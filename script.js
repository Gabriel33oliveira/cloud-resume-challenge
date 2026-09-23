// ---------- Edit mode: only on your own machine, never on the live site ----------
// Open http://localhost:8791/?edit to edit text in place. edit.js is not deployed.
const EDIT_MODE = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('edit');
if (EDIT_MODE) {
  document.documentElement.classList.add('is-editing');
  const editor = document.createElement('script');
  editor.type = 'module';
  editor.src = 'edit.js';
  document.head.appendChild(editor);
}

// ---------- Visitor counter (API Gateway + Lambda + DynamoDB) ----------
(function loadVisitorCount() {
  const el = document.getElementById('visitor-count');
  if (!el) return;

  fetch('https://bh0byblyki.execute-api.us-east-1.amazonaws.com/count')
    .then((res) => res.json())
    .then((data) => {
      el.textContent = 'Visitor #' + data.count.toLocaleString('en-US') + ' · ';
    })
    .catch(() => {
      // Fail silently: the footer just reads without the counter if the API is unreachable.
    });
})();

// ---------- Skills: show how many tags each card holds ----------
(function countSkills() {
  if (EDIT_MODE) return; // keep the markup exactly as written while editing
  document.querySelectorAll('.skills-group').forEach((group) => {
    const label = group.querySelector('.skills-group-label');
    const n = group.querySelectorAll('.skills-tags span').length;
    if (!label || !n) return;
    const count = document.createElement('span');
    count.className = 'skills-count';
    count.setAttribute('aria-hidden', 'true');
    count.textContent = String(n).padStart(2, '0');
    label.appendChild(count);
  });
})();

// ---------- Hero title: wrap each word so it can enter on its own beat ----------
(function splitHeroTitle() {
  const title = document.querySelector('.hero-title');
  if (!title || EDIT_MODE || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  const wrap = (node) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.style.setProperty('--i', i++);
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
  };
  Array.from(title.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'w';
          span.style.setProperty('--i', i++);
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      title.replaceChild(frag, node);
    } else {
      wrap(node);
    }
  });
})();

// ---------- Scroll reveal: a few chosen blocks, once, never on scroll-up ----------
// The .reveal class is added here, so without JavaScript everything is simply visible.
if (!EDIT_MODE) {
  const revealEls = document.querySelectorAll(
    '.section-heading, .section-title, .metrics, .timeline-entry, .edu-card, .project-card, .skills-group, .cert-list, .contact-section > *'
  );

  const revealObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting);
    visible.forEach((entry, i) => {
      const el = entry.target;
      const delay = i * 60;
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('in-view');
      revealObserver.unobserve(el);
      // Once it has arrived, hand the element back to its own hover transitions.
      setTimeout(() => {
        el.classList.remove('reveal');
        el.style.transitionDelay = '';
      }, delay + 700);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

// ---------- Animated counters (run once, when in view) ----------
function counterText(el, value) {
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  return (el.dataset.prefix || '') + value.toFixed(decimals) + (el.dataset.suffix || '');
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const duration = 1100;
  const start = performance.now();

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = counterText(el, target * ease(p));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if (EDIT_MODE) {
  document.querySelectorAll('.counter').forEach((el) => { el.textContent = counterText(el, parseFloat(el.dataset.target)); });
} else {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));
}

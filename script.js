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

// ---------- Skill tag "pin" toggle (click, or Enter/Space, to mark as a core strength) ----------
(function setupSkillTags() {
  let hasAnyStoredPin = false;
  try {
    hasAnyStoredPin = Object.keys(localStorage).some((k) => k.startsWith('skill-pin:'));
  } catch (e) {}

  document.querySelectorAll('.skills-tags span').forEach((tag) => {
    const key = 'skill-pin:' + tag.textContent.trim();
    tag.setAttribute('role', 'button');

    let pinned = false;
    try {
      const stored = localStorage.getItem(key);
      if (stored === '1') pinned = true;
      // First-ever visit, nothing pinned yet: default the flagship category
      // (Cloud & Infrastructure) to pinned, since that is this site's whole thesis.
      else if (stored === null && !hasAnyStoredPin && tag.closest('.skills-group').querySelector('.skills-group-label').textContent.includes('Cloud & Infrastructure')) {
        pinned = true;
      }
    } catch (e) {}

    if (pinned) tag.classList.add('pinned');
    tag.setAttribute('aria-pressed', pinned ? 'true' : 'false');

    function togglePin() {
      if (document.body.classList.contains('edit-mode')) return;
      const now = tag.classList.toggle('pinned');
      tag.setAttribute('aria-pressed', now ? 'true' : 'false');
      try {
        localStorage.setItem(key, now ? '1' : '0');
      } catch (e) {}
    }

    tag.addEventListener('click', togglePin);
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePin();
      }
    });
  });
})();

// Scroll-reveal for any element with the .reveal class
const revealEls = document.querySelectorAll(
  '.metric-card, .section-label, .section-heading, .timeline-entry, .edu-card, .project-card, .skills-group, .cert-row, .contact-badge, .contact-heading, .contact-sub, .contact-links'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('in-view'), i * 90);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2, rootMargin: '-40px' });

revealEls.forEach((el) => revealObserver.observe(el));

// Animated counters (run once, when in view)
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1100;
  const start = performance.now();

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const val = target * ease(p);
    el.textContent = prefix + val.toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

// Subtle spring-like parallax on the hero network, following the pointer.
// Decorative only: skipped entirely under prefers-reduced-motion and on touch devices.
const heroNetwork = document.querySelector('.hero-network');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (heroNetwork && !prefersReducedMotion && canHover) {
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let ticking = false;

  function springTick() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;
    heroNetwork.style.transform = `translate(${currentX}px, ${currentY}px)`;

    // Settle and stop the loop once the motion is imperceptible, rather than
    // running requestAnimationFrame forever while the pointer sits still.
    if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
      ticking = false;
      return;
    }
    requestAnimationFrame(springTick);
  }

  document.querySelector('.hero').addEventListener('mousemove', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    targetX = px * 16;
    targetY = py * 16;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(springTick);
    }
  });
}

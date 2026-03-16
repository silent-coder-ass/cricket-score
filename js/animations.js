/* ============================
   Lightweight Event Animations
   ============================ */

const Animations = (() => {
  const overlay = () => document.getElementById('animation-overlay');
  const content = () => document.getElementById('animation-content');

  const events = {
    four: { text: 'FOUR!', sub: '4 runs', cssClass: 'four-text' },
    six:  { text: 'SIX!', sub: '6 runs — Maximum!', cssClass: 'six-text' },
    out:  { text: 'OUT!', sub: 'Wicket falls', cssClass: 'out-text' },
    wide: { text: 'WIDE', sub: '+1 run', cssClass: 'wide-text' },
    noball: { text: 'NO BALL', sub: '+1 run', cssClass: 'noball-text' }
  };

  let animTimeout = null;

  /**
   * Show event animation
   */
  function show(type) {
    const cfg = events[type];
    if (!cfg) return;

    const ol = overlay();
    const ct = content();
    if (!ol || !ct) return;

    // Clear previous
    if (animTimeout) {
      clearTimeout(animTimeout);
      animTimeout = null;
    }

    // Remove active class to reset animation
    ol.classList.remove('active');
    
    // Force a browser reflow (critical for mobile Safari/Chrome to restart CSS animation)
    void ol.offsetWidth;

    ct.innerHTML = `
      <div class="event-text ${cfg.cssClass}">${cfg.text}</div>
      <div class="event-sub">${cfg.sub}</div>
    `;

    ol.classList.add('active');

    animTimeout = setTimeout(() => {
      ol.classList.remove('active');
      animTimeout = null;
    }, 1100);
  }

  /**
   * Show celebration on match end
   */
  function celebrate() {
    const bg = document.getElementById('celebration-bg');
    if (!bg) return;
    bg.innerHTML = '';

    const colors = ['#22c55e', '#a855f7', '#facc15', '#ef4444', '#00e5ff', '#f97316', '#ec4899'];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'celebration-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (2 + Math.random() * 3) + 's';
      p.style.animationDelay = (Math.random() * 2) + 's';
      p.style.width = (4 + Math.random() * 8) + 'px';
      p.style.height = p.style.width;
      bg.appendChild(p);
    }
  }

  return { show, celebrate };
})();

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

  /**
   * Animated Pitch Runners Let's Go
   */
  function playPitchAnimation(runs, modePrefix) {
    const runnerA = document.getElementById(modePrefix + '-runner-a');
    const runnerB = document.getElementById(modePrefix + '-runner-b');
    const eventOverlay = document.getElementById(modePrefix + '-pitch-event');

    if (!runnerA || !runnerB || !eventOverlay) return;

    // Reset four/six overlay
    eventOverlay.className = 'pitch-event-overlay';
    eventOverlay.innerHTML = '';

    if (runs === 4 || runs === 6) {
      eventOverlay.innerHTML = runs === 4 ? 'FOUR' : 'SIX';
      eventOverlay.classList.add(runs === 4 ? 'show-four' : 'show-six');
      return;
    }

    if (runs === 1 || runs === 2 || runs === 3) {
      runnerA.classList.add('is-running');
      runnerB.classList.add('is-running');

      // Initialize dataset positions if empty
      if (!runnerA.dataset.pos) runnerA.dataset.pos = 'left';
      if (!runnerB.dataset.pos) runnerB.dataset.pos = 'right';

      const swapOnce = () => {
        // Swap A
        if (runnerA.dataset.pos === 'left') {
          runnerA.dataset.pos = 'right';
          runnerA.style.left = '85%';
          runnerA.dataset.dir = 'right';
        } else {
          runnerA.dataset.pos = 'left';
          runnerA.style.left = '5%';
          runnerA.dataset.dir = 'left';
        }
        
        // Swap B
        if (runnerB.dataset.pos === 'right') {
          runnerB.dataset.pos = 'left';
          runnerB.style.left = '5%';
          runnerB.dataset.dir = 'left';
        } else {
          runnerB.dataset.pos = 'right';
          runnerB.style.left = '85%';
          runnerB.dataset.dir = 'right';
        }
      };

      // Run sequence
      swapOnce();

      if (runs > 1) {
        setTimeout(() => swapOnce(), 1100);
      }
      if (runs > 2) {
        setTimeout(() => swapOnce(), 2200);
      }

      // Stop bounce animation after runs are done
      setTimeout(() => {
        runnerA.classList.remove('is-running');
        runnerB.classList.remove('is-running');
        
        // Face the pitch center after stopping
        runnerA.dataset.dir = runnerA.dataset.pos === 'left' ? 'right' : 'left';
        runnerB.dataset.dir = runnerB.dataset.pos === 'left' ? 'right' : 'left';
      }, runs * 1100);
    }
  }

  return { show, celebrate, playPitchAnimation };
})();

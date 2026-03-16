/* ============================
   App — Router & Initialization
   ============================ */

const App = (() => {

  let currentScreen = 'home';
  let currentMode = null; // 'local' or 'tournament'

  /**
   * Navigate to a screen
   */
  function navigate(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });

    // Show target
    const target = document.getElementById('screen-' + screenId);
    if (target) {
      target.classList.add('active');
      currentScreen = screenId;
    }

    // Track current mode
    if (screenId === 'local-setup' || screenId === 'local-match') {
      currentMode = 'local';
    } else if (screenId === 'tournament-setup' || screenId === 'tournament-match') {
      currentMode = 'tournament';
    } else if (screenId === 'home') {
      currentMode = null;
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Add ripple effect
   */
  function addRipple(e, container) {
    const rect = container.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - size / 2) + 'px';
    ripple.style.top = (y - size / 2) + 'px';

    const rippleContainer = container.querySelector('.ripple-container');
    if (rippleContainer) {
      rippleContainer.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
  }

  /**
   * Initialize the app
   */
  function init() {
    // Init Firebase
    FirebaseSync.init();

    // Start listening globally for active match to show Live Banner
    const liveBanner = document.getElementById('live-match-banner');
    const liveTeams = document.getElementById('live-match-teams');
    let globalLiveMatchState = null;

    FirebaseSync.listen((data) => {
      if (data && !data.isMatchOver) {
        globalLiveMatchState = data;
        if (liveBanner && liveTeams) {
          liveBanner.style.display = 'block';
          liveTeams.textContent = `${data.teams[0].name} vs ${data.teams[1].name}`;
        }
      } else {
        globalLiveMatchState = null;
        if (liveBanner) {
          liveBanner.style.display = 'none';
        }
      }
    });

    if (liveBanner) {
      liveBanner.addEventListener('click', () => {
        if (!globalLiveMatchState) return;
        if (globalLiveMatchState.mode === 'local') {
          LocalMode.joinLiveMatch(globalLiveMatchState);
        } else if (globalLiveMatchState.mode === 'tournament') {
          TournamentMode.joinLiveMatch(globalLiveMatchState);
        }
      });
    }

    // Init mode setups
    LocalMode.initSetup();
    TournamentMode.initSetup();

    // ---- Navigation buttons ----
    document.querySelectorAll('[data-navigate]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        addRipple(e, btn);
        const target = btn.getAttribute('data-navigate');
        navigate(target);
      });
    });

    // ---- Local Mode — Run buttons ----
    const localControls = document.getElementById('local-controls');
    if (localControls) {
      localControls.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        // Only authenticated can score
        if (!LocalMode.getIsAuthenticated()) {
          showAuthModal('local');
          return;
        }

        LocalMode.handleAction(btn.dataset.action);
      });
    }

    // ---- Tournament Mode — Run buttons ----
    const tournamentControls = document.getElementById('tournament-controls');
    if (tournamentControls) {
      tournamentControls.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        if (!TournamentMode.getIsAuthenticated()) {
          showAuthModal('tournament');
          return;
        }

        TournamentMode.handleAction(btn.dataset.action);
      });
    }

    // ---- Auth buttons ----
    document.getElementById('btn-local-auth').addEventListener('click', () => showAuthModal('local'));
    document.getElementById('btn-tournament-auth').addEventListener('click', () => showAuthModal('tournament'));

    // ---- Auth modal ----
    document.getElementById('auth-confirm').addEventListener('click', () => {
      const code = document.getElementById('auth-code-input').value.trim();
      let success = false;

      if (currentMode === 'local') {
        success = LocalMode.authenticate(code);
      } else if (currentMode === 'tournament') {
        success = TournamentMode.authenticate(code);
      }

      if (success) {
        hideModal('auth-modal');
        document.getElementById('auth-code-input').value = '';
        document.getElementById('auth-error').textContent = '';
      } else {
        document.getElementById('auth-error').textContent = 'Invalid code. Try again.';
      }
    });

    document.getElementById('auth-cancel').addEventListener('click', () => {
      hideModal('auth-modal');
      document.getElementById('auth-code-input').value = '';
      document.getElementById('auth-error').textContent = '';
    });

    // ---- Reset buttons ----
    document.getElementById('btn-local-reset').addEventListener('click', () => showResetModal());
    document.getElementById('btn-tournament-reset').addEventListener('click', () => showResetModal());

    // ---- Reset modal ----
    document.getElementById('reset-confirm').addEventListener('click', () => {
      const code = document.getElementById('reset-code-input').value.trim();
      let success = false;

      if (currentMode === 'local') {
        success = LocalMode.resetMatch(code);
      } else if (currentMode === 'tournament') {
        success = TournamentMode.resetMatch(code);
      }

      if (success) {
        hideModal('reset-modal');
        document.getElementById('reset-code-input').value = '';
        document.getElementById('reset-error').textContent = '';
        navigate('home');
      } else {
        document.getElementById('reset-error').textContent = 'Invalid code. Try again.';
      }
    });

    document.getElementById('reset-cancel').addEventListener('click', () => {
      hideModal('reset-modal');
      document.getElementById('reset-code-input').value = '';
      document.getElementById('reset-error').textContent = '';
    });

    // ---- Home buttons ----
    document.getElementById('btn-local-home').addEventListener('click', () => navigate('home'));
    document.getElementById('btn-tournament-home').addEventListener('click', () => navigate('home'));

    // ---- Handle auth code input Enter key ----
    document.getElementById('auth-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-confirm').click();
    });
    document.getElementById('reset-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('reset-confirm').click();
    });

    // Start on home
    navigate('home');
  }

  /**
   * Show auth modal
   */
  function showAuthModal(mode) {
    currentMode = mode;
    document.getElementById('auth-modal').classList.add('active');
    document.getElementById('auth-code-input').focus();
  }

  /**
   * Show reset modal
   */
  function showResetModal() {
    document.getElementById('reset-modal').classList.add('active');
    document.getElementById('reset-code-input').focus();
  }

  /**
   * Hide a modal
   */
  function hideModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return { navigate };
})();

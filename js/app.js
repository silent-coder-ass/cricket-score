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

    // Start listening globally for active matches to show on Home Screen
    const matchesContainer = document.getElementById('live-matches-container');
    let globalMatchesMap = {};

    FirebaseSync.listenAllMatches((matches) => {
      if (!matchesContainer) return;

      // Ensure we clear mapping on each update to prevent old ghost matches
      globalMatchesMap = {};
      
      // Filter to only true match objects that aren't over
      const activeMatches = matches.filter(m => 
        m && 
        typeof m === 'object' && 
        m.id && 
        m.teams && 
        m.mode && 
        !m.isMatchOver
      );
      
      if (activeMatches.length === 0) {
        matchesContainer.innerHTML = '';
        return;
      }

      let html = '';
      activeMatches.forEach(match => {
        globalMatchesMap[match.id] = match;
        const modeLabel = match.mode === 'tournament' ? '🏆 Tournament' : '🏠 Local';
        
        let teamAtxt = 'Team A';
        let teamBtxt = 'Team B';
        if (match.teams && match.teams.length >= 2) {
           teamAtxt = match.teams[0].name || 'Team A';
           teamBtxt = match.teams[1].name || 'Team B';
        }

        html += `
          <div class="live-match-banner" data-match-id="${match.id}" style="display: block; margin-bottom: 12px; cursor: pointer;">
            <div class="live-badge"><span></span>LIVE ${modeLabel}</div>
            <div class="live-match-teams">${teamAtxt} vs ${teamBtxt}</div>
            <div class="live-match-desc">Tap to View Score</div>
          </div>
        `;
      });
      matchesContainer.innerHTML = html;
    });

    if (matchesContainer) {
      matchesContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.live-match-banner');
        if (!card) return;
        
        const matchId = card.getAttribute('data-match-id');
        const matchState = globalMatchesMap[matchId];
        
        if (!matchState) return;
        
        if (matchState.mode === 'local') {
          LocalMode.joinLiveMatch(matchState);
        } else if (matchState.mode === 'tournament') {
          TournamentMode.joinLiveMatch(matchState);
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
    document.getElementById('local-auth-banner').addEventListener('click', () => showAuthModal('local'));
    document.getElementById('tournament-auth-banner').addEventListener('click', () => showAuthModal('tournament'));

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

    // ---- Delete buttons ----
    document.getElementById('btn-local-delete').addEventListener('click', () => showDeleteModal());
    document.getElementById('btn-tournament-delete').addEventListener('click', () => showDeleteModal());

    // ---- Delete modal ----
    document.getElementById('delete-confirm').addEventListener('click', () => {
      const code = document.getElementById('delete-code-input').value.trim();
      let success = false;

      if (currentMode === 'local') {
        success = LocalMode.deleteMatch(code);
      } else if (currentMode === 'tournament') {
        success = TournamentMode.deleteMatch(code);
      }

      if (success) {
        hideModal('delete-modal');
        document.getElementById('delete-code-input').value = '';
        document.getElementById('delete-error').textContent = '';
        navigate('home');
      } else {
        document.getElementById('delete-error').textContent = 'Invalid code. Try again.';
      }
    });

    document.getElementById('delete-cancel').addEventListener('click', () => {
      hideModal('delete-modal');
      document.getElementById('delete-code-input').value = '';
      document.getElementById('delete-error').textContent = '';
    });

    // ---- Home buttons ----
    document.getElementById('btn-local-home').addEventListener('click', () => navigate('home'));
    document.getElementById('btn-tournament-home').addEventListener('click', () => navigate('home'));

    // ---- Handle auth code input Enter key ----
    document.getElementById('auth-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('auth-confirm').click();
    });
    document.getElementById('delete-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('delete-confirm').click();
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
   * Show delete modal
   */
  function showDeleteModal() {
    document.getElementById('delete-modal').classList.add('active');
    document.getElementById('delete-code-input').focus();
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

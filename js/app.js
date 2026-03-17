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

    // ===== User Session Tracking =====
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : 
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    const ua = navigator.userAgent;
    const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
    const browser = /Chrome/i.test(ua) ? 'Chrome' : 
                    /Safari/i.test(ua) ? 'Safari' : 
                    /Firefox/i.test(ua) ? 'Firefox' : 'Other';
    
    const sessionData = {
      sessionId,
      joinedAt: Date.now(),
      device,
      browser,
      lat: null,
      lng: null,
      city: 'Unknown',
      country: '',
      matchViewed: ''
    };

    // Push session immediately (without location)
    FirebaseSync.trackSession(sessionData);

    // Step 1: Get IP-based location automatically (no permission needed, works on HTTP)
    fetch('https://api.bigdatacloud.net/data/client-ip')
      .then(r => r.json())
      .then(ipData => {
        const ip = ipData.ipString || '';
        return fetch('https://api.bigdatacloud.net/data/ip-geolocation?ip=' + ip + '&key=bdc_4b3cf26f5b284870b1b3e38c14dcb034');
      })
      .then(r => r.json())
      .then(geo => {
        sessionData.lat = geo.location?.latitude || null;
        sessionData.lng = geo.location?.longitude || null;
        sessionData.city = geo.location?.city || geo.city || geo.location?.localityName || 'Unknown';
        sessionData.country = geo.country?.name || '';
        FirebaseSync.trackSession(sessionData);
      })
      .catch(() => {
        // Fallback: try simpler IP API
        fetch('https://ipwho.is/')
          .then(r => r.json())
          .then(d => {
            sessionData.lat = d.latitude || null;
            sessionData.lng = d.longitude || null;
            sessionData.city = d.city || 'Unknown';
            sessionData.country = d.country || '';
            FirebaseSync.trackSession(sessionData);
          })
          .catch(() => { /* Keep as Unknown */ });
      });

    // Step 2: Show banner for precise GPS upgrade (optional, improves accuracy)
    if (navigator.geolocation) {
      const banner = document.createElement('div');
      banner.id = 'location-banner';
      banner.innerHTML = `
        <div style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#111827;border-top:1px solid #1e293b;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'Outfit',sans-serif;">
          <span style="color:#f1f5f9;font-size:0.9rem;">📍 Enable precise location for match analytics?</span>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button id="loc-allow" style="padding:8px 16px;border:none;border-radius:8px;background:#00e5ff;color:#000;font-weight:700;font-family:'Outfit',sans-serif;cursor:pointer;font-size:0.85rem;">Allow</button>
            <button id="loc-deny" style="padding:8px 16px;border:1px solid #374151;border-radius:8px;background:transparent;color:#94a3b8;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;font-size:0.85rem;">No Thanks</button>
          </div>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('loc-allow').addEventListener('click', () => {
        banner.remove();
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sessionData.lat = pos.coords.latitude;
            sessionData.lng = pos.coords.longitude;
            // Reverse geocode for city name
            fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + pos.coords.latitude + '&longitude=' + pos.coords.longitude + '&localityLanguage=en')
              .then(r => r.json())
              .then(geo => {
                sessionData.city = geo.city || geo.locality || geo.principalSubdivision || sessionData.city;
                sessionData.country = geo.countryName || sessionData.country;
                FirebaseSync.trackSession(sessionData);
              })
              .catch(() => FirebaseSync.trackSession(sessionData));
          },
          () => { /* GPS failed, IP location already captured */ },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      });

      document.getElementById('loc-deny').addEventListener('click', () => banner.remove());
      setTimeout(() => { if (banner.parentNode) banner.remove(); }, 15000);
    }

    // Clean up session on page unload
    window.addEventListener('beforeunload', () => {
      FirebaseSync.removeSession(sessionId);
    });

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
          FirebaseSync.updateSessionMatch(sessionId, matchState.teams[0].name + ' vs ' + matchState.teams[1].name);
          LocalMode.joinLiveMatch(matchState);
        } else if (matchState.mode === 'tournament') {
          FirebaseSync.updateSessionMatch(sessionId, matchState.teams[0].name + ' vs ' + matchState.teams[1].name);
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

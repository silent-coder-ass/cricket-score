/* ============================
   Local Score Mode Controller
   ============================ */

const LocalMode = (() => {
  let matchState = null;
  let isAuthenticated = false;
  let matchListener = null;

  const AUTH_CODE = '456838';
  const RESET_CODE = '6000040312';

  // DOM references (lazy)
  const el = (id) => document.getElementById(id);

  /**
   * Initialize setup form
   */
  function initSetup() {
    const playersInput = el('local-players');
    const info = el('local-players-info');
    const teamAInput = el('local-teamA');
    const teamBInput = el('local-teamB');
    const batFirstSelect = el('local-bat-first');

    if (playersInput) {
      playersInput.addEventListener('input', () => {
        const n = parseInt(playersInput.value);
        if (n >= 2) {
          info.textContent = `Total Wickets = ${n - 1} (Players - 1)`;
        } else {
          info.textContent = '';
        }
      });
    }

    const updateBatFirstOptions = () => {
      if (!batFirstSelect) return;
      const tA = teamAInput.value.trim() || 'Team A';
      const tB = teamBInput.value.trim() || 'Team B';
      batFirstSelect.options[0].text = tA;
      batFirstSelect.options[1].text = tB;
    };

    if (teamAInput) teamAInput.addEventListener('input', updateBatFirstOptions);
    if (teamBInput) teamBInput.addEventListener('input', updateBatFirstOptions);

    const form = el('local-setup-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        startMatch();
      });
    }
  }

  /**
   * Start a new local match
   */
  function startMatch() {
    const teamA = el('local-teamA').value.trim() || 'Team A';
    const teamB = el('local-teamB').value.trim() || 'Team B';
    const overs = parseInt(el('local-overs').value) || 5;
    const players = parseInt(el('local-players').value) || 8;
    const batFirst = parseInt(el('local-bat-first').value) || 0;

    matchState = CricketEngine.createMatch({
      mode: 'local',
      teamA, teamB,
      totalOvers: overs,
      playersPerTeam: players,
      batFirst: batFirst
    });

    isAuthenticated = false;
    updateAuthBanner();
    updateScoreboard();
    // Clear old celebration
    const bg = document.getElementById('celebration-bg');
    if (bg) bg.innerHTML = '';

    App.navigate('local-match');

    // Clean up previous match listener if any
    if (matchListener) {
      FirebaseSync.removeCallback(matchListener);
    }

    // Create and register new match listener
    matchListener = (data) => {
      if (data) {
        if (data.teams) {
          data.teams.forEach(t => {
            t.ballHistory = t.ballHistory || [];
            t.currentOver = t.currentOver || [];
            t.overSummaries = t.overSummaries || [];
            t.players = t.players || [];
          });
        }
        // Don't overwrite our new match state with an old finished match
        if (data.isMatchOver && matchState && !matchState.isMatchOver) {
          return;
        }
        // Trigger animation for remote events
        if (data.lastEvent && (!matchState || !matchState.lastEvent || matchState.lastEvent.timestamp !== data.lastEvent.timestamp)) {
          Animations.show(data.lastEvent.type);
        }
        matchState = data;
        updateScoreboard();
        if (data.isMatchOver) {
          showMatchEnd();
        }
      }
    };

    // Start listening for real-time updates from Firebase
    FirebaseSync.listen(matchListener);
  }

  /**
   * Join an active live match as a viewer
   */
  function joinLiveMatch(data) {
    matchState = data;
    isAuthenticated = false;
    updateAuthBanner();
    updateScoreboard();
    
    // Clear old celebration
    const bg = el('celebration-bg');
    if (bg) bg.innerHTML = '';
    
    App.navigate('local-match');
    
    if (data.isMatchOver) {
      showMatchEnd();
    }

    // Clean up previous match listener if any
    if (matchListener) {
      FirebaseSync.removeCallback(matchListener);
    }

    // Register listener for real-time updates
    matchListener = (updatedData) => {
      if (updatedData) {
        if (updatedData.teams) {
          updatedData.teams.forEach(t => {
            t.ballHistory = t.ballHistory || [];
            t.currentOver = t.currentOver || [];
            t.overSummaries = t.overSummaries || [];
            t.players = t.players || [];
          });
        }
        // Trigger animation for remote events
        if (updatedData.lastEvent && (!matchState || !matchState.lastEvent || matchState.lastEvent.timestamp !== updatedData.lastEvent.timestamp)) {
          Animations.show(updatedData.lastEvent.type);
        }
        matchState = updatedData;
        updateScoreboard();
        if (updatedData.isMatchOver) {
          showMatchEnd();
        }
      }
    };
    FirebaseSync.listen(matchListener);
  }

  /**
   * Handle scoring action
   */
  function handleAction(action) {
    if (!matchState || matchState.isMatchOver) return;

    let animType = null;

    switch (action) {
      case 'dot':
        CricketEngine.addRuns(matchState, 0);
        break;
      case '1':
        CricketEngine.addRuns(matchState, 1);
        break;
      case '2':
        CricketEngine.addRuns(matchState, 2);
        break;
      case '3':
        CricketEngine.addRuns(matchState, 3);
        break;
      case '4':
        CricketEngine.addRuns(matchState, 4);
        animType = 'four';
        break;
      case '5':
        CricketEngine.addRuns(matchState, 5);
        break;
      case '6':
        CricketEngine.addRuns(matchState, 6);
        animType = 'six';
        break;
      case 'wide':
        CricketEngine.addWide(matchState);
        animType = 'wide';
        break;
      case 'noball':
        CricketEngine.addNoBall(matchState);
        animType = 'noball';
        break;
      case 'out':
        CricketEngine.addWicket(matchState);
        animType = 'out';
        break;
      default:
        return;
    }

    // Show animation
    if (animType) {
      Animations.show(animType);
    }

    // Animate score number
    const runsEl = el('local-runs');
    if (runsEl) {
      runsEl.classList.remove('animate');
      void runsEl.offsetWidth; // trigger reflow
      runsEl.classList.add('animate');
    }

    updateScoreboard();

    // Sync to Firebase if authenticated
    if (isAuthenticated) {
      if (animType) {
        matchState.lastEvent = { type: animType, timestamp: Date.now() };
      }
      FirebaseSync.syncState(matchState);
    }

    // Check match over
    if (matchState.isMatchOver) {
      setTimeout(() => showMatchEnd(), 1200);
    }
  }

  /**
   * Update scoreboard UI
   */
  function updateScoreboard() {
    if (!matchState) return;

    const team = CricketEngine.getBattingTeam(matchState);
    const innings = matchState.currentInnings;

    // Team badges
    el('local-sb-teamA').textContent = matchState.teams[0].name;
    el('local-sb-teamB').textContent = matchState.teams[1].name;

    // Batting indicator
    const badgeA = el('local-teamA-badge');
    const badgeB = el('local-teamB-badge');
    badgeA.classList.toggle('batting', innings === 0);
    badgeB.classList.toggle('batting', innings === 1);

    // Innings label
    el('local-innings-label').textContent = innings === 0 ? '1st Innings' : '2nd Innings';

    // Score
    el('local-runs').textContent = team.runs;
    el('local-wickets').textContent = team.wickets;
    el('local-overs-display').textContent = CricketEngine.getOversDisplay(matchState);
    el('local-total-overs').textContent = matchState.totalOvers;

    // Players remaining
    const remaining = CricketEngine.getPlayersRemaining(matchState);
    el('local-players-remaining').textContent = remaining;

    // Run rate
    el('local-run-rate').textContent = CricketEngine.getRunRate(matchState);

    // Target and required (2nd innings only)
    const showTarget = innings === 1 && matchState.target !== null;
    el('local-target-section').style.display = showTarget ? '' : 'none';
    el('local-required-section').style.display = showTarget ? '' : 'none';
    el('local-reqrate-section').style.display = showTarget ? '' : 'none';

    if (showTarget) {
      el('local-target').textContent = matchState.target;
      const reqRuns = CricketEngine.getRequiredRuns(matchState);
      const remBalls = CricketEngine.getRemainingBalls(matchState);
      el('local-required').textContent = `${reqRuns} off ${remBalls}`;
      el('local-req-rate').textContent = CricketEngine.getRequiredRate(matchState) || '0.00';
    }

    // Wicket indicator
    updateWicketIndicator('local-wicket-indicator', team.wickets, matchState.maxWickets);

    // Current over balls
    updateCurrentOver('local-current-over', team.currentOver);
  }

  /**
   * Render wicket indicator dots
   */
  function updateWicketIndicator(containerId, wicketsFallen, maxWickets) {
    const container = el(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < maxWickets; i++) {
      const dot = document.createElement('div');
      dot.className = 'wicket-dot' + (i < wicketsFallen ? ' out' : '');
      container.appendChild(dot);
    }
  }

  /**
   * Render current over balls
   */
  function updateCurrentOver(containerId, overBalls) {
    const container = el(containerId);
    if (!container) return;
    container.innerHTML = '';
    (overBalls || []).forEach(ball => {
      const tag = document.createElement('span');
      tag.className = 'ball-tag ' + (ball.class || '');
      tag.textContent = ball.label;
      container.appendChild(tag);
    });
  }

  /**
   * Show match end screen
   */
  function showMatchEnd() {
    if (!matchState) return;
    el('winner-title').textContent = matchState.winMessage || 'Match Over';
    el('winner-team-name').textContent = matchState.winner || '';

    const scoresHTML = matchState.teams.map(t => {
      const overs = Math.floor(t.balls / 6);
      const balls = t.balls % 6;
      return `<div class="final-score-line"><span>${t.name}</span> — ${t.runs}/${t.wickets} (${overs}.${balls} overs)</div>`;
    }).join('');
    el('final-scores').innerHTML = scoresHTML;

    App.navigate('match-end');
    Animations.celebrate();
  }

  /**
   * Update auth banner
   */
  function updateAuthBanner() {
    const banner = el('local-auth-banner');
    if (!banner) return;
    const icon = banner.querySelector('.auth-corner-icon');
    if (isAuthenticated) {
      banner.classList.add('authenticated');
      if (icon) icon.textContent = '✅';
      banner.title = 'Authenticated';
    } else {
      banner.classList.remove('authenticated');
      if (icon) icon.textContent = '🔒';
      banner.title = 'Authenticate';
    }
  }

  /**
   * Authenticate device
   */
  function authenticate(code) {
    if (code === AUTH_CODE) {
      isAuthenticated = true;
      updateAuthBanner();
      // Sync current state
      if (matchState) {
        FirebaseSync.syncState(matchState);
      }
      return true;
    }
    return false;
  }

  /**
   * Delete match (clears Firebase and local state)
   */
  function deleteMatch(code) {
    if (code === AUTH_CODE) {
      matchState = null;
      isAuthenticated = false;
      if (matchListener) {
        FirebaseSync.removeCallback(matchListener);
        matchListener = null;
      }
      FirebaseSync.resetMatch();
      return true;
    }
    return false;
  }

  /**
   * Check if authenticated
   */
  function getIsAuthenticated() {
    return isAuthenticated;
  }

  /**
   * Get match state
   */
  function getState() {
    return matchState;
  }

  return {
    initSetup,
    startMatch,
    joinLiveMatch,
    handleAction,
    authenticate,
    deleteMatch,
    getIsAuthenticated,
    getState,
    updateScoreboard,
    showMatchEnd,
    updateAuthBanner
  };
})();

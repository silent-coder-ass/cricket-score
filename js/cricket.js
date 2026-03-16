/* ============================
   Cricket Logic Engine
   ============================ */

const CricketEngine = (() => {

  /**
   * Create initial match state
   */
  function createMatch(config) {
    const maxWickets = config.playersPerTeam - 1;
    const batFirst = config.batFirst || 0; // 0 for Team A, 1 for Team B

    // Determine initial teams based on who bats first
    const teamAConfig = batFirst === 0 ? {
      name: config.teamA,
      captain: config.captainA || '',
      players: config.playersA || []
    } : {
      name: config.teamB,
      captain: config.captainB || '',
      players: config.playersB || []
    };

    const teamBConfig = batFirst === 0 ? {
      name: config.teamB,
      captain: config.captainB || '',
      players: config.playersB || []
    } : {
      name: config.teamA,
      captain: config.captainA || '',
      players: config.playersA || []
    };

    return {
      mode: config.mode, // 'local' or 'tournament'
      totalOvers: config.totalOvers,
      playersPerTeam: config.playersPerTeam,
      maxWickets: maxWickets,
      currentInnings: 0, // 0 = first innings (team index 0 bats), 1 = second innings
      isMatchOver: false,
      winner: null,
      winMessage: '',
      target: null,
      teams: [
        {
          name: teamAConfig.name,
          captain: teamAConfig.captain,
          players: teamAConfig.players,
          runs: 0,
          wickets: 0,
          balls: 0,
          overs: 0,
          ballHistory: [],    // full history
          currentOver: [],    // current over balls
          overSummaries: []   // summary per over
        },
        {
          name: teamBConfig.name,
          captain: teamBConfig.captain,
          players: teamBConfig.players,
          runs: 0,
          wickets: 0,
          balls: 0,
          overs: 0,
          ballHistory: [],
          currentOver: [],
          overSummaries: []
        }
      ],
      // Tournament extras
      tournamentName: config.tournamentName || ''
    };
  }

  /**
   * Get current batting team
   */
  function getBattingTeam(state) {
    return state.teams[state.currentInnings];
  }

  /**
   * Get bowling team
   */
  function getBowlingTeam(state) {
    return state.teams[state.currentInnings === 0 ? 1 : 0];
  }

  /**
   * Add runs (1-6 or 0 for dot)
   */
  function addRuns(state, runs) {
    if (state.isMatchOver) return state;
    const team = getBattingTeam(state);
    team.runs += runs;
    team.balls += 1;

    const ballLabel = runs === 0 ? '0' : String(runs);
    let ballClass = '';
    if (runs === 4) ballClass = 'four';
    else if (runs === 6) ballClass = 'six';

    team.currentOver.push({ label: ballLabel, class: ballClass });
    team.ballHistory.push({ label: ballLabel, class: ballClass, type: 'runs', value: runs });

    checkOverComplete(state);
    checkInningsEnd(state);
    checkChaseComplete(state);
    return state;
  }

  /**
   * Add wide — +1 run, ball NOT counted
   */
  function addWide(state) {
    if (state.isMatchOver) return state;
    const team = getBattingTeam(state);
    team.runs += 1;
    team.currentOver.push({ label: 'WD', class: 'wide' });
    team.ballHistory.push({ label: 'WD', class: 'wide', type: 'wide', value: 1 });
    checkChaseComplete(state);
    return state;
  }

  /**
   * Add no ball — +1 run, ball NOT counted
   */
  function addNoBall(state) {
    if (state.isMatchOver) return state;
    const team = getBattingTeam(state);
    team.runs += 1;
    team.currentOver.push({ label: 'NB', class: 'noball' });
    team.ballHistory.push({ label: 'NB', class: 'noball', type: 'noball', value: 1 });
    checkChaseComplete(state);
    return state;
  }

  /**
   * Add wicket — +1 wicket, +1 ball
   */
  function addWicket(state) {
    if (state.isMatchOver) return state;
    const team = getBattingTeam(state);
    team.wickets += 1;
    team.balls += 1;
    team.currentOver.push({ label: 'W', class: 'wicket' });
    team.ballHistory.push({ label: 'W', class: 'wicket', type: 'out', value: 0 });

    checkOverComplete(state);
    checkInningsEnd(state);
    return state;
  }

  /**
   * Check if over is complete (6 legal balls)
   */
  function checkOverComplete(state) {
    const team = getBattingTeam(state);
    if (team.balls > 0 && team.balls % 6 === 0) {
      team.overs = team.balls / 6;
      // Save over summary
      team.overSummaries.push([...team.currentOver]);
      team.currentOver = [];
    } else {
      team.overs = Math.floor(team.balls / 6);
    }
  }

  /**
   * Check if innings should end
   */
  function checkInningsEnd(state) {
    const team = getBattingTeam(state);
    const totalBalls = state.totalOvers * 6;
    const allOut = team.wickets >= state.maxWickets;
    const oversComplete = team.balls >= totalBalls;

    if (allOut || oversComplete) {
      if (state.currentInnings === 0) {
        // Switch to second innings
        // Save remaining current over
        if (team.currentOver.length > 0) {
          team.overSummaries.push([...team.currentOver]);
          team.currentOver = [];
        }
        state.target = team.runs + 1;
        state.currentInnings = 1;
      } else {
        // Match over — batting team (chasing) lost
        endMatch(state);
      }
    }
  }

  /**
   * Check if chasing team has reached or passed target
   */
  function checkChaseComplete(state) {
    if (state.currentInnings === 1 && state.target !== null) {
      const team = getBattingTeam(state);
      if (team.runs >= state.target) {
        endMatch(state);
      }
    }
  }

  /**
   * End the match and determine winner
   */
  function endMatch(state) {
    state.isMatchOver = true;
    const teamA = state.teams[0];
    const teamB = state.teams[1];

    if (teamB.runs > teamA.runs) {
      const wicketsLeft = state.maxWickets - teamB.wickets;
      state.winner = teamB.name;
      state.winMessage = `${teamB.name} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    } else if (teamA.runs > teamB.runs) {
      const diff = teamA.runs - teamB.runs;
      state.winner = teamA.name;
      state.winMessage = `${teamA.name} won by ${diff} run${diff !== 1 ? 's' : ''}`;
    } else {
      state.winner = 'Tie';
      state.winMessage = 'Match Tied!';
    }

    // Save remaining current over
    const team = getBattingTeam(state);
    if (team.currentOver.length > 0) {
      team.overSummaries.push([...team.currentOver]);
      team.currentOver = [];
    }
  }

  /**
   * Calculate current run rate
   */
  function getRunRate(state) {
    const team = getBattingTeam(state);
    if (team.balls === 0) return '0.00';
    const overs = team.balls / 6;
    return (team.runs / overs).toFixed(2);
  }

  /**
   * Calculate required run rate
   */
  function getRequiredRate(state) {
    if (state.currentInnings !== 1 || state.target === null) return null;
    const team = getBattingTeam(state);
    const totalBalls = state.totalOvers * 6;
    const remainingBalls = totalBalls - team.balls;
    if (remainingBalls <= 0) return '∞';
    const remainingOvers = remainingBalls / 6;
    const required = state.target - team.runs;
    if (required <= 0) return '0.00';
    return (required / remainingOvers).toFixed(2);
  }

  /**
   * Get remaining balls in innings
   */
  function getRemainingBalls(state) {
    const team = getBattingTeam(state);
    return (state.totalOvers * 6) - team.balls;
  }

  /**
   * Get required runs
   */
  function getRequiredRuns(state) {
    if (state.target === null) return null;
    const team = getBattingTeam(state);
    return Math.max(0, state.target - team.runs);
  }

  /**
   * Get players remaining
   */
  function getPlayersRemaining(state) {
    const team = getBattingTeam(state);
    return state.maxWickets - team.wickets;
  }

  /**
   * Get overs display string (e.g. "4.3")
   */
  function getOversDisplay(state) {
    const team = getBattingTeam(state);
    const fullOvers = Math.floor(team.balls / 6);
    const extraBalls = team.balls % 6;
    return `${fullOvers}.${extraBalls}`;
  }

  return {
    createMatch,
    getBattingTeam,
    getBowlingTeam,
    addRuns,
    addWide,
    addNoBall,
    addWicket,
    getRunRate,
    getRequiredRate,
    getRemainingBalls,
    getRequiredRuns,
    getPlayersRemaining,
    getOversDisplay
  };
})();

/* ============================
   Firebase Sync Module
   ============================ */

const FirebaseSync = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
    authDomain: "cricket-score-2dd6e.firebaseapp.com",
    databaseURL: "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cricket-score-2dd6e",
    storageBucket: "cricket-score-2dd6e.firebasestorage.app",
    messagingSenderId: "346158439568",
    appId: "1:346158439568:web:8df1ee903ed354c597cc15"
  };

  let db = null;
  let activeMatchesRef = null;
  
  // Single match listening
  let currentMatchRef = null;
  let isListeningMatch = false;
  let matchListener = null;
  let matchCallbacks = [];

  // All matches listening
  let isListeningAll = false;
  let allMatchesListener = null;
  let allMatchesCallbacks = [];

  /**
   * Initialize Firebase
   */
  function init() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      activeMatchesRef = db.ref('matches/current');
    } catch (e) {
      console.warn('Firebase init failed:', e);
    }
  }

  /**
   * Push match state to Firebase (only authenticated devices should call)
   */
  function syncState(state) {
    if (!db || !state || !state.id) return;
    try {
      // Create a lightweight copy to avoid uploading large history array
      const syncData = { ...state };
      delete syncData.history; // Only needed locally on scoring device
      
      db.ref('matches/current/' + state.id).set(syncData);
    } catch (e) {
      console.warn('Firebase sync failed:', e);
    }
  }

  /**
   * Listen for real-time updates (allows multiple listeners)
   */
  function listenMatch(matchId, callback) {
    if (!db || !matchId) return;
    
    // Switch to new match if different
    if (currentMatchRef && currentMatchRef.key !== matchId) {
      stopListeningMatch();
    }
    
    currentMatchRef = db.ref('matches/current/' + matchId);
    
    // Add callback to the pool
    if (!matchCallbacks.includes(callback)) {
      matchCallbacks.push(callback);
    }
    
    // Attach Firebase listener if not already active
    if (!isListeningMatch) {
      isListeningMatch = true;
      matchListener = currentMatchRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) Object.assign(data, { id: snapshot.key }); // Ensure ID is present
        matchCallbacks.forEach(cb => cb(data)); // pass data, even if null (deleted)
      });
    }
  }

  /**
   * Listen for all active matches (for home screen)
   */
  function listenAllMatches(callback) {
    if (!activeMatchesRef) return;
    
    if (!allMatchesCallbacks.includes(callback)) {
      allMatchesCallbacks.push(callback);
    }
    
    if (!isListeningAll) {
      isListeningAll = true;
      allMatchesListener = activeMatchesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const matches = [];
        if (data) {
          Object.keys(data).forEach(key => {
            const m = data[key];
            m.id = key;
            matches.push(m);
          });
        }
        allMatchesCallbacks.forEach(cb => cb(matches));
      });
    }
  }

  function removeMatchCallback(callback) {
    matchCallbacks = matchCallbacks.filter(cb => cb !== callback);
    if (matchCallbacks.length === 0 && currentMatchRef && matchListener) {
      currentMatchRef.off('value', matchListener);
      matchListener = null;
      isListeningMatch = false;
    }
  }

  function stopListeningMatch() {
    if (currentMatchRef && matchListener) {
      currentMatchRef.off('value', matchListener);
      matchListener = null;
      isListeningMatch = false;
      matchCallbacks = [];
    }
  }

  function stopListeningAll() {
    if (activeMatchesRef && allMatchesListener) {
      activeMatchesRef.off('value', allMatchesListener);
      allMatchesListener = null;
      isListeningAll = false;
      allMatchesCallbacks = [];
    }
  }

  function resetMatch(matchId) {
    if (!db || !matchId) return;
    try {
      db.ref('matches/current/' + matchId).remove();
    } catch (e) {
      console.warn('Firebase reset failed:', e);
    }
  }

  return { 
    init, syncState, 
    listenMatch, removeMatchCallback, stopListeningMatch, 
    listenAllMatches, stopListeningAll,
    resetMatch 
  };
})();

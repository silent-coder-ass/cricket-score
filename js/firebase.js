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
  let matchRef = null;
  let isListening = false;
  let listener = null;
  let callbacks = [];

  /**
   * Initialize Firebase
   */
  function init() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      matchRef = db.ref('matches/current');
    } catch (e) {
      console.warn('Firebase init failed:', e);
    }
  }

  /**
   * Push match state to Firebase (only authenticated devices should call)
   */
  function syncState(state) {
    if (!matchRef) return;
    try {
      matchRef.set(state);
    } catch (e) {
      console.warn('Firebase sync failed:', e);
    }
  }

  /**
   * Listen for real-time updates (allows multiple listeners)
   */
  function listen(callback) {
    if (!matchRef) return;
    
    // Add callback to the pool
    if (!callbacks.includes(callback)) {
      callbacks.push(callback);
    }
    
    // Attach Firebase listener if not already active
    if (!isListening) {
      isListening = true;
      listener = matchRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          callbacks.forEach(cb => cb(data));
        }
      });
    }
  }

  /**
   * Stop listening
   */
  function stopListening() {
    if (matchRef && listener) {
      matchRef.off('value', listener);
      listener = null;
      isListening = false;
      callbacks = [];
    }
  }

  /**
   * Reset match data in Firebase
   */
  function resetMatch() {
    if (!matchRef) return;
    try {
      matchRef.remove();
    } catch (e) {
      console.warn('Firebase reset failed:', e);
    }
  }

  return { init, syncState, listen, stopListening, resetMatch };
})();

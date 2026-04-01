/* ============================================================
   src/firebase.js
   Central Firebase configuration and service exports.

   NOTE: This project uses Firebase Compat SDK (CDN-loaded),
   so we export references to the initialized services rather
   than using ES-module imports, which require a bundler.

   The Firebase SDK scripts are loaded via <script> tags in
   index.html before app.js runs, making `firebase` global.
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
  authDomain:        "cricket-score-2dd6e.firebaseapp.com",
  databaseURL:       "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "cricket-score-2dd6e",
  storageBucket:     "cricket-score-2dd6e.firebasestorage.app",
  messagingSenderId: "346158439568",
  appId:             "1:346158439568:web:8df1ee903ed354c597cc15"
};

const VAPID_PUBLIC_KEY =
  "BDRdmPMEpxIwqsGFujWKC_vgl2qkU_LojLDhHTIrLAKw3QOzFyfSbXGWDNDaVF14AcrQG5dfv9f8IPFHgHgYHA8";

// ----- Initialize once -----
function getOrInitApp() {
  if (!firebase.apps.length) {
    return firebase.initializeApp(FIREBASE_CONFIG);
  }
  return firebase.app(); // return existing app
}

const app       = getOrInitApp();
const db        = firebase.database();
const messaging = (() => {
  try   { return firebase.messaging(); }
  catch { return null; } // Safari pre-permission throws
})();

// Register the FCM service worker and obtain the FCM token
async function enableNotifications() {
  if (!("Notification" in window)) return null;
  if (!messaging)                   return null;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    console.warn("[FCM] Notification permission denied.");
    return null;
  }

  try {
    const swReg = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({
      vapidKey:                    VAPID_PUBLIC_KEY,
      serviceWorkerRegistration:   swReg
    });
    console.log("[FCM] Token:", token);
    return token;
  } catch (e) {
    console.warn("[FCM] getToken failed:", e);
    return null;
  }
}

// Listen for foreground messages (when the tab is open and focused)
function onForegroundMessage(callback) {
  if (!messaging) return;
  messaging.onMessage(callback);
}

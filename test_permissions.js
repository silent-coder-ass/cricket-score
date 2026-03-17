const firebase = require('firebase/app');
require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
    databaseURL: "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cricket-score-2dd6e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

async function run() {
    try {
        console.log("Checking matches/current...");
        await db.ref('matches/current').once('value');
        console.log("[OK] matches/current is readable");

        console.log("Checking matches/active...");
        await db.ref('matches/active').once('value');
        console.log("[OK] matches/active is readable");
        
    } catch(e) {
        console.error("PERMISSIONS ERROR:", e.message);
    }
    process.exit(0);
}
run();

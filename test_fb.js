const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const firebaseConfig = {
    apiKey: "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
    databaseURL: "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cricket-score-2dd6e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

async function run() {
    try {
        console.log("Writing dummy match...");
        await db.ref('matches/active/dummy123').set({
            isMatchOver: false,
            mode: 'local',
            teams: [{name: 'TestA'}, {name: 'TestB'}]
        });
        console.log("Reading dummy match...");
        const snap = await db.ref('matches/active').once('value');
        console.log("Data:", snap.val());
        console.log("Success");
        process.exit(0);
    } catch(e) {
        console.error("FB ERROR:", e);
        process.exit(1);
    }
}
run();

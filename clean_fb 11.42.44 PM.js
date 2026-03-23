const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const firebaseConfig = {
    apiKey: "AIzaSyDcrIULzcnp4hqj7jL7v9VWtaC0jhIGyNo",
    databaseURL: "https://cricket-score-2dd6e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cricket-score-2dd6e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

db.ref('matches/current').set(null)
  .then(() => {
    console.log("Cleared old matches");
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

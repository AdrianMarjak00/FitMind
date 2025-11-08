// scripts/seedPie.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found in scripts/');
  process.exit(1);
}
const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const docs = [
  {
    type: 'goals_distribution',
    labels: ['Zlepšiť spánok','Znížiť stres','Zvýšiť produktivitu','Zlepšiť sústredenie','Lepší režim/ráno'],
    values: [28,24,20,18,10],
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  },
  {
    type: 'feature_usage',
    labels: ['Guided meditations','Sleep stories','Short workouts','Breathing exercises','Mood tracking'],
    values: [30,18,16,22,14],
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  },
  {
    type: 'plan_distribution',
    labels: ['Free','Monthly Pro','Yearly Pro','Student Discount'],
    values: [62,18,16,4],
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  }
];

(async () => {
  try {
    const batch = db.batch();
    const colRef = db.collection('pieStats');
    docs.forEach(d => {
      const docRef = colRef.doc(); // auto-id
      batch.set(docRef, d);
    });
    await batch.commit();
    console.log('✅ Seed pie data uploaded to collection "pieStats"');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();

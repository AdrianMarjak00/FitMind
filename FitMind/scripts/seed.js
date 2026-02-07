// scripts/seed.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Cesta k serviceAccountKey.json (ten musíš mať v tom istom priečinku)
const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ Nenájdený serviceAccountKey.json v priečinku scripts/');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const fakeReviews = [
  { author: 'Marek', rating: 5, text: 'Výborný stav, odporúčam.' },
  { author: 'Lucia', rating: 4, text: 'Dobrá kúpa, trocha vyššia spotreba.' },
  { author: 'Tomáš', rating: 5, text: 'Perfektné auto pre rodinu.' },
  { author: 'Anna', rating: 3, text: 'Motor v poriadku, interiér opotrebovaný.' },
  { author: 'Peter', rating: 4, text: 'Slabší audio systém ale inak OK.' },
];

(async () => {
  try {
    const colRef = db.collection('reviews');
    const batch = db.batch();

    fakeReviews.forEach(r => {
      const docRef = colRef.doc();
      batch.set(docRef, {
        ...r,
        date: admin.firestore.Timestamp.fromDate(new Date())
      });
    });

    await batch.commit();
    console.log(`✅ Seed hotový — vložených ${fakeReviews.length} dokumentov do kolekcie "reviews".`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Chyba pri seedovaní:', err);
    process.exit(1);
  }
})();

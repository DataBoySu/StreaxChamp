/** Quick check: fetch topics using Firebase client SDK (unauthenticated) */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { CONFIG } from '../src/shared/constants';

const firebaseConfig = {
  apiKey: CONFIG.FIREBASE.API_KEY,
  authDomain: CONFIG.FIREBASE.AUTH_DOMAIN,
  projectId: CONFIG.FIREBASE.PROJECT_ID,
  storageBucket: CONFIG.FIREBASE.STORAGE_BUCKET,
  messagingSenderId: CONFIG.FIREBASE.MESSAGING_SENDER_ID,
  appId: CONFIG.FIREBASE.APP_ID,
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

async function run() {
  const q = query(collection(db, 'topics'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  console.log('Topics count:', snap.size);
  snap.forEach((doc) => {
    const d = doc.data();
    console.log(doc.id, { name: d.name, urls: d.urls, status: d.status, hasQuiz: d.hasQuiz });
  });
}

run().catch(e => { console.error(e); process.exit(1); });

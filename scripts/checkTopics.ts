/** Quick check: fetch topics using Firebase client SDK (unauthenticated) */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAidW2UYWKJt-s6OXs7A9JGoMaXL-LkT9c',
  authDomain: 'streax-bot-local.firebaseapp.com',
  projectId: 'streax-bot-local',
  storageBucket: 'streax-bot-local.firebasestorage.app',
  messagingSenderId: '843988437750',
  appId: '1:843988437750:web:02cd46061ab366eb3b7ad7',
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

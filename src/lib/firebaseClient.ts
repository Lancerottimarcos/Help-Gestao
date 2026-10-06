import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const firestore: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function fetchFirestoreData(collectionName = 'agency_data', docId = 'main_state'): Promise<any | null> {
  try {
    const docRef = doc(firestore, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore Client] Erro ao buscar documento:', err);
  }
  return null;
}

export async function saveFirestoreData(data: Record<string, any>, collectionName = 'agency_data', docId = 'main_state'): Promise<boolean> {
  try {
    const docRef = doc(firestore, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore Client] Erro ao salvar documento:', err);
    return false;
  }
}

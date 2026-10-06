import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };

export async function fetchFirestoreData(_collectionName = 'agency_data', _docId = 'main_state'): Promise<any | null> {
  // Acesso seguro e resiliente ao estado central via /api/database (sem limites de cota)
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      const res = await fetch('/api/database');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return json.data;
        }
      }
    }
  } catch {}
  return null;
}

export async function saveFirestoreData(data: Record<string, any>, _collectionName = 'agency_data', _docId = 'main_state'): Promise<boolean> {
  // Gravação segura via /api/database (persiste em disco e sincroniza na nuvem pelo servidor)
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, updatedAt: Date.now() }),
      });
      return res.ok;
    }
  } catch {}
  return false;
}

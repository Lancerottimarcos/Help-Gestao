import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (err) {
  console.warn('Erro ao inicializar Firebase app no navegador:', err);
}

export { app };

let _firestoreClientInstance: any = null;
let _firestoreInitAttempted = false;

export function getFirestoreClientSafe(): any {
  if (_firestoreClientInstance) return _firestoreClientInstance;
  if (_firestoreInitAttempted) return null;
  _firestoreInitAttempted = true;
  try {
    if (!app) return null;
    const dbId = (firebaseConfig as any)?.firestoreDatabaseId;
    _firestoreClientInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
    return _firestoreClientInstance;
  } catch (err) {
    try {
      if (app) {
        _firestoreClientInstance = getFirestore(app);
        return _firestoreClientInstance;
      }
    } catch {}
    console.warn('Google Cloud Firestore client SDK não está disponível no bundle do navegador, usando REST/API:', err);
    return null;
  }
}

// Proxy seguro para evitar crashes se módulos legados acessarem firestoreClient diretamente
export const firestoreClient: any = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getFirestoreClientSafe();
    if (!instance) return undefined;
    const val = instance[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

function parseFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = parseFirestoreRestValue(v);
    }
    return obj;
  }
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map((v: any) => parseFirestoreRestValue(v));
  }
  return val;
}

export async function fetchFirestoreData(collectionName = 'agency_data', docId = 'main_state'): Promise<any | null> {
  // 1. Tenta buscar da API do servidor central (persistência local + nuvem)
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      const res = await fetch('/api/database');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && typeof json.data === 'object' && Object.keys(json.data).length > 0) {
          return json.data;
        }
      }
    }
  } catch {}

  // 2. Fallback de alta disponibilidade via Firestore REST API (sem dependência de chunks do SDK no navegador)
  try {
    const config = firebaseConfig as any;
    if (config.projectId && config.apiKey) {
      const dbId = config.firestoreDatabaseId || '(default)';
      const restUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents/${collectionName}/${docId}?key=${config.apiKey}`;
      const res = await Promise.race([
        fetch(restUrl),
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout REST Firestore')), 4500)),
      ]);
      if (res.ok) {
        const raw = await res.json();
        if (raw && raw.fields) {
          const parsed: Record<string, any> = {};
          for (const [k, v] of Object.entries(raw.fields)) {
            parsed[k] = parseFirestoreRestValue(v);
          }
          if (Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar Firestore via REST API:', err);
  }

  // 3. Fallback adicional via SDK do Firestore (se inicializado com sucesso)
  try {
    const db = getFirestoreClientSafe();
    if (db) {
      const docRef = doc(db, collectionName, docId);
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout Firestore SDK')), 4000)),
      ]);
      if (snap && snap.exists()) {
        return snap.data();
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar Firestore diretamente via SDK:', err);
  }

  return null;
}

export async function saveFirestoreData(data: Record<string, any>, collectionName = 'agency_data', docId = 'main_state'): Promise<boolean> {
  // 1. Gravação via /api/database (persiste em disco e sincroniza na nuvem)
  let apiSuccess = false;
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, updatedAt: Date.now() }),
      });
      apiSuccess = res.ok;
    }
  } catch {}

  // 2. Garante persistência direta no Firestore em caso de falha da API
  if (!apiSuccess) {
    try {
      const db = getFirestoreClientSafe();
      if (db) {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
        return true;
      }
    } catch {}
  }

  return apiSuccess;
}

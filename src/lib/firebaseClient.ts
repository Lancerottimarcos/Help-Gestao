import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (err) {
  // Silent fallback
}

export { app };

// Client seguro sem gRPC streams para evitar quota exhaustion ou connection resets no navegador
export function getFirestoreClientSafe(): any {
  return null;
}

// Proxy de compatibilidade caso algum módulo legado chame métodos do firestoreClient
export const firestoreClient: any = new Proxy({} as any, {
  get(_target, _prop) {
    return undefined;
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

function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreRestValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function fetchFirestoreData(collectionName = 'agency_data', docId = 'main_state'): Promise<any | null> {
  // 1. Tenta buscar da API do servidor central (persistência local + nuvem com cache em disco)
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

  // 2. Fallback de alta disponibilidade via Firestore REST API (sem gRPC stream e sem limite de chunk)
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
  } catch {}

  return null;
}

export async function saveFirestoreData(data: Record<string, any>, collectionName = 'agency_data', docId = 'main_state'): Promise<boolean> {
  // 1. Gravação primária via /api/database (persiste em disco e sincroniza na nuvem com debounce)
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

  if (apiSuccess) return true;

  // 2. Fallback direto via REST API caso o servidor backend esteja inacessível
  try {
    const config = firebaseConfig as any;
    if (config.projectId && config.apiKey) {
      const dbId = config.firestoreDatabaseId || '(default)';
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) fields[k] = toFirestoreRestValue(v);
      }
      fields.updatedAt = toFirestoreRestValue(Date.now());

      const restUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents/${collectionName}/${docId}?key=${config.apiKey}`;
      const res = await fetch(restUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      return res.ok;
    }
  } catch {}

  return false;
}

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
function isValidCnpj(cnpj: string): boolean {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (!clean || clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) sum1 += parseInt(clean[i], 10) * weights1[i];
  const mod1 = sum1 % 11;
  const d1 = mod1 < 2 ? 0 : 11 - mod1;
  if (parseInt(clean[12], 10) !== d1) return false;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) sum2 += parseInt(clean[i], 10) * weights2[i];
  const mod2 = sum2 % 11;
  const d2 = mod2 < 2 ? 0 : 11 - mod2;
  return parseInt(clean[13], 10) === d2;
}

const CONFIG_FILE = path.join(process.cwd(), "supabase-config.json");
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const CHAT_FILE = path.join(DATA_DIR, "chat-messages.json");
const FIREBASE_CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
const FIRESTORE_QUOTA_FILE = path.join(DATA_DIR, ".firestore-quota.json");

let fbConfig: any = null;
if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
  try {
    fbConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, "utf-8"));
    console.log("[Firestore REST] Configuração carregada com sucesso:", fbConfig.firestoreDatabaseId || fbConfig.projectId);
  } catch (err) {
    console.warn("[Firestore REST] Aviso ao ler firebase-applet-config.json:", err);
  }
}

// REST API Helpers para conversão de tipos do Google Cloud Firestore
function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreRestValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreRestValue(val: any): any {
  if (!val || typeof val !== "object") return val;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("mapValue" in val) {
    const fields = val.mapValue?.fields || {};
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreRestValue(v);
    }
    return obj;
  }
  if ("arrayValue" in val) {
    const values = val.arrayValue?.values || [];
    return values.map(fromFirestoreRestValue);
  }
  return val;
}

// Leitura atômica via REST sem gRPC streams para evitar crashes ou erros de conexão
async function fetchFirestoreDocumentRest(collectionName = "agency_data", docId = "main_state"): Promise<any | null> {
  if (!fbConfig || !fbConfig.projectId || !fbConfig.apiKey) return null;
  const dbId = fbConfig.firestoreDatabaseId || "(default)";
  const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/${dbId}/documents/${collectionName}/${docId}?key=${fbConfig.apiKey}`;
  try {
    const res = await Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("Timeout REST")), 4000)),
    ]);
    if (!res.ok) return null;
    const json: any = await res.json();
    if (json && json.fields) {
      const parsed: Record<string, any> = {};
      for (const [k, v] of Object.entries(json.fields)) {
        parsed[k] = fromFirestoreRestValue(v);
      }
      return parsed;
    }
  } catch {}
  return null;
}

// Sincronização inteligente com debounce e sincronização imediata para operações críticas
let firestoreSyncTimeout: NodeJS.Timeout | null = null;
let pendingFirestoreUpdates: Record<string, any> = {};
let firestoreQuotaCooldownUntil = 0;
if (fs.existsSync(FIRESTORE_QUOTA_FILE)) {
  try {
    const raw = fs.readFileSync(FIRESTORE_QUOTA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.cooldownUntil === "number" && Date.now() < parsed.cooldownUntil) {
      firestoreQuotaCooldownUntil = parsed.cooldownUntil;
      console.log(`[Firestore REST] ℹ️ Cooldown de cota ativo até ${new Date(firestoreQuotaCooldownUntil).toISOString()}. Operando com banco de dados primário em disco.`);
    }
  } catch {}
}

async function syncToFirestoreImmediately(payload: Record<string, any>): Promise<boolean> {
  if (!fbConfig || !fbConfig.projectId || !fbConfig.apiKey) return false;
  if (Date.now() < firestoreQuotaCooldownUntil) return false;

  try {
    const dbId = fbConfig.firestoreDatabaseId || "(default)";
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) fields[k] = toFirestoreRestValue(v);
    }
    fields.updatedAt = toFirestoreRestValue(Date.now());

    const fieldKeys = Object.keys(fields);
    const updateMaskParams = fieldKeys
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/${dbId}/documents/agency_data/main_state?key=${fbConfig.apiKey}&${updateMaskParams}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (res.ok) {
      console.log(`[Firestore REST] ✅ Sincronização imediata concluída: ${fieldKeys.join(", ")}`);
      return true;
    } else {
      const errorJson: any = await res.json().catch(() => null);
      const errMsg = JSON.stringify(errorJson || {});
      if (
        res.status === 429 ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("Quota limit exceeded") ||
        errMsg.includes("Quota")
      ) {
        // Pausa tentativas no Firestore por 12 horas, operando 100% com o banco local resiliente
        firestoreQuotaCooldownUntil = Date.now() + 12 * 60 * 60 * 1000;
        try {
          fs.writeFileSync(FIRESTORE_QUOTA_FILE, JSON.stringify({ cooldownUntil: firestoreQuotaCooldownUntil }), "utf-8");
        } catch {}
        console.log(`[Firestore REST] ℹ️ Limite de cota diária gratuita do Firestore atingido (${res.status}). Persistência ativa via banco local em disco com zero perda de dados.`);
      } else {
        console.warn(`[Firestore REST] Aviso ao sincronizar (${res.status}):`, errMsg);
      }
      return false;
    }
  } catch (err: any) {
    console.warn("[Firestore REST] Aviso de rede ao sincronizar imediatamente:", err?.message || err);
    return false;
  }
}

function sanitizeDemandsForFirestore(demands: any[]): any[] {
  if (!Array.isArray(demands)) return [];
  return demands.map((d: any) => {
    if (!d || typeof d !== "object") return d;
    const cleanDemand = { ...d };
    if (typeof cleanDemand.thumbnail === "string" && cleanDemand.thumbnail.startsWith("data:image/") && cleanDemand.thumbnail.length > 50000) {
      const savedUrl = saveBase64Image(cleanDemand.thumbnail, `thumb-${cleanDemand.id || Date.now()}`);
      if (savedUrl) cleanDemand.thumbnail = savedUrl;
    }
    if (Array.isArray(cleanDemand.attachments)) {
      cleanDemand.attachments = cleanDemand.attachments.map((att: any) => {
        if (att && typeof att.url === "string" && att.url.startsWith("data:image/") && att.url.length > 50000) {
          const savedUrl = saveBase64Image(att.url, `att-${att.id || Date.now()}`);
          return { ...att, url: savedUrl || att.url };
        }
        return att;
      });
    }
    return cleanDemand;
  });
}

function scheduleSyncToFirestore(payload: Record<string, any>) {
  if (!fbConfig || !fbConfig.projectId || !fbConfig.apiKey) return;
  if (Date.now() < firestoreQuotaCooldownUntil) return;

  const sanitized = { ...payload };
  if (Array.isArray(sanitized.demands)) {
    sanitized.demands = sanitizeDemandsForFirestore(sanitized.demands);
  }

  pendingFirestoreUpdates = { ...pendingFirestoreUpdates, ...sanitized };

  if (firestoreSyncTimeout) {
    clearTimeout(firestoreSyncTimeout);
  }

  firestoreSyncTimeout = setTimeout(async () => {
    firestoreSyncTimeout = null;
    const updatesToSend = { ...pendingFirestoreUpdates };
    pendingFirestoreUpdates = {};

    try {
      await syncToFirestoreImmediately(updatesToSend);
    } catch {}
  }, 1000);
}

// Garante que o diretório de dados exista
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Erro ao criar pasta data:", err);
  }
}

// Diretórios para uploads de fotos de perfil e mídias estáticas
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const FALLBACK_UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DIST_UPLOADS_DIR = path.join(process.cwd(), "dist", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(FALLBACK_UPLOADS_DIR)) {
  try { fs.mkdirSync(FALLBACK_UPLOADS_DIR, { recursive: true }); } catch {}
}
if (!fs.existsSync(DIST_UPLOADS_DIR)) {
  try { fs.mkdirSync(DIST_UPLOADS_DIR, { recursive: true }); } catch {}
}

function saveBase64Image(dataUriOrBase64: string, prefix = "avatar"): string | null {
  if (!dataUriOrBase64 || typeof dataUriOrBase64 !== "string") return null;
  const match = dataUriOrBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) return null;

  let ext = match[1].toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  if (ext === "svg+xml") ext = "svg";
  const base64Data = match[2];
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    const fallbackPath = path.join(FALLBACK_UPLOADS_DIR, filename);
    const distPath = path.join(DIST_UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);
    try { fs.writeFileSync(fallbackPath, buffer); } catch {}
    try { fs.writeFileSync(distPath, buffer); } catch {}
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Erro ao salvar imagem localmente:", err);
    return null;
  }
}

function isCustomAvatar(avatar?: string): boolean {
  if (!avatar || typeof avatar !== "string") return false;
  const trimmed = avatar.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("/uploads/")) {
    const filename = path.basename(trimmed);
    for (const dir of [UPLOADS_DIR, FALLBACK_UPLOADS_DIR, DIST_UPLOADS_DIR]) {
      if (fs.existsSync(path.join(dir, filename))) return true;
    }
    return false;
  }
  if (trimmed.includes("photo-1534528741775")) return false; // Stock placeholder
  return true;
}

function sanitizeTeamMembersList(members: any[]): any[] {
  if (!Array.isArray(members)) return [];
  return members.map((m) => {
    if (!m) return m;
    if (typeof m.avatar === "string" && m.avatar.startsWith("/uploads/")) {
      const filename = path.basename(m.avatar);
      const exists = [UPLOADS_DIR, FALLBACK_UPLOADS_DIR, DIST_UPLOADS_DIR].some((dir) =>
        fs.existsSync(path.join(dir, filename))
      );
      if (!exists) {
        return {
          ...m,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
        };
      }
    }
    return m;
  });
}

function isOwnerOrMarcos(member?: any): boolean {
  if (!member) return false;
  const name = String(member.name || "").toLowerCase();
  const email = String(member.email || "").toLowerCase();
  const username = String(member.username || "").toLowerCase().replace(/^@/, "");
  return (
    member.id === "tm-1" ||
    (name.includes("marcos") && name.includes("lancerotti")) ||
    email === "lancerottirmarcos@gmail.com" ||
    username === "lancerotti"
  );
}

const DEFAULT_OWNER_MEMBER = {
  id: "tm-1",
  name: "Marcos Lancerotti",
  role: "CEO & Diretor Criativo",
  functionRole: "CEO",
  email: "lancerottirmarcos@gmail.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
  activeTasks: 0,
  status: "Disponível",
  specialties: ["Direção Executiva", "Liderança", "Visão Estratégica"],
  username: "lancerotti",
  password: "521Spide#*",
  permissions: {
    clientes: true,
    servicos: true,
    financeiro: true,
    orcamentos: true,
    equipe: true,
    configuracoes: true,
    inicio: true,
    demandas: true,
    calendario: true,
    agenda: true,
    aprovacoes: true,
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  let broadcast = (_data: any, _excludeWs?: WebSocket) => {};

  app.use(express.json({ limit: "25mb" }));

  // Serve arquivos estáticos de upload em todos os diretórios com headers CORS e Cache
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    next();
  }, express.static(UPLOADS_DIR));
  app.use("/uploads", express.static(FALLBACK_UPLOADS_DIR));
  app.use("/uploads", express.static(DIST_UPLOADS_DIR));

  // Rota direta de entrega de imagens em /uploads/:filename
  app.get("/uploads/:filename", (req, res, next) => {
    const filename = path.basename(req.params.filename);
    for (const dir of [UPLOADS_DIR, FALLBACK_UPLOADS_DIR, DIST_UPLOADS_DIR]) {
      const p = path.join(dir, filename);
      if (fs.existsSync(p)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(p);
      }
    }
    next();
  });

  // ==================================================================
  // MIDDLEWARE DE CABEÇALHOS DE SEGURANÇA (OWASP Compliant)
  // ==================================================================
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // ==================================================================
  // ROTAS DE API (Executadas antes de qualquer middleware de frontend)
  // ==================================================================

  // Headers de controle de cache para rotas de API
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Supabase Config (compartilha chaves entre todos os computadores)
  app.get("/api/supabase-config", (_req, res) => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.url && !parsed.url.includes("pniiwmpxtvckivufrqhn") && !parsed.url.includes("your-project")) {
          return res.json(parsed);
        }
      }
    } catch (e) {
      console.error("Erro ao ler supabase-config.json:", e);
    }

    // Nenhuma credencial Supabase externa configurada
    res.json({
      url: "",
      anonKey: "",
    });
  });

  app.post("/api/supabase-config", (req, res) => {
    try {
      const { url, anonKey } = req.body || {};

      // Validação estrita de segurança da URL
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, error: "A URL do Supabase é obrigatória." });
      }

      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith("https://") && !cleanUrl.startsWith("http://localhost")) {
        return res.status(400).json({ success: false, error: "A URL deve iniciar obrigatoriamente com https:// ou http://localhost" });
      }

      if (cleanUrl.length > 500) {
        return res.status(400).json({ success: false, error: "URL excede o limite máximo permitido." });
      }

      // Validação da Chave Anônima
      if (!anonKey || typeof anonKey !== "string") {
        return res.status(400).json({ success: false, error: "A chave anônima do Supabase é obrigatória." });
      }

      const cleanKey = anonKey.trim();
      if (cleanKey.length < 20 || cleanKey.length > 2500) {
        return res.status(400).json({ success: false, error: "Tamanho de chave de autenticação inválido." });
      }

      const data = {
        url: cleanUrl,
        anonKey: cleanKey,
        updatedAt: new Date().toISOString(),
      };

      // Gravação segura no arquivo de configuração
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), "utf-8");
      res.json({ success: true });
    } catch (e: any) {
      console.error("Erro ao salvar supabase-config.json:", e);
      res.status(500).json({ success: false, error: "Falha interna ao persistir configuração." });
    }
  });

  // In-Memory Database Cache & State Manager (protege contra race-conditions e garante persistência atômica)
  let inMemoryDatabaseState: any = null;

  async function syncToFirestore(payload: Record<string, any>) {
    scheduleSyncToFirestore(payload);
  }

  function getDatabaseState(): any {
    if (inMemoryDatabaseState !== null) return inMemoryDatabaseState;
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        inMemoryDatabaseState = JSON.parse(raw);
        return inMemoryDatabaseState;
      } catch (e: any) {
        console.error("Erro ao ler data/database.json:", e);
      }
    }
    inMemoryDatabaseState = {};
    return inMemoryDatabaseState;
  }

  function persistDatabaseState(state: any) {
    inMemoryDatabaseState = state;
    try {
      // Gravação atômica segura via arquivo temporário
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), "utf-8");
      fs.renameSync(tempFile, DB_FILE);
    } catch {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
      } catch (e) {
        console.error("Erro fatal ao salvar data/database.json:", e);
      }
    }
  }

  // Fila atômica serializada para todas as mutações no banco de dados (elimina condições de corrida)
  let dbOperationChain: Promise<any> = Promise.resolve();
  function runDbOperation<T>(op: () => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      dbOperationChain = dbOperationChain.then(async () => {
        try {
          const result = await op();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function mergeDatabaseStates(local: any, remote: any): any {
    if (!remote || typeof remote !== "object") return local || {};
    if (!local || typeof local !== "object") return remote || {};

    const merged = { ...local };
    const collections = [
      "clients",
      "demands",
      "services",
      "proposals",
      "invoices",
      "activities",
      "teamMembers",
      "kanbanColumns",
      "deletedDemandIds",
    ];

    const deletedDemandIds = new Set([
      ...(Array.isArray(local.deletedDemandIds) ? local.deletedDemandIds : []),
      ...(Array.isArray(remote.deletedDemandIds) ? remote.deletedDemandIds : []),
    ]);
    merged.deletedDemandIds = Array.from(deletedDemandIds);

    for (const col of collections) {
      if (col === "deletedDemandIds") continue;
      const localList = Array.isArray(local[col]) ? local[col] : [];
      const remoteList = Array.isArray(remote[col]) ? remote[col] : [];

      if (col === "demands") {
        const cleanLocal = localList.filter((d: any) => d && d.id && !deletedDemandIds.has(d.id));
        const cleanRemote = remoteList.filter((d: any) => d && d.id && !deletedDemandIds.has(d.id));
        const localMap = new Map(cleanLocal.map((item: any) => [item.id, item]));
        const remoteMap = new Map(cleanRemote.map((item: any) => [item.id, item]));

        // Mescla demandas: preserva todas as propriedades locais e remotas
        const mergedDemands = cleanRemote.map((rd: any) => {
          const ld = localMap.get(rd.id);
          if (!ld) return rd;
          return { ...rd, ...ld };
        });
        const localOnly = cleanLocal.filter((item: any) => !remoteMap.has(item.id));
        merged[col] = [...localOnly, ...mergedDemands];
      } else if (col === "teamMembers") {
        if (remoteList.length > 0 && localList.length === 0) {
          merged[col] = remoteList;
        } else if (localList.length > 0 && remoteList.length === 0) {
          merged[col] = localList;
        } else if (localList.length > 0 && remoteList.length > 0) {
          const remoteMap = new Map(remoteList.map((item: any) => [item.id, item]));
          // Mescla cada membro preservando fotos customizadas
          const mergedMembers = remoteList.map((rm: any) => {
            const lm = localList.find((l: any) => l.id === rm.id || (isOwnerOrMarcos(l) && isOwnerOrMarcos(rm)));
            if (!lm) return rm;
            const isLocalCustom = isCustomAvatar(lm.avatar);
            const isRemoteCustom = isCustomAvatar(rm.avatar);
            const finalAvatar = isRemoteCustom ? rm.avatar : (isLocalCustom ? lm.avatar : (rm.avatar || lm.avatar || ""));
            return {
              ...lm,
              ...rm,
              avatar: finalAvatar,
              permissions: rm.permissions || lm.permissions,
              specialties: Array.isArray(rm.specialties) && rm.specialties.length > 0 ? rm.specialties : lm.specialties,
            };
          });
          const localOnly = localList.filter((item: any) => !remoteMap.has(item.id) && !remoteList.some((rm: any) => isOwnerOrMarcos(rm) && isOwnerOrMarcos(item)));
          merged[col] = [...mergedMembers, ...localOnly];
        } else {
          merged[col] = [DEFAULT_OWNER_MEMBER];
        }
      } else if (remoteList.length > 0 && localList.length === 0) {
        merged[col] = remoteList;
      } else if (localList.length > 0 && remoteList.length === 0) {
        merged[col] = localList;
      } else if (localList.length > 0 && remoteList.length > 0) {
        // Merge por ID preservando todos os registros sem exclusão acidental ou downgrade
        const localMap = new Map(localList.map((item: any) => [item.id, item]));
        const mergedItems = remoteList.map((remoteItem: any) => {
          const localItem = localMap.get(remoteItem.id);
          if (!localItem) return remoteItem;
          return { ...remoteItem, ...localItem };
        });
        const remoteIds = new Set(remoteList.map((item: any) => item.id));
        const localOnly = localList.filter((item: any) => !remoteIds.has(item.id));
        merged[col] = [...mergedItems, ...localOnly];
      } else {
        merged[col] = [];
      }
    }

    // Preserva configurações e hashes
    for (const key of Object.keys(remote)) {
      if (!collections.includes(key) && remote[key] !== undefined && remote[key] !== null) {
        if (merged[key] === undefined || merged[key] === null) {
          merged[key] = remote[key];
        }
      }
    }

    merged.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0, Date.now());
    return merged;
  }

  async function initDatabaseState() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          inMemoryDatabaseState = parsed;
          console.log("[Database Server] Carregado de data/database.json com sucesso:", Object.keys(parsed));
        }
      } catch (e) {
        console.error("[Database Server] Erro ao carregar data/database.json no startup:", e);
      }
    }

    // Apenas se a base local estiver ausente/vazia, busca recuperação inicial do Firestore
    const isLocalEmpty = !inMemoryDatabaseState || Object.keys(inMemoryDatabaseState).length === 0;
    if (isLocalEmpty && Date.now() >= firestoreQuotaCooldownUntil) {
      try {
        console.log("[Database Server] Banco local ausente. Hidratando do Firestore REST...");
        const remote = await fetchFirestoreDocumentRest("agency_data", "main_state");
        if (remote) {
          inMemoryDatabaseState = remote;
          persistDatabaseState(inMemoryDatabaseState);
        }
      } catch (err) {
        console.warn("[Database Server] Aviso ao sincronizar do Firestore no startup:", err);
      }
    }

    // Garante que a equipe nunca fique vazia (inicializa com o Dono Marcos Lancerotti)
    if (!Array.isArray(inMemoryDatabaseState?.teamMembers) || inMemoryDatabaseState.teamMembers.length === 0) {
      inMemoryDatabaseState.teamMembers = [DEFAULT_OWNER_MEMBER];
      persistDatabaseState(inMemoryDatabaseState);
      scheduleSyncToFirestore({ teamMembers: inMemoryDatabaseState.teamMembers });
      console.log("[Database Server] Equipe inicializada com o Dono da Agência (Marcos Lancerotti).");
    }

    if (!inMemoryDatabaseState) {
      inMemoryDatabaseState = {};
    }
  }

  // Central Database (compartilha clientes, demandas, equipe e finanças entre todos os computadores via Cache em disco + Firestore)
  app.get("/api/database", async (_req, res) => {
    let data = getDatabaseState();
    const hasTeamMembers = Array.isArray(data.teamMembers) && data.teamMembers.length > 0;

    // Se equipe estiver vazia na memória, tenta carregar do Firestore sob demanda
    if (!hasTeamMembers) {
      try {
        const remote = await fetchFirestoreDocumentRest("agency_data", "main_state");
        if (remote) {
          data = mergeDatabaseStates(data, remote);
          persistDatabaseState(data);
        }
      } catch {}
    }
    if (Array.isArray(data.teamMembers)) {
      data = { ...data, teamMembers: sanitizeTeamMembersList(data.teamMembers) };
    }
    return res.json({
      success: true,
      data,
      timestamp: Date.now(),
    });
  });

  // Limpeza total de dados para lançamento oficial da agência
  app.post("/api/clean-launch", async (_req, res) => {
    return runDbOperation(async () => {
      try {
        const current = getDatabaseState();
        const updated = {
          ...current,
          clients: [],
          demands: [],
          services: [],
          proposals: [],
          invoices: [],
          activities: [],
          deletedDemandIds: [],
          deletedClientIds: [],
          deletedServiceIds: [],
          deletedTeamMemberIds: [],
          kanbanColumns: [
            { id: "ideias", title: "Ideias & Briefing", count: 0, color: "text-amber-500", buttonBg: "bg-amber-50 dark:bg-amber-950/40" },
            { id: "producao", title: "Em Produção", count: 0, color: "text-blue-500", buttonBg: "bg-blue-50 dark:bg-blue-950/40" },
            { id: "aprovacao", title: "Aprovação cliente", count: 0, color: "text-amber-600", buttonBg: "bg-amber-50 dark:bg-amber-950/40" },
            { id: "agendamento", title: "Agendamento", count: 0, color: "text-purple-500", buttonBg: "bg-purple-50 dark:bg-purple-950/40" },
            { id: "concluidas", title: "Concluídas", count: 0, color: "text-emerald-500", buttonBg: "bg-emerald-50 dark:bg-emerald-950/40" }
          ],
          teamMembers: [DEFAULT_OWNER_MEMBER],
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({
          clients: [],
          demands: [],
          services: [],
          proposals: [],
          invoices: [],
          activities: [],
          deletedDemandIds: [],
          deletedClientIds: [],
          deletedServiceIds: [],
          deletedTeamMemberIds: [],
          teamMembers: [DEFAULT_OWNER_MEMBER],
        });
        try {
          broadcast({
            type: "clean_launch",
            data: updated,
            demands: [],
            clients: [],
            services: [],
            proposals: [],
            invoices: [],
            activities: [],
            teamMembers: updated.teamMembers,
          });
          broadcast({
            type: "database:update",
            data: updated,
            demands: [],
            clients: [],
            services: [],
            proposals: [],
            invoices: [],
            activities: [],
            teamMembers: updated.teamMembers,
          });
          broadcast({ type: "demands:update", demands: [] });
          broadcast({ type: "clients:update", clients: [] });
          broadcast({ type: "services:update", services: [] });
          broadcast({ type: "team_members:update", teamMembers: updated.teamMembers });
        } catch {}
        console.log("[Database Server] Sistema limpo com sucesso para o lançamento oficial.");
        return res.json({ success: true, message: "Sistema limpo com sucesso para o lançamento oficial." });
      } catch (e: any) {
        console.error("Erro ao executar clean-launch:", e);
        return res.status(500).json({ success: false, error: "Erro ao limpar dados do sistema." });
      }
    });
  });

  app.post("/api/database", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return res.status(400).json({ success: false, error: "Payload inválido. Objeto esperado." });
        }

        // Whitelist de campos permitidos na base central para evitar injeção de lixo ou dados espúrios
        const ALLOWED_COLLECTIONS = [
          "clients",
          "demands",
          "services",
          "proposals",
          "invoices",
          "activities",
          "teamMembers",
          "kanbanColumns",
          "deletedDemandIds",
          "deletedClientIds",
          "deletedServiceIds",
          "deletedTeamMemberIds",
          "updatedAt",
          "masterPasswordHash",
          "securityConfig",
          "newMemberDefaultPermissions",
          "collaboratorRules",
        ];

        // Mescla com os dados em memória existentes (imutável e livre de corrida de I/O)
        const currentData = getDatabaseState();
        const isExplicitClear = Boolean(body.allowEmpty || body.cleanLaunch || body.forceEmpty);

        const sanitizedUpdate: Record<string, any> = {};
        for (const key of Object.keys(body)) {
          if (ALLOWED_COLLECTIONS.includes(key) && body[key] !== undefined && body[key] !== null) {
            // Proteção atômica: Impede que um dispositivo recém-aberto com lista vazia sobrescreva dados cadastrados no banco acidentalmente
            if (
              !isExplicitClear &&
              (key === "demands" || key === "clients" || key === "teamMembers" || key === "services") &&
              Array.isArray(body[key]) &&
              body[key].length === 0 &&
              Array.isArray(currentData[key]) &&
              currentData[key].length > 0
            ) {
              console.warn(`[Database Server] Proteção ativa: Prevenindo sobrescrita acidental de ${key} (${currentData[key].length} itens) com array vazio.`);
              continue;
            }
            sanitizedUpdate[key] = body[key];
          }
        }

        // Mescla rastreadores de exclusão
        if (Array.isArray(body.deletedDemandIds)) {
          const existingDeleted = new Set(Array.isArray(currentData.deletedDemandIds) ? currentData.deletedDemandIds : []);
          body.deletedDemandIds.forEach((id: string) => existingDeleted.add(id));
          sanitizedUpdate.deletedDemandIds = Array.from(existingDeleted);
        }
        if (Array.isArray(body.deletedClientIds)) {
          const existingDeleted = new Set(Array.isArray(currentData.deletedClientIds) ? currentData.deletedClientIds : []);
          body.deletedClientIds.forEach((id: string) => existingDeleted.add(id));
          sanitizedUpdate.deletedClientIds = Array.from(existingDeleted);
        }
        if (Array.isArray(body.deletedServiceIds)) {
          const existingDeleted = new Set(Array.isArray(currentData.deletedServiceIds) ? currentData.deletedServiceIds : []);
          body.deletedServiceIds.forEach((id: string) => existingDeleted.add(id));
          sanitizedUpdate.deletedServiceIds = Array.from(existingDeleted);
        }
        if (Array.isArray(body.deletedTeamMemberIds)) {
          const existingDeleted = new Set(Array.isArray(currentData.deletedTeamMemberIds) ? currentData.deletedTeamMemberIds : []);
          body.deletedTeamMemberIds.forEach((id: string) => existingDeleted.add(id));
          sanitizedUpdate.deletedTeamMemberIds = Array.from(existingDeleted);
        }

        // Preserva e mescla demandas para evitar desaparecimento por concorrência ou sincronização
        if (Array.isArray(sanitizedUpdate.demands)) {
          if (sanitizedUpdate.demands.length === 0 && isExplicitClear) {
            sanitizedUpdate.demands = [];
          } else {
            const deletedIds = new Set([
              ...(Array.isArray(currentData.deletedDemandIds) ? currentData.deletedDemandIds : []),
              ...(Array.isArray(sanitizedUpdate.deletedDemandIds) ? sanitizedUpdate.deletedDemandIds : []),
            ]);

            // Assegura que demandas ativas enviadas não sejam filtradas por engano
            sanitizedUpdate.demands.forEach((d: any) => {
              if (d && d.id && (!Array.isArray(sanitizedUpdate.deletedDemandIds) || !sanitizedUpdate.deletedDemandIds.includes(d.id))) {
                deletedIds.delete(d.id);
              }
            });
            sanitizedUpdate.deletedDemandIds = Array.from(deletedIds);

            const currentDemands = (Array.isArray(currentData.demands) ? currentData.demands : [])
              .filter((d: any) => d && d.id && !deletedIds.has(d.id));
            const incomingDemands = sanitizedUpdate.demands
              .filter((d: any) => d && d.id && !deletedIds.has(d.id));

            const incomingIds = new Set(incomingDemands.map((d: any) => d.id));
            const missingCurrent = currentDemands.filter((d: any) => d && d.id && !incomingIds.has(d.id) && !deletedIds.has(d.id));

            sanitizedUpdate.demands = [...incomingDemands, ...missingCurrent];
          }
        }

        // Preserva e mescla clientes para evitar desaparecimento por concorrência ou sincronização
        if (Array.isArray(sanitizedUpdate.clients)) {
          if (sanitizedUpdate.clients.length === 0 && isExplicitClear) {
            sanitizedUpdate.clients = [];
          } else {
            const deletedIds = new Set([
              ...(Array.isArray(currentData.deletedClientIds) ? currentData.deletedClientIds : []),
              ...(Array.isArray(sanitizedUpdate.deletedClientIds) ? sanitizedUpdate.deletedClientIds : []),
            ]);

            sanitizedUpdate.clients.forEach((c: any) => {
              if (c && c.id && (!Array.isArray(sanitizedUpdate.deletedClientIds) || !sanitizedUpdate.deletedClientIds.includes(c.id))) {
                deletedIds.delete(c.id);
              }
            });
            sanitizedUpdate.deletedClientIds = Array.from(deletedIds);

            const currentClients = (Array.isArray(currentData.clients) ? currentData.clients : [])
              .filter((c: any) => c && c.id && !deletedIds.has(c.id));
            const incomingClients = sanitizedUpdate.clients
              .filter((c: any) => c && c.id && !deletedIds.has(c.id));

            const incomingIds = new Set(incomingClients.map((c: any) => c.id));
            const missingCurrent = currentClients.filter((c: any) => c && c.id && !incomingIds.has(c.id) && !deletedIds.has(c.id));

            sanitizedUpdate.clients = [...incomingClients, ...missingCurrent];
          }
        }

        // Preserva e mescla serviços
        if (Array.isArray(sanitizedUpdate.services)) {
          if (sanitizedUpdate.services.length === 0 && isExplicitClear) {
            sanitizedUpdate.services = [];
          } else {
            const deletedIds = new Set([
              ...(Array.isArray(currentData.deletedServiceIds) ? currentData.deletedServiceIds : []),
              ...(Array.isArray(sanitizedUpdate.deletedServiceIds) ? sanitizedUpdate.deletedServiceIds : []),
            ]);

            sanitizedUpdate.services.forEach((s: any) => {
              if (s && s.id && (!Array.isArray(sanitizedUpdate.deletedServiceIds) || !sanitizedUpdate.deletedServiceIds.includes(s.id))) {
                deletedIds.delete(s.id);
              }
            });
            sanitizedUpdate.deletedServiceIds = Array.from(deletedIds);

            const currentServices = (Array.isArray(currentData.services) ? currentData.services : [])
              .filter((s: any) => s && s.id && !deletedIds.has(s.id));
            const incomingServices = sanitizedUpdate.services
              .filter((s: any) => s && s.id && !deletedIds.has(s.id));

            const incomingIds = new Set(incomingServices.map((s: any) => s.id));
            const missingCurrent = currentServices.filter((s: any) => s && s.id && !incomingIds.has(s.id) && !deletedIds.has(s.id));

            sanitizedUpdate.services = [...incomingServices, ...missingCurrent];
          }
        }

        // Preserva fotos em base64 da equipe permanentemente (sem substituir por URLs locais efêmeras)
        if (Array.isArray(sanitizedUpdate.teamMembers)) {
          sanitizedUpdate.teamMembers = sanitizedUpdate.teamMembers.map((m: any) => {
            if (m && typeof m.avatar === "string" && m.avatar.startsWith("data:image/")) {
              saveBase64Image(m.avatar, `member-${m.id || "avatar"}`);
            }
            return m;
          });
        }

        // Preserva fotos em base64 de clientes permanentemente
        if (Array.isArray(sanitizedUpdate.clients)) {
          sanitizedUpdate.clients = sanitizedUpdate.clients.map((c: any) => {
            if (c && typeof c.avatar === "string" && c.avatar.startsWith("data:image/")) {
              saveBase64Image(c.avatar, `client-${c.id || "avatar"}`);
            }
            return c;
          });
        }

        const merged = {
          ...currentData,
          ...sanitizedUpdate,
          updatedAt: Date.now(),
        };

        // 1. Grava no cache de arquivo local (primário, resiliente e sem limites de cota)
        persistDatabaseState(merged);

        // 2. Grava de forma secundária no Google Cloud Firestore com debounce inteligente
        scheduleSyncToFirestore(sanitizedUpdate);

        // 3. Notifica todos os computadores e celulares conectados via WebSocket
        try {
          broadcast({
            type: "database:update",
            data: merged,
            demands: merged.demands,
            clients: merged.clients,
            services: merged.services,
            teamMembers: merged.teamMembers,
          });
          if (sanitizedUpdate.demands) {
            broadcast({ type: "demands:update", demands: merged.demands });
          }
          if (sanitizedUpdate.clients) {
            broadcast({ type: "clients:update", clients: merged.clients });
          }
          if (sanitizedUpdate.services) {
            broadcast({ type: "services:update", services: merged.services });
          }
          if (sanitizedUpdate.teamMembers) {
            broadcast({ type: "team_members:update", teamMembers: merged.teamMembers });
          }
        } catch {}

        res.json({ success: true, timestamp: Date.now() });
      } catch (e: any) {
        console.error("Erro ao salvar data/database.json:", e);
        res.status(500).json({ success: false, error: "Erro ao persistir dados no banco central." });
      }
    });
  });

  // Upload dedicado de foto de perfil / avatar com salvamento físico permanente
  app.post("/api/upload-avatar", (req, res) => {
    try {
      const { image, memberId } = req.body || {};
      if (!image || typeof image !== "string") {
        return res.status(400).json({ success: false, error: "Nenhuma imagem fornecida." });
      }
      if (image.startsWith("data:image/")) {
        const url = saveBase64Image(image, `member-${memberId || "avatar"}`);
        if (url) {
          return res.json({ success: true, url });
        }
        return res.status(500).json({ success: false, error: "Falha ao gravar arquivo de imagem." });
      }
      return res.json({ success: true, url: image });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Erro no upload de foto" });
    }
  });

  // Endpoints dedicados para Equipe (Team Members)
  app.get("/api/team-members", async (_req, res) => {
    let db = getDatabaseState();
    let teamMembers = Array.isArray(db.teamMembers) ? sanitizeTeamMembersList(db.teamMembers) : [];
    if (teamMembers.length === 0) {
      try {
        const remote = await fetchFirestoreDocumentRest("agency_data", "main_state");
        if (remote && Array.isArray(remote.teamMembers) && remote.teamMembers.length > 0) {
          db = mergeDatabaseStates(db, remote);
          persistDatabaseState(db);
          teamMembers = sanitizeTeamMembersList(db.teamMembers);
        }
      } catch {}
    }
    if (teamMembers.length === 0) {
      teamMembers = [DEFAULT_OWNER_MEMBER];
      db.teamMembers = teamMembers;
      persistDatabaseState(db);
      scheduleSyncToFirestore({ teamMembers });
    }
    res.json({ success: true, data: teamMembers, count: teamMembers.length });
  });

  app.post("/api/team-members", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const { member, teamMembers } = req.body || {};
        const current = getDatabaseState();
        let currentTeam: any[] = Array.isArray(current.teamMembers) && current.teamMembers.length > 0
          ? [...current.teamMembers]
          : [DEFAULT_OWNER_MEMBER];

        let incoming: any[] = [];
        if (Array.isArray(teamMembers)) {
          incoming = teamMembers;
        } else if (member && member.id) {
          incoming = [member];
        } else if (Array.isArray(req.body)) {
          incoming = req.body;
        } else {
          return res.status(400).json({ success: false, error: "Colaborador ou lista inválida." });
        }

        // Preserva fotos em base64 com persistência permanente para qualquer dispositivo
        const processed = incoming.map((m: any) => {
          if (m && typeof m.avatar === "string" && m.avatar.startsWith("data:image/")) {
            saveBase64Image(m.avatar, `member-${m.id || "avatar"}`);
          }
          return m;
        });

        if (Array.isArray(teamMembers) || Array.isArray(req.body)) {
          currentTeam = processed;
        } else {
          const single = processed[0];
          const idx = currentTeam.findIndex((m: any) => m.id === single.id || (isOwnerOrMarcos(m) && isOwnerOrMarcos(single)));
          if (idx >= 0) {
            currentTeam[idx] = { ...currentTeam[idx], ...single };
          } else {
            currentTeam.push(single);
          }
        }

        const updated = {
          ...current,
          teamMembers: currentTeam,
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({ teamMembers: currentTeam });

        try {
          broadcast({ type: "team_members:update", teamMembers: currentTeam });
          broadcast({ type: "database:update", data: updated, teamMembers: currentTeam });
        } catch {}

        res.json({ success: true, data: currentTeam, count: currentTeam.length });
      } catch (e: any) {
        console.error("Erro ao salvar membro(s) da equipe:", e);
        res.status(500).json({ success: false, error: "Falha ao gravar colaborador." });
      }
    });
  });

  // Endpoints dedicados e otimizados para Demandas (Kanban)
  app.get("/api/demands", async (_req, res) => {
    const db = getDatabaseState();
    const demands = Array.isArray(db.demands) ? db.demands : [];
    res.json({ success: true, data: demands, count: demands.length });
  });

  app.post("/api/demands", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const { demand, demands, deletedDemandIds } = req.body || {};
        const current = getDatabaseState();
        let currentDemands: any[] = Array.isArray(current.demands) ? [...current.demands] : [];
        const currentDeletedIds = new Set(Array.isArray(current.deletedDemandIds) ? current.deletedDemandIds : []);
        if (Array.isArray(deletedDemandIds)) {
          deletedDemandIds.forEach((id: string) => currentDeletedIds.add(id));
        }

        const isExplicitClear = Boolean(req.body?.allowEmpty || req.body?.cleanLaunch || req.body?.forceEmpty);
        if (Array.isArray(demands)) {
          if (demands.length === 0 && isExplicitClear) {
            currentDemands = [];
          } else {
            // Assegura que as demandas ativas sendo gravadas não sejam descartadas por IDs deletados antigos
            demands.forEach((d: any) => {
              if (d && d.id && (!Array.isArray(deletedDemandIds) || !deletedDemandIds.includes(d.id))) {
                currentDeletedIds.delete(d.id);
              }
            });
            const cleanIncoming = demands.filter((d: any) => d && d.id && !currentDeletedIds.has(d.id));
            const incomingIds = new Set(cleanIncoming.map((d: any) => d.id));
            const missingCurrent = currentDemands.filter((d: any) => d && d.id && !incomingIds.has(d.id) && !currentDeletedIds.has(d.id));
            currentDemands = [...cleanIncoming, ...missingCurrent];
          }
        } else if (demand && demand.id) {
          currentDeletedIds.delete(demand.id);
          const idx = currentDemands.findIndex((d: any) => d.id === demand.id);
          if (idx >= 0) {
            currentDemands[idx] = demand;
          } else {
            currentDemands.unshift(demand);
          }
        } else {
          return res.status(400).json({ success: false, error: "Demanda ou lista de demandas inválida." });
        }

        const updated = {
          ...current,
          demands: currentDemands,
          deletedDemandIds: Array.from(currentDeletedIds),
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({ demands: currentDemands, deletedDemandIds: Array.from(currentDeletedIds) });

        // Notifica todos os dispositivos em tempo real
        try {
          broadcast({ type: "demands:update", demands: currentDemands });
          broadcast({ type: "database:update", data: updated, demands: currentDemands });
        } catch {}

        res.json({ success: true, count: currentDemands.length });
      } catch (e: any) {
        console.error("Erro ao salvar demanda(s):", e);
        res.status(500).json({ success: false, error: "Falha ao gravar demanda." });
      }
    });
  });

  app.delete("/api/demands/:id", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const demandId = req.params.id;
        const current = getDatabaseState();
        const currentDemands: any[] = Array.isArray(current.demands) ? current.demands : [];
        const updatedDemands = currentDemands.filter((d: any) => d.id !== demandId);
        const deletedIds = Array.isArray(current.deletedDemandIds) ? [...current.deletedDemandIds] : [];
        if (!deletedIds.includes(demandId)) deletedIds.push(demandId);

        const updated = {
          ...current,
          demands: updatedDemands,
          deletedDemandIds: deletedIds,
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({ demands: updatedDemands, deletedDemandIds: deletedIds });

        try {
          broadcast({ type: "demands:update", demands: updatedDemands });
          broadcast({ type: "database:update", data: updated, demands: updatedDemands });
        } catch {}

        res.json({ success: true, count: updatedDemands.length });
      } catch (e: any) {
        res.status(500).json({ success: false, error: "Falha ao excluir demanda." });
      }
    });
  });

  // Endpoints dedicados para Clientes
  app.get("/api/clients", (_req, res) => {
    const db = getDatabaseState();
    const clients = Array.isArray(db.clients) ? db.clients : [];
    res.json({ success: true, data: clients, count: clients.length });
  });

  app.post("/api/clients", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const { client, clients } = req.body || {};
        const current = getDatabaseState();
        let currentClients: any[] = Array.isArray(current.clients) ? [...current.clients] : [];

        if (Array.isArray(clients)) {
          currentClients = clients;
        } else if (client && client.id) {
          const idx = currentClients.findIndex((c: any) => c.id === client.id);
          if (idx >= 0) {
            currentClients[idx] = client;
          } else {
            currentClients.unshift(client);
          }
        } else {
          return res.status(400).json({ success: false, error: "Cliente ou lista inválida." });
        }

        const updated = {
          ...current,
          clients: currentClients,
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({ clients: currentClients });
        try {
          broadcast({ type: "clients:update", clients: currentClients });
          broadcast({ type: "database:update", data: updated, clients: currentClients });
        } catch {}
        res.json({ success: true, count: currentClients.length });
      } catch (e: any) {
        console.error("Erro ao salvar cliente(s):", e);
        res.status(500).json({ success: false, error: "Falha ao gravar cliente." });
      }
    });
  });

  // Endpoints dedicados para Serviços
  app.get("/api/services", (_req, res) => {
    const db = getDatabaseState();
    const services = Array.isArray(db.services) ? db.services : [];
    res.json({ success: true, data: services, count: services.length });
  });

  app.post("/api/services", async (req, res) => {
    return runDbOperation(async () => {
      try {
        const { service, services } = req.body || {};
        const current = getDatabaseState();
        let currentServices: any[] = Array.isArray(current.services) ? [...current.services] : [];

        if (Array.isArray(services)) {
          currentServices = services;
        } else if (service && service.id) {
          const idx = currentServices.findIndex((s: any) => s.id === service.id);
          if (idx >= 0) {
            currentServices[idx] = service;
          } else {
            currentServices.unshift(service);
          }
        } else {
          return res.status(400).json({ success: false, error: "Serviço ou lista inválida." });
        }

        const updated = {
          ...current,
          services: currentServices,
          updatedAt: Date.now(),
        };
        persistDatabaseState(updated);
        scheduleSyncToFirestore({ services: currentServices });
        try {
          broadcast({ type: "services:update", services: currentServices });
          broadcast({ type: "database:update", data: updated, services: currentServices });
        } catch {}
        res.json({ success: true, count: currentServices.length });
      } catch (e: any) {
        console.error("Erro ao salvar serviço(s):", e);
        res.status(500).json({ success: false, error: "Falha ao gravar serviço." });
      }
    });
  });

  // ==================================================================
  // ROTAS DE CONSULTA DE CNPJ (API Pública https://publica.cnpj.ws)
  // ==================================================================
  app.get("/api/cnpj/:cnpj", async (req, res) => {
    try {
      const rawCnpj = req.params.cnpj || "";
      const cleanCnpj = rawCnpj.replace(/\D/g, "");

      if (cleanCnpj.length !== 14) {
        return res.status(400).json({
          success: false,
          error: "CNPJ inválido. Digite os 14 dígitos numéricos.",
        });
      }

      if (!isValidCnpj(cleanCnpj)) {
        return res.status(400).json({
          success: false,
          error: "CNPJ inválido. Os dígitos verificadores não conferem com o cálculo oficial da Receita Federal.",
        });
      }

      // 1. Tenta a API publica.cnpj.ws solicitada pelo usuário
      try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`, {
          headers: {
            "User-Agent": "HelpIdeias/1.0",
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            success: true,
            source: "publica.cnpj.ws",
            data,
          });
        }

        if (response.status === 429) {
          console.warn("[CNPJ] publica.cnpj.ws rate limit (3 req/min) atingido. Usando fallback de alta disponibilidade.");
        }
      } catch (err: any) {
        console.warn("[CNPJ] Erro na requisição publica.cnpj.ws:", err.message);
      }

      // 2. Fallback de alta disponibilidade via BrasilAPI
      try {
        const fallbackRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (fallbackRes.ok) {
          const fb: any = await fallbackRes.json();
          return res.json({
            success: true,
            source: "brasilapi",
            data: {
              cnpj_raiz: cleanCnpj.substring(0, 8),
              razao_social: fb.razao_social,
              capital_social: String(fb.capital_social || "0"),
              porte: {
                id: fb.porte,
                descricao: fb.porte || "Não informado",
              },
              natureza_juridica: {
                codigo: fb.codigo_natureza_juridica,
                descricao: fb.natureza_juridica,
              },
              estabelecimento: {
                cnpj: cleanCnpj,
                nome_fantasia: fb.nome_fantasia || fb.razao_social,
                situacao_cadastral: fb.descricao_situacao_cadastral || "Ativa",
                data_situacao_cadastral: fb.data_situacao_cadastral || "",
                data_inicio_atividade: fb.data_inicio_atividade || "",
                tipo_logradouro: fb.descricao_tipo_de_logradouro || "",
                logradouro: fb.logradouro || "",
                numero: fb.numero || "S/N",
                complemento: fb.complemento || "",
                bairro: fb.bairro || "",
                cep: fb.cep || "",
                ddd1: fb.ddd_telefone_1 ? fb.ddd_telefone_1.substring(0, 2) : "",
                telefone1: fb.ddd_telefone_1 ? fb.ddd_telefone_1.substring(2) : "",
                email: fb.email || "",
                cidade: {
                  nome: fb.municipio,
                },
                estado: {
                  sigla: fb.uf,
                },
                atividade_principal: {
                  id: String(fb.cnae_fiscal || ""),
                  descricao: fb.cnae_fiscal_descricao || "Atividade Empresarial",
                },
                atividades_secundarias: (fb.cnaes_secundarios || []).map((c: any) => ({
                  id: String(c.codigo || ""),
                  descricao: c.descricao || "",
                })),
              },
              socios: (fb.qsa || []).map((s: any) => ({
                nome: s.nome_socio,
                qualificacao_socio: {
                  descricao: s.qualificacao_socio,
                },
              })),
            },
          });
        }
      } catch (fbErr: any) {
        console.warn("[CNPJ] Fallback BrasilAPI falhou:", fbErr.message);
      }

      return res.status(404).json({
        success: false,
        error: "CNPJ não encontrado na base pública da Receita Federal ou limite de requisições excedido temporariamente.",
      });
    } catch (e: any) {
      console.error("[CNPJ] Erro geral ao consultar CNPJ:", e);
      return res.status(500).json({
        success: false,
        error: "Falha ao processar consulta de CNPJ.",
      });
    }
  });

  // ==================================================================
  // ROTAS PÚBLICAS DE ORÇAMENTOS (Acesso direto pelo cliente via link)
  // ==================================================================

  // Endpoint de busca direta de orçamento público para o cliente
  app.get("/api/public/proposal/:id", (req, res) => {
    try {
      const rawParam = req.params.id || "";
      let targetId = rawParam.trim().toLowerCase();
      try {
        targetId = decodeURIComponent(rawParam).trim().toLowerCase();
      } catch {}

      if (!targetId) {
        return res.status(400).json({ success: false, error: "Identificador de orçamento inválido." });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const proposals = Array.isArray(parsed?.proposals) ? parsed.proposals : [];
        const clients = Array.isArray(parsed?.clients) ? parsed.clients : [];

        const found = proposals.find(
          (p: any) =>
            p.id?.toLowerCase() === targetId ||
            p.code?.toLowerCase() === targetId ||
            (p.shareToken && p.shareToken?.toLowerCase() === targetId)
        );

        if (found) {
          let client = null;
          if (clients.length > 0) {
            client = clients.find(
              (c: any) =>
                (found.clientId && c.id === found.clientId) ||
                c.companyName?.toLowerCase() === found.clientName?.toLowerCase() ||
                c.name?.toLowerCase() === found.clientName?.toLowerCase()
            );
          }
          return res.json({ success: true, proposal: found, client });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar proposta pública:", e);
    }

    res.status(404).json({ success: false, error: "Orçamento não localizado ou expirado." });
  });

  // Decisão do cliente no orçamento público (Aprovar / Recusar / Ajuste)
  app.post("/api/public/proposal/:id/decision", (req, res) => {
    try {
      const rawParam = req.params.id || "";
      let targetId = rawParam.trim().toLowerCase();
      try {
        targetId = decodeURIComponent(rawParam).trim().toLowerCase();
      } catch {}

      const { action, signerName, signerRole, signerEmail, signerPhone, notes, reason, feedback } = req.body || {};

      if (!targetId || !action) {
        return res.status(400).json({ success: false, error: "Dados incompletos para processar decisão." });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const proposals = Array.isArray(parsed?.proposals) ? parsed.proposals : [];

        const now = new Date();
        const dateNow = now.toLocaleDateString("pt-BR");
        const timeNow = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateTime = `${dateNow} ${timeNow}`;

        let targetFound = false;
        let updatedProposal: any = null;

        const updatedProposals = proposals.map((p: any) => {
          if (
            p.id?.toLowerCase() === targetId ||
            p.code?.toLowerCase() === targetId ||
            (p.shareToken && p.shareToken?.toLowerCase() === targetId)
          ) {
            targetFound = true;
            if (action === "Aprovado") {
              updatedProposal = {
                ...p,
                status: "Aprovado",
                approvedAt: dateTime,
                clientSignerName: signerName || p.contactName || "Cliente",
                clientSignerRole: signerRole || "Responsável",
                clientSignerEmail: signerEmail || p.clientEmail,
                clientSignerPhone: signerPhone || p.clientPhone,
                clientDecisionNote: notes,
              };
            } else if (action === "Recusado") {
              updatedProposal = {
                ...p,
                status: "Recusado",
                rejectedAt: dateTime,
                clientDecisionNote: reason || "Proposta recusada pelo cliente.",
              };
            } else {
              updatedProposal = {
                ...p,
                clientDecisionNote: feedback || "Cliente solicitou readequação de escopo.",
              };
            }
            return updatedProposal;
          }
          return p;
        });

        if (targetFound && updatedProposal) {
          parsed.proposals = updatedProposals;
          parsed.updatedAt = Date.now();
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
          return res.json({ success: true, proposal: updatedProposal });
        }
      }
    } catch (e) {
      console.error("Erro ao registrar decisão do orçamento:", e);
    }

    res.status(404).json({ success: false, error: "Orçamento não localizado para atualização." });
  });

  // ==================================================================
  // ROTAS DO CHAT DE COMUNICAÇÃO DA EQUIPE
  // ==================================================================
  function getChatData() {
    try {
      if (fs.existsSync(CHAT_FILE)) {
        return JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("Erro ao ler chat-messages.json:", e);
    }
    return {
      channels: [
        { id: "geral", name: "Geral da Agência", description: "Canal principal para comunicados e integração da equipe", icon: "Hash" },
        { id: "demandas", name: "Projetos & Demandas", description: "Alinhamentos operacionais e prazos de entrega", icon: "Kanban" },
        { id: "criacao", name: "Criação & Design", description: "Compartilhamento de referências e feedbacks visuais", icon: "Palette" },
        { id: "atendimento", name: "Atendimento & Clientes", description: "Atualizações de reuniões e briefings", icon: "Users" }
      ],
      messages: []
    };
  }

  function saveChatData(data: any) {
    try {
      fs.writeFileSync(CHAT_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Erro ao salvar chat-messages.json:", e);
    }
  }

  // Lista canais disponíveis
  app.get("/api/chat/channels", (_req, res) => {
    try {
      const data = getChatData();
      const channels = (data.channels || []).map((ch: any) => {
        const msgs = (data.messages || []).filter((m: any) => m.channelId === ch.id);
        const lastMsg = msgs[msgs.length - 1];
        return {
          ...ch,
          totalMessages: msgs.length,
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            senderName: lastMsg.senderName,
            createdAt: lastMsg.createdAt,
            timestamp: lastMsg.timestamp,
          } : null,
        };
      });
      res.json({ success: true, channels });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Lista mensagens de um canal específico
  app.get("/api/chat/messages", (req, res) => {
    try {
      const channelId = String(req.query.channelId || "geral");
      const data = getChatData();
      const messages = (data.messages || []).filter((m: any) => m.channelId === channelId);
      res.json({ success: true, messages });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Cria canal ou DM
  app.post("/api/chat/channels", (req, res) => {
    try {
      const { id, name, description, isPrivate, memberIds } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Nome do canal é obrigatório" });
      const data = getChatData();
      const channelId = id || `channel-${Date.now()}`;
      if (!data.channels) data.channels = [];
      const existing = data.channels.find((c: any) => c.id === channelId);
      if (existing) {
        return res.json({ success: true, channel: existing });
      }
      const newChannel = {
        id: channelId,
        name,
        description: description || "",
        isPrivate: Boolean(isPrivate),
        memberIds: memberIds || [],
        icon: "Hash",
      };
      data.channels.push(newChannel);
      saveChatData(data);
      broadcast({ type: "channel:new", channel: newChannel });
      res.json({ success: true, channel: newChannel });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Envia nova mensagem
  app.post("/api/chat/messages", (req, res) => {
    try {
      const { channelId = "geral", senderId, senderName, senderAvatar, senderRole, content, replyTo, attachments } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: "Conteúdo da mensagem não pode ser vazio." });
      }
      const data = getChatData();
      if (!data.messages) data.messages = [];

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const createdAt = `Hoje às ${timeStr}`;

      const newMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        channelId,
        senderId: senderId || "usr-anon",
        senderName: senderName || "Colaborador",
        senderAvatar: senderAvatar || "",
        senderRole: senderRole || "Membro da Equipe",
        content: content.trim(),
        timestamp: Date.now(),
        createdAt,
        reactions: {},
        isPinned: false,
        replyTo: replyTo && replyTo.id ? replyTo : undefined,
        attachments: Array.isArray(attachments) ? attachments : undefined,
      };

      data.messages.push(newMessage);
      saveChatData(data);

      // Notifica via WebSocket
      broadcast({ type: "message:new", message: newMessage });

      res.json({ success: true, message: newMessage });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Alterna reação em mensagem
  app.post("/api/chat/messages/:id/reaction", (req, res) => {
    try {
      const msgId = req.params.id;
      const { emoji, userId } = req.body;
      if (!emoji || !userId) {
        return res.status(400).json({ success: false, error: "Emoji e userId são obrigatórios." });
      }
      const data = getChatData();
      const msg = (data.messages || []).find((m: any) => m.id === msgId);
      if (!msg) {
        return res.status(404).json({ success: false, error: "Mensagem não encontrada." });
      }
      if (!msg.reactions) msg.reactions = {};
      const currentList: string[] = msg.reactions[emoji] || [];
      const userIndex = currentList.indexOf(userId);
      if (userIndex >= 0) {
        currentList.splice(userIndex, 1);
        if (currentList.length === 0) {
          delete msg.reactions[emoji];
        } else {
          msg.reactions[emoji] = currentList;
        }
      } else {
        msg.reactions[emoji] = [...currentList, userId];
      }
      saveChatData(data);

      broadcast({
        type: "reaction:updated",
        messageId: msgId,
        channelId: msg.channelId,
        reactions: msg.reactions,
      });

      res.json({ success: true, reactions: msg.reactions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Alterna fixação de mensagem
  app.post("/api/chat/messages/:id/pin", (req, res) => {
    try {
      const msgId = req.params.id;
      const data = getChatData();
      const msg = (data.messages || []).find((m: any) => m.id === msgId);
      if (!msg) {
        return res.status(404).json({ success: false, error: "Mensagem não encontrada." });
      }
      msg.isPinned = !msg.isPinned;
      saveChatData(data);

      broadcast({
        type: "message:pinned",
        messageId: msgId,
        channelId: msg.channelId,
        isPinned: msg.isPinned,
      });

      res.json({ success: true, isPinned: msg.isPinned });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Apaga mensagem
  app.delete("/api/chat/messages/:id", (req, res) => {
    try {
      const msgId = req.params.id;
      const data = getChatData();
      const index = (data.messages || []).findIndex((m: any) => m.id === msgId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Mensagem não encontrada." });
      }
      const [removed] = data.messages.splice(index, 1);
      saveChatData(data);

      broadcast({
        type: "message:deleted",
        messageId: msgId,
        channelId: removed?.channelId,
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================================================================
  // VITE MIDDLEWARE (Development & Production)
  // ==================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ==================================================================
  // WEBSOCKET SERVER COM PRESENÇA EM TEMPO REAL
  // ==================================================================
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  const connectedClients = new Map<WebSocket, any>();

  broadcast = (data: any, excludeWs?: WebSocket) => {
    const payload = JSON.stringify(data);
    for (const [client] of connectedClients.entries()) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  function getOnlineUsers() {
    const unique = new Map<string, any>();
    for (const [_, info] of connectedClients.entries()) {
      if (info?.userId) {
        unique.set(info.userId, {
          userId: info.userId,
          name: info.name,
          role: info.role,
          avatar: info.avatar,
          activeChannel: info.activeChannel,
          online: true,
        });
      }
    }
    return Array.from(unique.values());
  }

  wss.on("connection", (ws) => {
    connectedClients.set(ws, { status: "anonymous" });
    ws.send(JSON.stringify({ type: "presence:sync", users: getOnlineUsers() }));

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "client:join") {
          connectedClients.set(ws, {
            userId: data.userId,
            name: data.name,
            role: data.role,
            avatar: data.avatar,
            activeChannel: data.channelId || "geral",
          });
          broadcast({ type: "presence:sync", users: getOnlineUsers() });
        } else if (data.type === "typing:start") {
          broadcast({
            type: "user:typing",
            userId: data.userId,
            userName: data.userName,
            channelId: data.channelId,
            isTyping: true,
          }, ws);
        } else if (data.type === "typing:stop") {
          broadcast({
            type: "user:typing",
            userId: data.userId,
            userName: data.userName,
            channelId: data.channelId,
            isTyping: false,
          }, ws);
        }
      } catch (err) {
        console.error("Erro WebSocket:", err);
      }
    });

    ws.on("close", () => {
      connectedClients.delete(ws);
      broadcast({ type: "presence:sync", users: getOnlineUsers() });
    });

    ws.on("error", () => {
      connectedClients.delete(ws);
    });
  });

  // Inicializa a base de dados em memória e sincroniza do Firestore se necessário
  await initDatabaseState();

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Help Ideias Server] Rodando com sucesso na porta ${PORT} (HTTP & WebSocket)`);
  });
}

startServer();

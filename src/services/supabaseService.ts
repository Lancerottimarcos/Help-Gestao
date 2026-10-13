import { 
  getSupabaseClient, 
  getSupabaseUrl, 
  getSupabaseAnonKey, 
  getSupabaseConfigStatus 
} from '../lib/supabaseClient';
import { serverDbService } from './serverDbService';
import { 
  DemandItem, 
  Client, 
  Service, 
  Invoice, 
  BudgetProposal, 
  TeamMember,
  KanbanColumn 
} from '../types';

function recordSyncFailure(
  operation: string,
  error: any,
  details?: any,
  severity: 'WARNING' | 'ERROR' | 'CRITICAL' = 'ERROR'
) {
  try {
    serverDbService.recordSupabaseSyncError({
      operation,
      error,
      details,
      severity,
    });
  } catch {}
}

export interface FullSyncPayload {
  clients?: Client[];
  demands?: DemandItem[];
  services?: Service[];
  proposals?: BudgetProposal[];
  invoices?: Invoice[];
  teamMembers?: TeamMember[];
  kanbanColumns?: KanbanColumn[];
}

export interface SyncResult {
  clientsUploaded: number;
  demandsUploaded: number;
  servicesUploaded: number;
  proposalsUploaded: number;
  invoicesUploaded: number;
  teamMembersUploaded: number;
  kanbanColumnsUploaded: number;
  errors: string[];
}

/**
 * Script de migração rápida para quem já possui as tabelas criadas no Supabase
 * mas ainda não possui as novas colunas como 'address' ou 'approval_answered_at'.
 */
export const SUPABASE_MIGRATION_SQL = `-- ====================================================================
-- SCRIPT DE ATUALIZAÇÃO / MIGRAÇÃO INCREMENTAL DE COLUNAS NO SUPABASE
-- Cole no SQL Editor do Supabase e clique em RUN. Não apaga nenhum dado!
-- ====================================================================

-- 1. Novas colunas e auditoria na tabela de clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'juridica';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_role TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cover_color TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS active_demands_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS joined_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lgpd_consent_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lgpd_consent_purpose TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anonymized_at TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_username TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_password TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;

-- Atualiza a função de trigger para ser tolerante a falhas (impede quebrar caso updated_at falte em alguma tabela)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW.updated_at = timezone('utc'::text, now());
    EXCEPTION WHEN undefined_column THEN
        -- Se a tabela não possuir a coluna updated_at, ignora sem quebrar a operação
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Novas colunas na tabela de demandas
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_answered_at TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_sent_at TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_feedback TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_portal_token TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS whatsapp_notified BOOLEAN DEFAULT false;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_project TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'Social Media';

-- 3. Novas colunas na tabela de equipe (team_members)
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS function_role TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 4. Novas colunas na tabela de colunas kanban
ALTER TABLE public.kanban_columns ADD COLUMN IF NOT EXISTS position_order INTEGER DEFAULT 0;

-- 5. Notificar o PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- SCHEMA SQL PROFISSIONAL PARA O SUPABASE (POSTGRESQL) - HELP IDEIAS
-- Arquitetura relacional com RLS, Triggers de Auditoria e Índices B-Tree
-- Cole este script completo no menu "SQL Editor" do painel do Supabase
-- ====================================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        NEW.updated_at = timezone('utc'::text, now());
    EXCEPTION WHEN undefined_column THEN
        -- Se a tabela não possuir a coluna updated_at, ignora sem quebrar a operação
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------
-- 2. TABELA DE CLIENTES (CRM & LGPD)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    person_type TEXT DEFAULT 'juridica',
    name TEXT NOT NULL,
    cpf_cnpj TEXT,
    company_name TEXT NOT NULL,
    segment TEXT DEFAULT 'Geral',
    contact_name TEXT,
    contact_role TEXT,
    email TEXT,
    emails JSONB DEFAULT '[]'::jsonb,
    phone TEXT,
    phones JSONB DEFAULT '[]'::jsonb,
    birth_date TEXT,
    cover_color TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'Ativo',
    monthly_fee NUMERIC(10,2) DEFAULT 0.00,
    services JSONB DEFAULT '[]'::jsonb,
    active_demands_count INTEGER DEFAULT 0,
    joined_date TEXT,
    website TEXT,
    instagram TEXT,
    address TEXT,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    lgpd_consent_date TEXT,
    lgpd_consent_purpose TEXT,
    is_anonymized BOOLEAN DEFAULT false,
    anonymized_at TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assegura adição de colunas mesmo se a tabela já existia com versão antiga
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'juridica';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cover_color TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS joined_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lgpd_consent_date TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lgpd_consent_purpose TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anonymized_at TEXT;

-- Trigger de updated_at para clients
DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índices de consulta para clients
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_name);

-- --------------------------------------------------------------------
-- 3. TABELA DE DEMANDAS (WORKFLOW KANBAN & PORTAL DO CLIENTE)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demands (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_project TEXT,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'Post',
    service_category TEXT DEFAULT 'Social Media',
    column_id TEXT NOT NULL DEFAULT 'ideias',
    priority TEXT NOT NULL DEFAULT 'media',
    priority_bars INTEGER DEFAULT 2,
    due_date TEXT,
    assignee JSONB DEFAULT '{"name": "Marcos Lancerotti", "avatar": ""}'::jsonb,
    thumbnail TEXT,
    status_label TEXT,
    checklist_total INTEGER DEFAULT 0,
    checklist_completed INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    attachments_count INTEGER DEFAULT 0,
    attachments JSONB DEFAULT '[]'::jsonb,
    approval_status TEXT,
    approval_feedback TEXT,
    approval_sent_at TEXT,
    approval_answered_at TEXT,
    client_portal_token TEXT,
    whatsapp_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assegura adição de colunas mesmo se a tabela já existia com versão antiga
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_answered_at TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_sent_at TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS approval_feedback TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_portal_token TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS whatsapp_notified BOOLEAN DEFAULT false;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS client_project TEXT;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'Social Media';

-- Trigger de updated_at para demands
DROP TRIGGER IF EXISTS trg_demands_updated_at ON public.demands;
CREATE TRIGGER trg_demands_updated_at
BEFORE UPDATE ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índices de consulta para demands
CREATE INDEX IF NOT EXISTS idx_demands_column ON public.demands(column_id);
CREATE INDEX IF NOT EXISTS idx_demands_client ON public.demands(client_name);
CREATE INDEX IF NOT EXISTS idx_demands_portal ON public.demands(client_portal_token);

-- --------------------------------------------------------------------
-- 4. TABELA DE SERVIÇOS DA AGÊNCIA (CATÁLOGO & PRECIFICAÇÃO)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Social Media',
    description TEXT DEFAULT '',
    base_price NUMERIC(10,2) DEFAULT 0.00,
    is_monthly BOOLEAN DEFAULT true,
    deliverables JSONB DEFAULT '[]'::jsonb,
    active_clients_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger de updated_at para services
DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------
-- 5. TABELA DE ORÇAMENTOS E PROPOSTAS COMERCIAIS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_name TEXT NOT NULL,
    total_value NUMERIC(10,2) DEFAULT 0.00,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Rascunho',
    services_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger de updated_at para proposals
DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);

-- --------------------------------------------------------------------
-- 6. TABELA DE FATURAS E LANÇAMENTOS FINANCEIROS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    client TEXT NOT NULL,
    client_initial TEXT,
    service TEXT NOT NULL,
    value NUMERIC(10,2) DEFAULT 0.00,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente',
    category TEXT DEFAULT 'Mensalidade Recorrente',
    payment_method TEXT DEFAULT 'PIX',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger de updated_at para invoices
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client);

-- --------------------------------------------------------------------
-- 7. TABELA DE COLUNAS PERSONALIZADAS DO KANBAN
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    color TEXT NOT NULL,
    button_bg TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    position_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------------------
-- 8. TABELA DE MEMBROS DA EQUIPE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    function_role TEXT,
    email TEXT NOT NULL,
    avatar TEXT,
    active_tasks INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Disponível',
    specialties JSONB DEFAULT '[]'::jsonb,
    username TEXT,
    password TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assegura adição de novas colunas em team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS function_role TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_by TEXT;

-- --------------------------------------------------------------------
-- 9. CONFIGURAÇÃO DE SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso irrestrito para anon e authenticated (sistema de agência interno)
DROP POLICY IF EXISTS "Acesso total public clients" ON public.clients;
CREATE POLICY "Acesso total public clients" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public demands" ON public.demands;
CREATE POLICY "Acesso total public demands" ON public.demands FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public services" ON public.services;
CREATE POLICY "Acesso total public services" ON public.services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public proposals" ON public.proposals;
CREATE POLICY "Acesso total public proposals" ON public.proposals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public invoices" ON public.invoices;
CREATE POLICY "Acesso total public invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public kanban_columns" ON public.kanban_columns;
CREATE POLICY "Acesso total public kanban_columns" ON public.kanban_columns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total public team_members" ON public.team_members;
CREATE POLICY "Acesso total public team_members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
`;

/**
 * Detecta se o erro retornado ou disparado é uma falha de conexão de rede/fetch
 * (ex: TypeError: Failed to fetch, projeto Supabase pausado/inalcançável, offline, CORS, etc.)
 */
export function isNetworkOrFetchError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || err.details || err.hint || String(err)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('connection refused') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_connection_refused') ||
    err.name === 'TypeError'
  );
}

/**
 * Utilitário de auto-cura para upserts no Supabase.
 * Se o PostgREST rejeitar com "Could not find the 'xyz' column of 'table' in the schema cache",
 * remove a coluna não existente e tenta novamente de forma transparente.
 * Se ocorrer erro de trigger PL/pgSQL (ex: record "new" has no field "updated_at", código 42703),
 * executa auto-recuperação atômica via delete + insert para contornar o trigger de BEFORE UPDATE.
 */
async function resilientSupabaseUpsert(
  supabase: any,
  tableName: string,
  payload: any | any[],
  maxRetries = 15
): Promise<{ data: any; error: any }> {
  let currentPayload = Array.isArray(payload)
    ? payload.map(item => ({ ...item }))
    : { ...payload };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let result: any = null;
    try {
      result = await supabase.from(tableName).upsert(currentPayload);
    } catch (fetchErr: any) {
      return { data: null, error: fetchErr };
    }

    const { data, error } = result || {};

    if (!error) {
      return { data, error: null };
    }

    // Se for erro de rede/fetch (ex: Failed to fetch), interrompe imediatamente sem loop desnecessário
    if (isNetworkOrFetchError(error)) {
      return { data: null, error };
    }

    // 1. Identifica mensagens de coluna ausente do PostgREST
    // Exemplo: Could not find the 'address' column of 'clients' in the schema cache
    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      console.warn(`[Supabase Auto-Heal] Removendo coluna ausente "${missingCol}" da tabela "${tableName}" para garantir sincronização imediata.`);

      if (Array.isArray(currentPayload)) {
        currentPayload = currentPayload.map(item => {
          const clone = { ...item };
          delete clone[missingCol];
          return clone;
        });
      } else {
        delete currentPayload[missingCol];
      }
      continue;
    }

    // 2. Identifica erro de trigger PL/pgSQL com campo inexistente no registro "new" (ex: record "new" has no field "updated_at")
    // Este erro ocorre em UPDATE / UPSERT quando um trigger BEFORE UPDATE no PostgreSQL tenta ler/gravar uma coluna que
    // não existe na tabela. Como INSERT não dispara triggers BEFORE UPDATE, auto-curamos via delete + insert atômico.
    const triggerFieldMatch = error.message?.match(/record "(?:new|old)" has no field "([^"]+)"/i);
    const isUndefinedColumn = error.code === '42703' || (error.message && error.message.includes('has no field'));

    if (triggerFieldMatch || isUndefinedColumn) {
      const badField = triggerFieldMatch ? triggerFieldMatch[1] : 'updated_at';
      console.warn(`[Supabase Auto-Heal] Trigger no PostgreSQL falhou por coluna ausente "${badField}" na tabela "${tableName}". Executando auto-recuperação...`);

      // Remove a coluna ofensiva do payload
      if (Array.isArray(currentPayload)) {
        currentPayload = currentPayload.map(item => {
          const clone = { ...item };
          delete clone[badField];
          return clone;
        });
      } else {
        delete currentPayload[badField];
      }

      // Se for um item individual com ID, deleta o registro antigo e reinsere com dados atualizados
      if (!Array.isArray(currentPayload) && currentPayload.id) {
        const targetId = currentPayload.id;
        const { error: delError } = await supabase.from(tableName).delete().eq('id', targetId);
        if (!delError) {
          const { data: insData, error: insError } = await supabase.from(tableName).insert(currentPayload);
          if (!insError) {
            console.log(`[Supabase Auto-Heal] Registro ${targetId} salvo com sucesso na tabela "${tableName}" após auto-recuperação.`);
            return { data: insData, error: null };
          }
          console.warn(`[Supabase Auto-Heal] Falha no insert após delete para ${targetId}:`, insError);
        } else {
          console.warn(`[Supabase Auto-Heal] Falha no delete para ${targetId}:`, delError);
        }
      } else if (Array.isArray(currentPayload) && currentPayload.length > 0) {
        let allSuccess = true;
        for (const item of currentPayload) {
          if (item.id) {
            await supabase.from(tableName).delete().eq('id', item.id);
            const { error: insError } = await supabase.from(tableName).insert(item);
            if (insError) {
              allSuccess = false;
              console.warn(`[Supabase Auto-Heal] Erro ao reinserir item em lote ${item.id}:`, insError);
            }
          }
        }
        if (allSuccess) {
          return { data: currentPayload, error: null };
        }
      }
    }

    return { data, error };
  }

  return { data: null, error: new Error(`Não foi possível ajustar o payload para a tabela ${tableName}`) };
}

const LEGACY_COLUMN_ALIASES: Record<string, string> = {
  pauta: 'ideias',
  'col-em-produ--o-5023': 'producao',
  'col-aprova--o-8870': 'aprovacao',
  'col-conclu-do-7806': 'concluidas',
};

export const supabaseService = {
  isAvailable(): boolean {
    return this.isConfigured();
  },

  isConfigured(): boolean {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key || !url.startsWith('http')) return false;
    if (url.includes('your-project') || url.includes('pniiwmpxtvckivufrqhn')) return false;
    return getSupabaseClient() !== null;
  },

  /**
   * Retorna os detalhes de configuração do ambiente Supabase
   */
  getConnectionInfo() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    const status = getSupabaseConfigStatus();
    return {
      url,
      hasKey: Boolean(key),
      keyPreview: key ? `${key.substring(0, 12)}...${key.substring(key.length - 6)}` : 'não configurada',
      source: status.source,
      isConfigured: status.isConfigured,
    };
  },

  /**
   * Retorna metadados completos de diagnóstico do ambiente de execução (computador vs celular, navegador, rede e storage)
   */
  getEnvironmentDiagnostics() {
    const isBrowser = typeof window !== 'undefined';
    const ua = isBrowser ? navigator.userAgent : 'Node.js';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|tablet/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const deviceType = isTablet ? 'Tablet' : isMobile ? (isIOS ? 'Celular iPhone (iOS)' : isAndroid ? 'Celular Android' : 'Dispositivo Móvel') : 'Computador (Desktop)';
    
    let browser = 'Navegador Web';
    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Safari')) browser = 'Apple Safari';

    const isOnline = isBrowser ? navigator.onLine : true;
    const netConn = isBrowser ? (navigator as any).connection : null;
    const effectiveType = netConn?.effectiveType ? String(netConn.effectiveType).toUpperCase() : 'Não informado';
    const downlink = netConn?.downlink ? `${netConn.downlink} Mbps` : undefined;

    let storageUsable = false;
    try {
      if (isBrowser) {
        const testKey = `__sb_probe_${Date.now()}__`;
        localStorage.setItem(testKey, '1');
        storageUsable = localStorage.getItem(testKey) === '1';
        localStorage.removeItem(testKey);
      }
    } catch {}

    const windowInfo = isBrowser ? `${window.innerWidth}x${window.innerHeight} (${window.screen?.width}x${window.screen?.height})` : 'N/A';
    const origin = isBrowser ? window.location.origin : 'N/A';

    return {
      deviceType,
      browser,
      isMobile,
      isOnline,
      effectiveType,
      downlink,
      storageUsable,
      windowInfo,
      origin,
      ua,
    };
  },

  /**
   * Executa teste e auditoria detalhada de conexão com o Supabase com logs estruturados
   */
  async checkConnection(customUrl?: string, customKey?: string): Promise<{
    success: boolean;
    authOk: boolean;
    restOk: boolean;
    url: string;
    latencyMs: number;
    error?: string;
    details?: any;
    environment?: any;
  }> {
    const url = (customUrl || getSupabaseUrl() || '').trim();
    const key = (customKey || getSupabaseAnonKey() || '').trim();
    const startTime = Date.now();
    const env = this.getEnvironmentDiagnostics();

    console.group(
      `%c[Supabase Diagnóstico] 📡 Testando Conexão com o Banco de Dados Principal | ${env.deviceType} (${env.browser})`,
      'background: #142142; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 11px;'
    );
    console.info('%c📱 Detalhes do Ambiente de Execução:', 'color: #fab518; font-weight: bold;', {
      Dispositivo: env.deviceType,
      Navegador: env.browser,
      StatusRede: env.isOnline ? '🟢 Online (Conectado à Internet)' : '🔴 Offline (Sem Conexão)',
      TipoConexao: env.effectiveType,
      VelocidadeEstimada: env.downlink || 'N/A',
      ResolucaoTela: env.windowInfo,
      LocalStorage: env.storageUsable ? '✅ Operacional' : '⚠️ Restrito / Bloqueado',
      OrigemAcesso: env.origin,
    });

    console.info('%c🔑 Configuração de Credenciais Supabase:', 'color: #38bdf8; font-weight: bold;', {
      EndpointURL: url || '(vazia / não informada)',
      ChavePublicaAnonKey: key ? `${key.substring(0, 16)}... (${key.length} caracteres)` : '(vazia / não informada)',
      FormatoChave: key.startsWith('sb_publishable_') ? 'Supabase Publishable Key' : key.startsWith('eyJ') ? 'JWT Anon Token' : 'API Key Padrão',
    });

    if (!url || !key) {
      const latencyMs = Date.now() - startTime;
      console.warn(
        '%c[Supabase Status] ⚠️ Credenciais do Supabase não configuradas neste ambiente.',
        'color: #f59e0b; font-weight: bold;'
      );
      console.log('-> Utilizando camada primária de persistência e alta disponibilidade (/api/database + Firestore). Suas demandas continuam 100% protegidas.');
      console.groupEnd();
      return { 
        success: false, 
        authOk: false, 
        restOk: false, 
        url, 
        latencyMs, 
        error: 'Credenciais ausentes',
        environment: env 
      };
    }

    try {
      const client = getSupabaseClient(url, key);
      if (!client) {
        const latencyMs = Date.now() - startTime;
        console.warn(
          '%c[Supabase Status] ⚠️ Não foi possível inicializar o cliente Supabase JavaScript.',
          'color: #f59e0b; font-weight: bold;'
        );
        console.groupEnd();
        return { 
          success: false, 
          authOk: false, 
          restOk: false, 
          url, 
          latencyMs, 
          error: 'Falha ao instanciar cliente',
          environment: env 
        };
      }

      // 1. Teste HTTP Direto de Rede / Ping ao Endpoint
      const pingStart = Date.now();
      let httpPingSuccess = false;
      let httpPingStatus = 0;
      let httpPingError: string | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        // Pede headers para validar se o servidor Supabase responde na internet
        const pingResponse = await fetch(`${url}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
          },
          signal: controller.signal,
        }).catch(async () => {
          return fetch(`${url}/auth/v1/health`, {
            headers: { 'apikey': key },
            signal: controller.signal,
          });
        });

        clearTimeout(timeoutId);
        httpPingStatus = pingResponse.status;
        httpPingSuccess = pingResponse.ok || pingResponse.status === 200 || pingResponse.status === 404;
      } catch (pingErr: any) {
        httpPingError = pingErr?.message || String(pingErr);
      }

      const pingLatency = Date.now() - pingStart;

      if (!httpPingSuccess && httpPingError) {
        console.warn(
          `%c[Supabase Rede / DNS] ❌ Falha ao contatar endpoint Supabase (${pingLatency}ms):`,
          'color: #ef4444; font-weight: bold;',
          httpPingError
        );
        if (httpPingError.includes('Failed to fetch') || httpPingError.includes('ENOTFOUND') || httpPingError.includes('abort')) {
          console.warn('💡 Diagnóstico: O domínio Supabase não respondeu ou não pôde ser resolvido por DNS. Verifique se o endereço do projeto (.supabase.co) está correto ou se o projeto está ativo.');
        }
      } else {
        console.log(
          `%c[Supabase Rede / HTTP] ✅ Endpoint online respondendo com status HTTP ${httpPingStatus} (${pingLatency}ms)!`,
          'color: #10b981; font-weight: bold;'
        );
      }

      // 2. Teste de Auth / Sessão com a biblioteca cliente
      const authStart = Date.now();
      const { error: authError } = await client.auth.getSession();
      const authLatency = Date.now() - authStart;

      if (authError) {
        const totalLatency = Date.now() - startTime;
        console.warn(
          `%c[Supabase Auth] ❌ Falha na autenticação (${authLatency}ms):`,
          'color: #ef4444; font-weight: bold;',
          authError.message
        );
        console.groupEnd();
        return { 
          success: false, 
          authOk: false, 
          restOk: false, 
          url, 
          latencyMs: totalLatency, 
          error: authError.message, 
          details: authError,
          environment: env 
        };
      }

      console.log(`%c[Supabase Auth] ✅ Autenticação e credenciais validadas com sucesso (${authLatency}ms)!`, 'color: #10b981; font-weight: bold;');

      // 3. Teste de Acesso REST à tabela de Demandas
      const restStart = Date.now();
      const { data: demandsSample, error: restError, count: demandsCount } = await client
        .from('demands')
        .select('id, title', { count: 'exact', head: false })
        .limit(3);

      const restLatency = Date.now() - restStart;
      const totalLatency = Date.now() - startTime;

      if (restError) {
        console.warn(
          `%c[Supabase REST] ⚠️ Tabela "demands" (${restLatency}ms):`,
          'color: #f59e0b; font-weight: bold;',
          restError.message,
          `[Código: ${restError.code || 'sem código'}]`
        );
        if (restError.code === '42P01' || restError.message?.includes('does not exist')) {
          console.warn('-> A tabela "demands" não existe no PostgreSQL do Supabase. Copie e execute o script SUPABASE_MIGRATION_SQL no SQL Editor do painel Supabase.');
        } else if (restError.code === '42501' || restError.message?.includes('permission denied')) {
          console.warn('-> Permissão negada pelo Row Level Security (RLS). Execute o script SQL para conceder acesso anônimo.');
        }
        console.groupEnd();
        return { 
          success: false, 
          authOk: true, 
          restOk: false, 
          url, 
          latencyMs: totalLatency, 
          error: restError.message, 
          details: restError,
          environment: env 
        };
      }

      console.log(
        `%c[Supabase REST] ✅ Tabela "demands" respondendo normalmente (${restLatency}ms)! Total de demandas no PostgreSQL: ${demandsCount ?? demandsSample?.length ?? 0}`,
        'color: #10b981; font-weight: bold;'
      );
      console.log(
        `%c[Supabase Status] 🚀 Conexão estabelecida com sucesso com o banco de dados principal (${totalLatency}ms total). Ambiente: ${env.deviceType}.`,
        'background: #064e3b; color: #34d399; font-weight: bold; padding: 3px 6px; border-radius: 4px;'
      );
      console.groupEnd();

      return { 
        success: true, 
        authOk: true, 
        restOk: true, 
        url, 
        latencyMs: totalLatency,
        environment: env 
      };
    } catch (err: any) {
      const totalLatency = Date.now() - startTime;
      const errMsg = err?.message || String(err);
      console.warn(
        `%c[Supabase Status] ⚠️ Falha ao testar conexão (${totalLatency}ms):`,
        'color: #f59e0b; font-weight: bold;',
        errMsg
      );
      console.log('-> O Help Ideias opera com redundância automática de alta disponibilidade via Servidor Central e Google Cloud Firestore. Seus dados estão salvos.');
      console.groupEnd();
      return { 
        success: false, 
        authOk: false, 
        restOk: false, 
        url, 
        latencyMs: totalLatency, 
        error: errMsg, 
        details: err,
        environment: env 
      };
    }
  },

  // ==================================================================
  // DEMANDAS (KANBAN)
  // ==================================================================
  async fetchDemands(): Promise<DemandItem[] | null> {
    if (!this.isConfigured()) return null;
    const supabase = getSupabaseClient();
    const url = getSupabaseUrl();
    const env = this.getEnvironmentDiagnostics();

    if (!supabase) return null;

    try {
      console.log(`[Supabase Demanda] 📥 Consultando demandas na nuvem Supabase (${env.deviceType} em ${url})...`);
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`[Supabase Demanda] ⚠️ Falha ao buscar demandas (${error.code || 'sem código'}):`, error.message);
        recordSyncFailure('FETCH_DEMANDS', error.message || error, { error, hint: error.hint });
        return null;
      }

      console.log(`[Supabase Demanda] ✅ ${data?.length || 0} demandas carregadas do PostgreSQL com sucesso no ${env.deviceType}.`);

      return (data || []).map((row: any): DemandItem => {
        const rawCol = row.column_id || 'ideias';
        const resolvedCol = LEGACY_COLUMN_ALIASES[rawCol] || rawCol;

        return {
          id: row.id,
          title: row.title,
          client: row.client_name,
          clientId: row.client_id || undefined,
          clientProject: row.client_project || undefined,
          description: row.description || '',
          type: row.type || 'Post',
          serviceCategory: row.service_category || 'Social Media',
          columnId: resolvedCol,
          priority: row.priority || 'media',
          priorityBars: row.priority_bars ?? 2,
          dueDate: row.due_date || 'Sem prazo',
          assignee: row.assignee || {
            name: 'Marcos Lancerotti',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          },
          thumbnail: row.thumbnail || undefined,
          statusLabel: row.status_label || undefined,
          checklistTotal: row.checklist_total ?? 0,
          checklistCompleted: row.checklist_completed ?? 0,
          commentsCount: row.comments_count ?? 0,
          attachmentsCount: row.attachments_count ?? 0,
          approvalStatus: row.approval_status || undefined,
          approvalFeedback: row.approval_feedback || undefined,
          approvalSentAt: row.approval_sent_at || undefined,
          approvalAnsweredAt: row.approval_answered_at || undefined,
          clientPortalToken: row.client_portal_token || undefined,
          whatsappNotified: Boolean(row.whatsapp_notified),
          attachments: row.attachments || [],
        };
      });
    } catch (e: any) {
      console.warn(`[Supabase Demanda] ⚠️ Exceção ao consultar demandas:`, e?.message || e);
      recordSyncFailure('FETCH_DEMANDS', e?.message || e, e);
      return null;
    }
  },

  async upsertDemand(demand: DemandItem): Promise<boolean> {
    const supabase = getSupabaseClient();
    const env = this.getEnvironmentDiagnostics();

    if (!supabase) {
      console.warn(`[Supabase Demanda] ⚠️ upsertDemand: Cliente não inicializado para "${demand.title}" (ID: ${demand.id}) no ${env.deviceType}. Demanda protegida e persistida no banco central compartilhado.`);
      recordSyncFailure('UPSERT_DEMAND', 'Supabase não inicializado', { demandId: demand.id }, 'WARNING');
      return false;
    }

    try {
      console.log(`[Supabase Demanda] 💾 Sincronizando demanda "${demand.title}" (ID: ${demand.id}) no PostgreSQL Supabase via ${env.deviceType}...`);
      const payload = {
        id: demand.id,
        title: demand.title,
        client_name: demand.client,
        client_id: demand.clientId || null,
        client_project: demand.clientProject || null,
        description: demand.description || '',
        type: demand.type || 'Post',
        service_category: demand.serviceCategory || 'Social Media',
        column_id: demand.columnId || 'ideias',
        priority: demand.priority || 'media',
        priority_bars: demand.priorityBars ?? 2,
        due_date: demand.dueDate || null,
        assignee: demand.assignee,
        thumbnail: demand.thumbnail || null,
        status_label: demand.statusLabel || null,
        checklist_total: demand.checklistTotal ?? 0,
        checklist_completed: demand.checklistCompleted ?? 0,
        comments_count: demand.commentsCount ?? 0,
        attachments_count: demand.attachmentsCount ?? (demand.attachments?.length || 0),
        approval_status: demand.approvalStatus || null,
        approval_feedback: demand.approvalFeedback || null,
        approval_sent_at: demand.approvalSentAt || null,
        approval_answered_at: demand.approvalAnsweredAt || null,
        client_portal_token: demand.clientPortalToken || null,
        whatsapp_notified: Boolean(demand.whatsappNotified),
        attachments: demand.attachments || [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await resilientSupabaseUpsert(supabase, 'demands', payload);
      if (error) {
        if (isNetworkOrFetchError(error)) {
          console.warn(`[Supabase Demanda] ℹ️ Conexão Supabase temporariamente inalcançável (${error.message || error}). Demanda "${demand.title}" (ID: ${demand.id}) preservada no banco central.`);
          recordSyncFailure('UPSERT_DEMAND', error.message || error, { demandId: demand.id }, 'WARNING');
        } else {
          console.warn(`[Supabase Demanda] ⚠️ Aviso ao gravar demanda "${demand.id}" no PostgreSQL:`, error.message || error);
          recordSyncFailure('UPSERT_DEMAND', error.message || error, { demandId: demand.id, error });
        }
        return false;
      }
      console.log(`[Supabase Demanda] ✅ Demanda "${demand.title}" (ID: ${demand.id}) gravada com sucesso no Supabase PostgreSQL pelo ${env.deviceType}.`);
      return true;
    } catch (e: any) {
      if (isNetworkOrFetchError(e)) {
        console.warn(`[Supabase Demanda] ℹ️ Conexão de rede inalcançável para demanda "${demand.id}". Salvo no banco central.`);
        recordSyncFailure('UPSERT_DEMAND', e?.message || e, { demandId: demand.id }, 'WARNING');
      } else {
        console.warn(`[Supabase Demanda] ⚠️ Aviso ao sincronizar demanda "${demand.id}":`, e?.message || e);
        recordSyncFailure('UPSERT_DEMAND', e?.message || e, { demandId: demand.id, error: e });
      }
      return false;
    }
  },

  async deleteDemand(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      console.log(`[Supabase] 🗑️ Excluindo demanda ID: ${id} no PostgreSQL...`);
      const { error } = await supabase.from('demands').delete().eq('id', id);
      if (error) {
        if (isNetworkOrFetchError(error)) {
          console.warn(`[Supabase] ℹ️ Conexão Supabase inalcançável ao excluir demanda ID: ${id}. Operação mantida no banco central.`);
        } else {
          console.warn(`[Supabase] ⚠️ Aviso ao excluir demanda ID: ${id}:`, error.message || error);
        }
        recordSyncFailure('DELETE_DEMAND', error.message || error, { id, error });
        return false;
      }
      console.log(`[Supabase] ✅ Demanda ID: ${id} excluída do PostgreSQL com sucesso.`);
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_DEMAND', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // CLIENTES (CRM)
  // ==================================================================
  async fetchClients(): Promise<Client[] | null> {
    const supabase = getSupabaseClient();
    const url = getSupabaseUrl();
    if (!supabase) {
      console.warn('[Supabase] ⚠️ fetchClients: Cliente não inicializado (credenciais ausentes). Operando com dados locais/Firestore.');
      recordSyncFailure('FETCH_CLIENTS', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      console.log(`[Supabase] 📥 Consultando clientes em ${url}...`);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`[Supabase] ⚠️ Falha ao buscar clientes (${error.code || 'sem código'}):`, error.message);
        recordSyncFailure('FETCH_CLIENTS', error.message || error, { error, hint: error.hint });
        return null;
      }

      console.log(`[Supabase] ✅ ${data?.length || 0} clientes carregados do PostgreSQL com sucesso.`);

      return (data || []).map((row: any): Client => ({
        id: row.id,
        personType: row.person_type || 'juridica',
        name: row.name,
        cpfCnpj: row.cpf_cnpj || undefined,
        companyName: row.company_name || row.name,
        segment: row.segment || 'Geral',
        contactName: row.contact_name || row.name,
        contactRole: row.contact_role || undefined,
        email: row.email || '',
        emails: Array.isArray(row.emails) ? row.emails : [],
        phone: row.phone || '',
        phones: Array.isArray(row.phones) ? row.phones : [],
        birthDate: row.birth_date || undefined,
        coverColor: row.cover_color || undefined,
        avatar: row.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        status: (row.status as any) || 'Ativo',
        monthlyFee: Number(row.monthly_fee) || 0,
        services: Array.isArray(row.services) ? row.services : ['Social Media'],
        activeDemandsCount: Number(row.active_demands_count) || 0,
        joinedDate: row.joined_date || undefined,
        website: row.website || undefined,
        instagram: row.instagram || undefined,
        address: row.address || undefined,
        cep: row.cep || undefined,
        street: row.street || undefined,
        number: row.number || undefined,
        complement: row.complement || undefined,
        neighborhood: row.neighborhood || undefined,
        city: row.city || undefined,
        state: row.state || undefined,
        notes: row.notes || undefined,
        history: Array.isArray(row.history) ? row.history : [],
        lgpdConsentDate: row.lgpd_consent_date || undefined,
        lgpdConsentPurpose: row.lgpd_consent_purpose || undefined,
        isAnonymized: Boolean(row.is_anonymized),
        anonymizedAt: row.anonymized_at || undefined,
        portalUsername: row.portal_username || undefined,
        portalPassword: row.portal_password || undefined,
        portalAccessEnabled: row.portal_access_enabled !== false,
      }));
    } catch (e: any) {
      console.warn(`[Supabase] ⚠️ Exceção ao consultar clientes:`, e?.message || e);
      recordSyncFailure('FETCH_CLIENTS', e?.message || e, e);
      return null;
    }
  },

  async upsertClient(client: Client): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn(`[Supabase] ⚠️ upsertClient: Cliente não inicializado para "${client.name}" (ID: ${client.id}). Cliente salvo na base central.`);
      recordSyncFailure('UPSERT_CLIENT', 'Supabase não inicializado', { clientId: client.id }, 'WARNING');
      return false;
    }

    try {
      console.log(`[Supabase] 💾 Gravando cliente "${client.name}" (ID: ${client.id}) no PostgreSQL...`);
      const payload = {
        id: client.id,
        person_type: client.personType || 'juridica',
        name: client.name,
        cpf_cnpj: client.cpfCnpj || null,
        company_name: client.companyName || client.name,
        segment: client.segment || 'Geral',
        contact_name: client.contactName || client.name,
        contact_role: client.contactRole || null,
        email: client.email || null,
        emails: client.emails || [],
        phone: client.phone || null,
        phones: client.phones || [],
        birth_date: client.birthDate || null,
        cover_color: client.coverColor || null,
        avatar: client.avatar || null,
        status: client.status || 'Ativo',
        monthly_fee: client.monthlyFee || 0,
        services: client.services || [],
        active_demands_count: client.activeDemandsCount || 0,
        joined_date: client.joinedDate || null,
        website: client.website || null,
        instagram: client.instagram || null,
        address: client.address || null,
        cep: client.cep || null,
        street: client.street || null,
        number: client.number || null,
        complement: client.complement || null,
        neighborhood: client.neighborhood || null,
        city: client.city || null,
        state: client.state || null,
        notes: client.notes || null,
        history: client.history || [],
        lgpd_consent_date: client.lgpdConsentDate || null,
        lgpd_consent_purpose: client.lgpdConsentPurpose || null,
        is_anonymized: Boolean(client.isAnonymized),
        anonymized_at: client.anonymizedAt || null,
        portal_username: client.portalUsername || null,
        portal_password: client.portalPassword || null,
        portal_access_enabled: client.portalAccessEnabled !== false,
      };

      const { error } = await resilientSupabaseUpsert(supabase, 'clients', payload);
      if (error) {
        if (isNetworkOrFetchError(error)) {
          console.warn(`[Supabase] ℹ️ Conexão Supabase temporariamente inalcançável (${error.message || error}). Cliente "${client.name}" (ID: ${client.id}) preservado no banco central.`);
          recordSyncFailure('UPSERT_CLIENT', error.message || error, { clientId: client.id }, 'WARNING');
        } else {
          console.warn(`[Supabase] ⚠️ Aviso ao gravar cliente "${client.id}" no PostgreSQL:`, error.message || error);
          recordSyncFailure('UPSERT_CLIENT', error.message || error, { clientId: client.id, error });
        }
        return false;
      }
      console.log(`[Supabase] ✅ Cliente "${client.name}" (ID: ${client.id}) persistido no PostgreSQL com sucesso.`);
      return true;
    } catch (e: any) {
      if (isNetworkOrFetchError(e)) {
        console.warn(`[Supabase] ℹ️ Conexão de rede inalcançável para cliente "${client.id}". Salvo no banco central.`);
        recordSyncFailure('UPSERT_CLIENT', e?.message || e, { clientId: client.id }, 'WARNING');
      } else {
        console.warn(`[Supabase] ⚠️ Aviso ao sincronizar cliente "${client.id}":`, e?.message || e);
        recordSyncFailure('UPSERT_CLIENT', e?.message || e, { clientId: client.id, error: e });
      }
      return false;
    }
  },

  async deleteClient(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      console.log(`[Supabase] 🗑️ Excluindo cliente ID: ${id} no PostgreSQL...`);
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        if (isNetworkOrFetchError(error)) {
          console.warn(`[Supabase] ℹ️ Conexão Supabase inalcançável ao excluir cliente ID: ${id}. Operação mantida no banco central.`);
        } else {
          console.warn(`[Supabase] ⚠️ Aviso ao excluir cliente ID: ${id}:`, error.message || error);
        }
        recordSyncFailure('DELETE_CLIENT', error.message || error, { id, error });
        return false;
      }
      console.log(`[Supabase] ✅ Cliente ID: ${id} excluído do PostgreSQL com sucesso.`);
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_CLIENT', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // SERVIÇOS
  // ==================================================================
  async fetchServices(): Promise<Service[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      recordSyncFailure('FETCH_SERVICES', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        recordSyncFailure('FETCH_SERVICES', error.message || error, { error });
        return null;
      }

      return (data || []).map((row: any): Service => ({
        id: row.id,
        title: row.title,
        category: row.category || 'Social Media',
        description: row.description || '',
        basePrice: Number(row.base_price) || 0,
        isMonthly: Boolean(row.is_monthly),
        deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
        activeClientsCount: Number(row.active_clients_count) || 0,
      }));
    } catch (e: any) {
      recordSyncFailure('FETCH_SERVICES', e?.message || e, e);
      return null;
    }
  },

  async upsertService(service: Service): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: service.id,
        title: service.title,
        category: service.category,
        description: service.description || '',
        base_price: service.basePrice || 0,
        is_monthly: service.isMonthly,
        deliverables: service.deliverables || [],
        active_clients_count: service.activeClientsCount || 0,
        updated_at: new Date().toISOString(),
      };
      const { error } = await resilientSupabaseUpsert(supabase, 'services', payload);
      if (error) {
        recordSyncFailure('UPSERT_SERVICE', error.message || error, { service, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('UPSERT_SERVICE', e?.message || e, { service, error: e });
      return false;
    }
  },

  async deleteService(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) {
        recordSyncFailure('DELETE_SERVICE', error.message || error, { id, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_SERVICE', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // ORÇAMENTOS E PROPOSTAS
  // ==================================================================
  async fetchProposals(): Promise<BudgetProposal[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      recordSyncFailure('FETCH_PROPOSALS', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        recordSyncFailure('FETCH_PROPOSALS', error.message || error, { error });
        return null;
      }

      return (data || []).map((row: any): BudgetProposal => ({
        id: row.id,
        code: row.code,
        clientName: row.client_name,
        projectName: row.project_name,
        totalValue: Number(row.total_value) || 0,
        date: row.date,
        status: (row.status as any) || 'Rascunho',
        servicesCount: Number(row.services_count) || 0,
      }));
    } catch (e: any) {
      recordSyncFailure('FETCH_PROPOSALS', e?.message || e, e);
      return null;
    }
  },

  async upsertProposal(proposal: BudgetProposal): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: proposal.id,
        code: proposal.code,
        client_name: proposal.clientName,
        project_name: proposal.projectName,
        total_value: proposal.totalValue || 0,
        date: proposal.date,
        status: proposal.status || 'Rascunho',
        services_count: proposal.servicesCount || 0,
        updated_at: new Date().toISOString(),
      };
      const { error } = await resilientSupabaseUpsert(supabase, 'proposals', payload);
      if (error) {
        recordSyncFailure('UPSERT_PROPOSAL', error.message || error, { proposal, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('UPSERT_PROPOSAL', e?.message || e, { proposal, error: e });
      return false;
    }
  },

  async deleteProposal(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) {
        recordSyncFailure('DELETE_PROPOSAL', error.message || error, { id, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_PROPOSAL', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // FATURAS / FINANCEIRO
  // ==================================================================
  async fetchInvoices(): Promise<Invoice[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      recordSyncFailure('FETCH_INVOICES', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        recordSyncFailure('FETCH_INVOICES', error.message || error, { error });
        return null;
      }

      return (data || []).map((row: any): Invoice => ({
        id: row.id,
        client: row.client,
        clientInitial: row.client_initial || undefined,
        service: row.service,
        value: Number(row.value) || 0,
        dueDate: row.due_date,
        status: (row.status as any) || 'Pendente',
        category: row.category || 'Geral',
        paymentMethod: row.payment_method || 'PIX',
      }));
    } catch (e: any) {
      recordSyncFailure('FETCH_INVOICES', e?.message || e, e);
      return null;
    }
  },

  async upsertInvoice(invoice: Invoice): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: invoice.id,
        client: invoice.client,
        client_initial: invoice.clientInitial || null,
        service: invoice.service,
        value: invoice.value || 0,
        due_date: invoice.dueDate,
        status: invoice.status || 'Pendente',
        category: invoice.category || 'Geral',
        payment_method: invoice.paymentMethod || 'PIX',
        updated_at: new Date().toISOString(),
      };
      const { error } = await resilientSupabaseUpsert(supabase, 'invoices', payload);
      if (error) {
        recordSyncFailure('UPSERT_INVOICE', error.message || error, { invoice, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('UPSERT_INVOICE', e?.message || e, { invoice, error: e });
      return false;
    }
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) {
        recordSyncFailure('DELETE_INVOICE', error.message || error, { id, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_INVOICE', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // MEMBROS DA EQUIPE
  // ==================================================================
  async fetchTeamMembers(): Promise<TeamMember[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      recordSyncFailure('FETCH_TEAM_MEMBERS', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        recordSyncFailure('FETCH_TEAM_MEMBERS', error.message || error, { error });
        console.warn('Erro ao buscar membros no Supabase:', error);
        return null;
      }

      // Recupera cache local para proteger senhas e usuários caso o banco ainda não tenha as colunas
      let localMembers: TeamMember[] = [];
      try {
        const saved = localStorage.getItem('agency_team_members');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) localMembers = parsed;
        }
      } catch {}

      return (data || []).map((row: any): TeamMember => {
        const localMatch = localMembers.find((l) => l.id === row.id);
        const isOwner = row.id === 'tm-1' || String(row.name || '').toLowerCase().includes('marcos lancerotti');

        let parsedMeta: any = {};
        const cleanSpecialties: string[] = [];
        if (Array.isArray(row.specialties)) {
          row.specialties.forEach((s: any) => {
            if (typeof s === 'string' && s.startsWith('__meta__:')) {
              try {
                parsedMeta = JSON.parse(s.slice(9));
              } catch {}
            } else {
              cleanSpecialties.push(String(s));
            }
          });
        }

        return {
          id: row.id,
          name: row.name,
          role: row.role,
          functionRole: row.function_role || parsedMeta.functionRole || localMatch?.functionRole || row.role,
          email: row.email,
          avatar: row.avatar || localMatch?.avatar || '',
          activeTasks: Number(row.active_tasks) || 0,
          status: (row.status as any) || 'Disponível',
          specialties: cleanSpecialties.length > 0 ? cleanSpecialties : (localMatch?.specialties || []),
          username: row.username || parsedMeta.username || localMatch?.username || (isOwner ? 'lancerotti' : undefined),
          password: row.password || parsedMeta.password || localMatch?.password || (isOwner ? '521Spide#*' : '123456'),
          permissions: parsedMeta.permissions || localMatch?.permissions,
          createdBy: row.created_by || parsedMeta.createdBy || localMatch?.createdBy || undefined,
          createdAt: row.created_at || localMatch?.createdAt || undefined,
        };
      });
    } catch (e: any) {
      recordSyncFailure('FETCH_TEAM_MEMBERS', e?.message || e, e);
      return null;
    }
  },

  async upsertTeamMember(member: TeamMember): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      // Codifica metadados essenciais (permissões, usuário, senha, cargo detalhado, data de criação) em __meta__
      // para garantir persistência robusta sem falhas de cache de schema no Supabase
      const metaTag = `__meta__:${JSON.stringify({
        functionRole: member.functionRole,
        username: member.username,
        password: member.password,
        permissions: member.permissions,
        createdBy: member.createdBy,
        createdAt: member.createdAt,
      })}`;

      const rawSpecialties = Array.isArray(member.specialties)
        ? member.specialties.filter((s) => typeof s === 'string' && !s.startsWith('__meta__:'))
        : [];

      const payload: any = {
        id: member.id,
        name: member.name,
        role: member.role,
        email: member.email,
        avatar: member.avatar || '',
        active_tasks: member.activeTasks || 0,
        status: member.status || 'Disponível',
        specialties: [...rawSpecialties, metaTag],
      };

      const { error } = await resilientSupabaseUpsert(supabase, 'team_members', payload);
      if (error) {
        recordSyncFailure('UPSERT_TEAM_MEMBER', error.message || error, { member, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('UPSERT_TEAM_MEMBER', e?.message || e, { member, error: e });
      return false;
    }
  },

  async deleteTeamMember(id: string): Promise<boolean> {
    // Proteção absoluta: Marcos Lancerotti (Dono da Agência) nunca pode ser excluído
    if (id === 'tm-1') {
      console.warn('Ação bloqueada no Supabase: Marcos Lancerotti é o Dono da Agência e não pode ser excluído.');
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) {
        recordSyncFailure('DELETE_TEAM_MEMBER', error.message || error, { id, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_TEAM_MEMBER', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // COLUNAS DO KANBAN
  // ==================================================================
  async fetchKanbanColumns(): Promise<KanbanColumn[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      recordSyncFailure('FETCH_KANBAN_COLUMNS', 'Supabase não inicializado ou credenciais ausentes no storage', undefined, 'WARNING');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position_order', { ascending: true });

      if (error) {
        recordSyncFailure('FETCH_KANBAN_COLUMNS', error.message || error, { error });
        return null;
      }

      return (data || []).map((row: any): KanbanColumn => ({
        id: row.id,
        title: row.title,
        count: 0,
        color: row.color,
        buttonBg: row.button_bg,
        isCustom: Boolean(row.is_custom),
      }));
    } catch (e: any) {
      recordSyncFailure('FETCH_KANBAN_COLUMNS', e?.message || e, e);
      return null;
    }
  },

  async upsertKanbanColumn(column: KanbanColumn, positionOrder = 0): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const payload = {
        id: column.id,
        title: column.title,
        color: column.color || '#FAB518',
        button_bg: column.buttonBg || 'bg-amber-500 hover:bg-amber-600',
        is_custom: Boolean(column.isCustom),
        position_order: positionOrder,
      };
      const { error } = await resilientSupabaseUpsert(supabase, 'kanban_columns', payload);
      if (error) {
        recordSyncFailure('UPSERT_KANBAN_COLUMN', error.message || error, { column, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('UPSERT_KANBAN_COLUMN', e?.message || e, { column, error: e });
      return false;
    }
  },

  async syncAllKanbanColumns(columns: KanbanColumn[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || !Array.isArray(columns) || columns.length === 0) return false;

    try {
      const payloads = columns.map((col, idx) => ({
        id: col.id,
        title: col.title,
        color: col.color || '#FAB518',
        button_bg: col.buttonBg || 'bg-amber-500 hover:bg-amber-600',
        is_custom: Boolean(col.isCustom),
        position_order: idx + 1,
      }));

      const { error } = await resilientSupabaseUpsert(supabase, 'kanban_columns', payloads);
      if (error) {
        recordSyncFailure('SYNC_ALL_KANBAN_COLUMNS', error.message || error, { error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('SYNC_ALL_KANBAN_COLUMNS', e?.message || e, e);
      return false;
    }
  },

  async deleteKanbanColumn(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('kanban_columns').delete().eq('id', id);
      if (error) {
        recordSyncFailure('DELETE_KANBAN_COLUMN', error.message || error, { id, error });
        return false;
      }
      return true;
    } catch (e: any) {
      recordSyncFailure('DELETE_KANBAN_COLUMN', e?.message || e, { id, error: e });
      return false;
    }
  },

  // ==================================================================
  // MIGRAÇÃO E SINCRONIZAÇÃO COMPLETA DE TODO O SISTEMA
  // ==================================================================
  async syncAllLocalDataToSupabase(
    demands: DemandItem[], 
    clients: Client[],
    customUrl?: string,
    customKey?: string,
    services?: Service[],
    proposals?: BudgetProposal[],
    invoices?: Invoice[],
    teamMembers?: TeamMember[],
    kanbanColumns?: KanbanColumn[]
  ): Promise<SyncResult> {
    const supabase = getSupabaseClient(customUrl, customKey);
    const result: SyncResult = { 
      clientsUploaded: 0, 
      demandsUploaded: 0, 
      servicesUploaded: 0, 
      proposalsUploaded: 0, 
      invoicesUploaded: 0, 
      teamMembersUploaded: 0,
      kanbanColumnsUploaded: 0,
      errors: [] 
    };

    if (!supabase) {
      result.errors.push('Cliente Supabase não configurado. Preencha URL e Chave.');
      return result;
    }

    // 1. Clientes com auto-cura para colunas antigas
    if (clients && clients.length > 0) {
      try {
        const clientPayloads = clients.map(c => ({
          id: c.id,
          person_type: c.personType || 'juridica',
          name: c.name,
          cpf_cnpj: c.cpfCnpj || null,
          company_name: c.companyName || c.name,
          segment: c.segment || 'Geral',
          contact_name: c.contactName || c.name,
          contact_role: c.contactRole || null,
          email: c.email || null,
          emails: c.emails || [],
          phone: c.phone || null,
          phones: c.phones || [],
          birth_date: c.birthDate || null,
          cover_color: c.coverColor || null,
          avatar: c.avatar || null,
          status: c.status || 'Ativo',
          monthly_fee: c.monthlyFee || 0,
          services: c.services || [],
          active_demands_count: c.activeDemandsCount || 0,
          joined_date: c.joinedDate || null,
          website: c.website || null,
          instagram: c.instagram || null,
          address: c.address || null,
          cep: c.cep || null,
          street: c.street || null,
          number: c.number || null,
          complement: c.complement || null,
          neighborhood: c.neighborhood || null,
          city: c.city || null,
          state: c.state || null,
          notes: c.notes || null,
          history: c.history || [],
          lgpd_consent_date: c.lgpdConsentDate || null,
          lgpd_consent_purpose: c.lgpdConsentPurpose || null,
          is_anonymized: Boolean(c.isAnonymized),
          anonymized_at: c.anonymizedAt || null,
          portal_username: c.portalUsername || null,
          portal_password: c.portalPassword || null,
          portal_access_enabled: c.portalAccessEnabled !== false,
        }));

        const { error } = await resilientSupabaseUpsert(supabase, 'clients', clientPayloads);
        if (error) {
          result.errors.push(`Erro na tabela clients: ${error.message}`);
        } else {
          result.clientsUploaded = clients.length;
        }
      } catch (err: any) {
        result.errors.push(`Falha no upload de clientes: ${err.message}`);
      }
    }

    // 2. Demandas com auto-cura para colunas antigas
    if (demands && demands.length > 0) {
      try {
        const demandPayloads = demands.map(d => ({
          id: d.id,
          title: d.title,
          client_name: d.client,
          client_id: d.clientId || null,
          client_project: d.clientProject || null,
          description: d.description || '',
          type: d.type || 'Post',
          service_category: d.serviceCategory || 'Social Media',
          column_id: d.columnId || 'ideias',
          priority: d.priority || 'media',
          priority_bars: d.priorityBars ?? 2,
          due_date: d.dueDate || null,
          assignee: d.assignee,
          thumbnail: d.thumbnail || null,
          status_label: d.statusLabel || null,
          checklist_total: d.checklistTotal ?? 0,
          checklist_completed: d.checklistCompleted ?? 0,
          comments_count: d.commentsCount ?? 0,
          attachments_count: d.attachmentsCount ?? (d.attachments?.length || 0),
          approval_status: d.approvalStatus || null,
          approval_feedback: d.approvalFeedback || null,
          approval_sent_at: d.approvalSentAt || null,
          approval_answered_at: d.approvalAnsweredAt || null,
          client_portal_token: d.clientPortalToken || null,
          whatsapp_notified: Boolean(d.whatsappNotified),
          attachments: d.attachments || [],
          updated_at: new Date().toISOString(),
        }));

        const { error } = await resilientSupabaseUpsert(supabase, 'demands', demandPayloads);
        if (error) {
          result.errors.push(`Erro na tabela demands: ${error.message}`);
        } else {
          result.demandsUploaded = demands.length;
        }
      } catch (err: any) {
        result.errors.push(`Falha no upload de demandas: ${err.message}`);
      }
    }

    // 3. Serviços (catálogo)
    if (services && services.length > 0) {
      try {
        const servicePayloads = services.map(s => ({
          id: s.id,
          title: s.title,
          category: s.category,
          description: s.description || '',
          base_price: s.basePrice || 0,
          is_monthly: s.isMonthly,
          deliverables: s.deliverables || [],
          active_clients_count: s.activeClientsCount || 0,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await resilientSupabaseUpsert(supabase, 'services', servicePayloads);
        if (!error) result.servicesUploaded = services.length;
      } catch {}
    }

    // 4. Propostas e Orçamentos
    if (proposals && proposals.length > 0) {
      try {
        const proposalPayloads = proposals.map(p => ({
          id: p.id,
          code: p.code,
          client_name: p.clientName,
          project_name: p.projectName,
          total_value: p.totalValue || 0,
          date: p.date,
          status: p.status || 'Rascunho',
          services_count: p.servicesCount || 0,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await resilientSupabaseUpsert(supabase, 'proposals', proposalPayloads);
        if (!error) result.proposalsUploaded = proposals.length;
      } catch {}
    }

    // 5. Faturas (Financeiro)
    if (invoices && invoices.length > 0) {
      try {
        const invoicePayloads = invoices.map(i => ({
          id: i.id,
          client: i.client,
          client_initial: i.clientInitial || null,
          service: i.service,
          value: i.value || 0,
          due_date: i.dueDate,
          status: i.status || 'Pendente',
          category: i.category || 'Geral',
          payment_method: i.paymentMethod || 'PIX',
          updated_at: new Date().toISOString(),
        }));
        const { error } = await resilientSupabaseUpsert(supabase, 'invoices', invoicePayloads);
        if (!error) result.invoicesUploaded = invoices.length;
      } catch {}
    }

    // 6. Membros da Equipe (incluindo CEO e colaboradores)
    if (teamMembers && teamMembers.length > 0) {
      try {
        const teamPayloads = teamMembers.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          function_role: m.functionRole || m.role,
          email: m.email,
          avatar: m.avatar || '',
          active_tasks: m.activeTasks || 0,
          status: m.status || 'Disponível',
          specialties: m.specialties || [],
          username: m.username || null,
          password: m.password || null,
          created_by: m.createdBy || null,
        }));
        const { error } = await resilientSupabaseUpsert(supabase, 'team_members', teamPayloads);
        if (error) {
          result.errors.push(`Erro na tabela team_members: ${error.message}`);
        } else {
          result.teamMembersUploaded = teamMembers.length;
        }
      } catch (err: any) {
        result.errors.push(`Falha no upload de equipe: ${err.message}`);
      }
    }

    // 7. Colunas do Kanban
    if (kanbanColumns && kanbanColumns.length > 0) {
      try {
        const columnPayloads = kanbanColumns.map((col, idx) => ({
          id: col.id,
          title: col.title,
          color: col.color,
          button_bg: col.buttonBg,
          is_custom: Boolean(col.isCustom),
          position_order: idx + 1,
        }));
        const { error } = await resilientSupabaseUpsert(supabase, 'kanban_columns', columnPayloads);
        if (!error) result.kanbanColumnsUploaded = kanbanColumns.length;
      } catch {}
    }

    return result;
  },

  async syncCompleteSystem(payload: FullSyncPayload, customUrl?: string, customKey?: string): Promise<SyncResult> {
    return this.syncAllLocalDataToSupabase(
      payload.demands || [],
      payload.clients || [],
      customUrl,
      customKey,
      payload.services || [],
      payload.proposals || [],
      payload.invoices || [],
      payload.teamMembers || [],
      payload.kanbanColumns || []
    );
  },

  /**
   * Insere dados piloto de teste diretamente para verificar o funcionamento imediato das tabelas
   */
  async seedTestData(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient(customUrl, customKey);
    if (!supabase) {
      return { success: false, message: 'Supabase não conectado. Preencha e salve a URL e a Chave primeiro.' };
    }

    try {
      const testClientId = 'client-piloto-' + Math.floor(Math.random() * 10000);
      const testDemandId = 'demand-piloto-' + Math.floor(Math.random() * 10000);

      const clientPayload = {
        id: testClientId,
        name: 'Agência Help - Cliente Demonstração',
        company_name: 'Agência Help',
        segment: 'Marketing Digital',
        contact_name: 'Marcos Lancerotti',
        email: 'lancerottirmarcos@gmail.com',
        phone: '(11) 98765-4321',
        status: 'Ativo',
        monthly_fee: 4500.00,
        services: ['Gestão de Tráfego', 'Social Media', 'Branding'],
        active_demands_count: 1,
      };

      const { error: clientErr } = await resilientSupabaseUpsert(supabase, 'clients', clientPayload);

      if (clientErr) {
        if (clientErr.message?.includes('relation "public.clients" does not exist') || clientErr.code === '42P01') {
          return { success: false, message: 'A tabela "clients" não foi encontrada. Lembre-se de rodar o Script SQL no menu SQL Editor do Supabase.' };
        }
        return { success: false, message: `Erro ao gravar cliente de teste: ${clientErr.message}` };
      }

      const demandPayload = {
        id: testDemandId,
        title: 'Campanha Inaugural - Presença Digital',
        client_name: 'Help Ideias - Cliente Demonstração',
        client_project: 'Lançamento Institucional',
        description: 'Demanda de validação conectada com sucesso ao banco PostgreSQL Supabase.',
        type: 'Campanha',
        service_category: 'Social Media',
        column_id: 'producao',
        priority: 'alta',
        priority_bars: 3,
        due_date: 'Próxima semana',
        assignee: { name: 'Marcos Lancerotti', avatar: '' },
        status_label: 'Em Produção',
        attachments: [],
      };

      const { error: demandErr } = await resilientSupabaseUpsert(supabase, 'demands', demandPayload);

      if (demandErr) {
        if (demandErr.message?.includes('relation "public.demands" does not exist') || demandErr.code === '42P01') {
          return { success: false, message: 'A tabela "demands" não foi encontrada. Lembre-se de rodar o Script SQL no menu SQL Editor do Supabase.' };
        }
        return { success: false, message: `Erro ao gravar demanda de teste: ${demandErr.message}` };
      }

      return { 
        success: true, 
        message: 'Registros de teste inseridos com sucesso! Você já pode ver as linhas em "Table Editor" no painel do Supabase.' 
      };
    } catch (e: any) {
      return { success: false, message: `Exceção ao inserir teste: ${e.message}` };
    }
  }
};

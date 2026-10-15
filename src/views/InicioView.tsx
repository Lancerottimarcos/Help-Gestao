import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  UserPlus,
  Kanban, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles,
  ChevronRight,
  ArrowRight,
  Calendar,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CalendarX2,
  Building2,
  Flame,
  Search,
  Layers,
  Compass,
  LayoutGrid,
  BarChart3,
  Check,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import { Client, DemandItem, KanbanColumn, PageId, ClientActivity, Invoice, TeamMember } from '../types';
import { ClientLocationMap } from '../components/ClientLocationMap';
import { ClientBirthdaysSection } from '../components/ClientBirthdaysSection';
import { DemandsStoriesSection } from '../components/DemandsStoriesSection';
import { DemandsStatusDoughnutChart } from '../components/DemandsStatusDoughnutChart';
import { initialRecentActivities, currentUser, kanbanColumnsData } from '../data/mockData';

const parseDemandDate = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T]/);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }
  return null;
};

const formatDemandDateFull = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

interface DemandDueStatus {
  status: 'atrasada' | 'hoje' | 'amanha' | 'semana' | 'futuro' | 'sem_prazo' | 'concluida' | 'regular';
  label: string;
  isOverdue: boolean;
  daysDiff: number;
  badgeClass: string;
}

export const isConcludedColumn = (columnId?: string, columns?: KanbanColumn[]): boolean => {
  if (!columnId) return false;
  const colLower = columnId.toLowerCase().trim();
  if (
    colLower === 'concluidas' ||
    colLower === 'concluidos' ||
    colLower === 'concluida' ||
    colLower === 'concluido' ||
    colLower === 'done' ||
    colLower === 'finalizado' ||
    colLower === 'finalizados' ||
    colLower === 'finalizada' ||
    colLower === 'finalizadas' ||
    colLower.includes('conclu')
  ) {
    return true;
  }
  if (columns && columns.length > 0) {
    const matchedCol = columns.find(c => c.id.toLowerCase().trim() === colLower);
    if (matchedCol) {
      const titleLower = (matchedCol.title || '').toLowerCase().trim();
      if (
        titleLower.includes('conclu') ||
        titleLower.includes('finaliz') ||
        titleLower === 'done' ||
        titleLower === 'pronto' ||
        titleLower === 'entregue'
      ) {
        return true;
      }
    }
  }
  return false;
};

export const isConcludedDemand = (demand: DemandItem, columns?: KanbanColumn[]): boolean => {
  if (isConcludedColumn(demand.columnId, columns)) return true;
  const statusLower = (demand.statusLabel || '').toLowerCase().trim();
  if (statusLower.includes('conclu') || statusLower.includes('finaliz') || statusLower === 'done') return true;
  return false;
};

const getDemandDueStatus = (demand: DemandItem, columns?: KanbanColumn[]): DemandDueStatus => {
  if (isConcludedDemand(demand, columns)) {
    return {
      status: 'concluida',
      label: 'Concluída',
      isOverdue: false,
      daysDiff: 0,
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold'
    };
  }

  if (!demand.dueDate) {
    return {
      status: 'sem_prazo',
      label: 'Sem prazo',
      isOverdue: false,
      daysDiff: 0,
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };
  }

  const parsed = parseDemandDate(demand.dueDate);
  if (!parsed) {
    const lower = demand.dueDate.toLowerCase();
    if (lower.includes('ontem') || lower.includes('atrasad')) {
      return {
        status: 'atrasada',
        label: 'Prazo vencido',
        isOverdue: true,
        daysDiff: -1,
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/80 dark:border-rose-800'
      };
    }
    return {
      status: 'regular',
      label: demand.dueDate,
      isOverdue: false,
      daysDiff: 0,
      badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800/70'
    };
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'atrasada',
      label: daysAgo === 1 ? '1d atrasado' : `${daysAgo}d atrasado`,
      isOverdue: true,
      daysDiff: diffDays,
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/80 dark:border-rose-800 font-bold'
    };
  }
  if (diffDays === 0) {
    return {
      status: 'hoje',
      label: 'Vence hoje',
      isOverdue: false,
      daysDiff: 0,
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300/80 dark:border-amber-700 font-bold'
    };
  }
  if (diffDays === 1) {
    return {
      status: 'amanha',
      label: 'Vence amanhã',
      isOverdue: false,
      daysDiff: 1,
      badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800'
    };
  }
  if (diffDays <= 7) {
    return {
      status: 'semana',
      label: `Em ${diffDays} dias`,
      isOverdue: false,
      daysDiff: diffDays,
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  return {
    status: 'futuro',
    label: formatDemandDateFull(demand.dueDate),
    isOverdue: false,
    daysDiff: diffDays,
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
};

type InicioMainTab = 'visao_geral' | 'demandas_prazos' | 'clientes_crm' | 'desempenho_equipe';

interface InicioViewProps {
  onNavigate: (page: PageId) => void;
  demands: DemandItem[];
  clients: Client[];
  columns?: KanbanColumn[];
  teamMembers?: TeamMember[];
  invoices?: Invoice[];
  activities?: ClientActivity[];
  onOpenNewDemandModal: () => void;
  onSelectDemand?: (demandId: string) => void;
  onSelectClient?: (client: Client) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({
  onNavigate,
  demands,
  clients,
  columns = [],
  teamMembers = [],
  invoices = [],
  activities = initialRecentActivities,
  onOpenNewDemandModal,
  onSelectDemand,
  onSelectClient,
}) => {
  // Aba principal de navegação estilizada no mesmo padrão do Financeiro
  const [currentTab, setCurrentTab] = useState<InicioMainTab>('visao_geral');
  const [criticalFilter, setCriticalFilter] = useState<'atrasadas' | 'hoje' | 'proximas'>('atrasadas');
  const [demandTab, setDemandTab] = useState<'todas' | 'atrasadas' | 'hoje' | 'proximas' | 'producao' | 'aprovacao'>('todas');
  const [demandSearch, setDemandSearch] = useState('');

  // Sincronização dinâmica de responsável com a Equipe
  const getAssigneeInfo = (assignee?: { name?: string; avatar?: string }) => {
    const rawName = assignee?.name || '';
    const rawAvatar = assignee?.avatar || '';
    if (!rawName) {
      return { name: 'Não atribuído', avatar: '' };
    }
    const matched = teamMembers.find(
      (m) =>
        m.name?.trim().toLowerCase() === rawName.trim().toLowerCase() ||
        m.name?.split(' ')[0]?.toLowerCase() === rawName.split(' ')[0]?.toLowerCase() ||
        (m.username && m.username.toLowerCase() === rawName.toLowerCase())
    );
    return {
      name: matched?.name || rawName,
      avatar: matched?.avatar || rawAvatar,
    };
  };

  // Informações completas do cliente associado à demanda
  const getClientInfo = (demand: DemandItem) => {
    const rawClientName = demand.client || '';
    const matched = clients.find(
      (c) =>
        (demand.clientId && c.id === demand.clientId) ||
        (c.name && rawClientName && c.name.toLowerCase().trim() === rawClientName.toLowerCase().trim()) ||
        (c.companyName && rawClientName && c.companyName.toLowerCase().trim() === rawClientName.toLowerCase().trim()) ||
        (c.id && rawClientName && c.id.toLowerCase().trim() === rawClientName.toLowerCase().trim())
    );

    const displayName = matched?.name || matched?.companyName || rawClientName || 'Cliente';
    const avatar = matched?.avatar || '';
    const initial = (displayName.charAt(0) || 'C').toUpperCase();

    return {
      client: matched,
      displayName,
      avatar,
      initial,
    };
  };

  // Colunas ativas sincronizadas com o Kanban
  const activeColumns = useMemo(() => {
    if (columns && columns.length > 0) return columns;
    try {
      const saved = localStorage.getItem('agency_kanban_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return kanbanColumnsData;
  }, [columns]);

  // Demandas ativas: NUNCA inclui concluídas
  const activeDemands = useMemo(() => demands.filter((d) => !isConcludedDemand(d, activeColumns)), [demands, activeColumns]);
  const concludedDemands = useMemo(() => demands.filter((d) => isConcludedDemand(d, activeColumns)), [demands, activeColumns]);
  const inProduction = useMemo(() => activeDemands.filter((d) => d.columnId === 'producao'), [activeDemands]);
  const pendingApprovals = useMemo(() => activeDemands.filter((d) => d.columnId === 'aprovacao'), [activeDemands]);
  const scheduledDemands = useMemo(() => activeDemands.filter((d) => d.columnId === 'agendamento'), [activeDemands]);

  const demandDueStatusMap = useMemo(() => {
    const map = new Map<string, DemandDueStatus>();
    demands.forEach((d) => {
      map.set(d.id, getDemandDueStatus(d, activeColumns));
    });
    return map;
  }, [demands, activeColumns]);

  // 1. Demandas Atrasadas
  const overdueDemands = useMemo(() => {
    return activeDemands.filter((d) => demandDueStatusMap.get(d.id)?.isOverdue);
  }, [activeDemands, demandDueStatusMap]);

  // 2. Demandas do Dia
  const dueTodayDemands = useMemo(() => {
    return activeDemands.filter((d) => {
      const st = demandDueStatusMap.get(d.id);
      return st && !st.isOverdue && st.status === 'hoje';
    });
  }, [activeDemands, demandDueStatusMap]);

  // 3. Próximas Demandas
  const upcomingDemands = useMemo(() => {
    return activeDemands.filter((d) => {
      const st = demandDueStatusMap.get(d.id);
      if (!st || st.isOverdue || st.status === 'hoje') return false;
      return st.status === 'amanha' || st.status === 'semana' || st.status === 'futuro' || st.status === 'regular' || st.status === 'sem_prazo';
    });
  }, [activeDemands, demandDueStatusMap]);

  // Lista de demandas críticas para o Card Dark da direita
  const criticalDemandsList = useMemo(() => {
    if (criticalFilter === 'atrasadas') return overdueDemands;
    if (criticalFilter === 'hoje') return dueTodayDemands;
    return upcomingDemands;
  }, [criticalFilter, overdueDemands, dueTodayDemands, upcomingDemands]);

  // Lista de demandas filtradas pela barra de busca e abas da tabela operacional
  const filteredDemandsList = useMemo(() => {
    let list = activeDemands;
    if (demandTab === 'atrasadas') {
      list = overdueDemands;
    } else if (demandTab === 'hoje') {
      list = dueTodayDemands;
    } else if (demandTab === 'proximas') {
      list = upcomingDemands;
    } else if (demandTab === 'producao') {
      list = inProduction;
    } else if (demandTab === 'aprovacao') {
      list = pendingApprovals;
    }

    list = list.filter((d) => !isConcludedDemand(d, activeColumns));

    if (demandSearch.trim()) {
      const q = demandSearch.toLowerCase().trim();
      list = list.filter((d) => 
        d.title.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        (d.clientProject && d.clientProject.toLowerCase().includes(q)) ||
        (d.type && d.type.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      const stA = demandDueStatusMap.get(a.id);
      const stB = demandDueStatusMap.get(b.id);
      if (stA?.isOverdue && !stB?.isOverdue) return -1;
      if (!stA?.isOverdue && stB?.isOverdue) return 1;
      if (stA?.isOverdue && stB?.isOverdue) {
        return (stA.daysDiff || 0) - (stB.daysDiff || 0);
      }
      if (stA?.status === 'hoje' && stB?.status !== 'hoje') return -1;
      if (stA?.status !== 'hoje' && stB?.status === 'hoje') return 1;
      if (stA?.status === 'amanha' && stB?.status !== 'amanha') return -1;
      if (stA?.status !== 'amanha' && stB?.status === 'amanha') return 1;
      const diffA = stA?.daysDiff ?? 999;
      const diffB = stB?.daysDiff ?? 999;
      return diffA - diffB;
    });
  }, [activeDemands, overdueDemands, dueTodayDemands, upcomingDemands, inProduction, pendingApprovals, demandTab, demandSearch, demandDueStatusMap, activeColumns]);

  const activeClients = clients.filter((c) => c.status === 'Ativo');

  // Dados para o gráfico do pipeline de produção (5 etapas principais do Kanban)
  const pipelineStages = useMemo(() => {
    return activeColumns.map((col) => {
      const count = demands.filter((d) => d.columnId === col.id).length;
      return {
        id: col.id,
        label: col.title,
        count,
        color: col.color || '#ff9900',
      };
    });
  }, [activeColumns, demands]);

  const maxPipelineCount = useMemo(() => {
    const maxVal = Math.max(...pipelineStages.map(s => s.count), 0);
    return maxVal > 0 ? maxVal : 10;
  }, [pipelineStages]);

  // Data formatada com saudação amigável
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  const formattedDateCapitalized = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const currentHour = new Date().getHours();
  let greeting = 'Bom dia';
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Boa tarde';
  } else if (currentHour >= 18 || currentHour < 5) {
    greeting = 'Boa noite';
  }

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-150">
      
      {/* ==================================================================== */}
      {/* 1. TOP SEGMENTED NAVIGATION TAB BAR & ACTION BUTTON                  */}
      {/*    (EXATAMENTE IDÊNTICO AO DESIGN DA PÁGINA FINANCEIRO)              */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Navigation Tabs Pill Container */}
        <div className="bg-white dark:bg-[#0c1424] rounded-full p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setCurrentTab('visao_geral')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'visao_geral'
                ? 'bg-[#ff9900] text-[#142142] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid size={15} className={currentTab === 'visao_geral' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Visão geral</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('demandas_prazos')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'demandas_prazos'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Kanban size={15} className={currentTab === 'demandas_prazos' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Demandas & Prazos</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('clientes_crm')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'clientes_crm'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Building2 size={15} className={currentTab === 'clientes_crm' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Clientes & CRM</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('desempenho_equipe')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'desempenho_equipe'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 size={15} className={currentTab === 'desempenho_equipe' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Desempenho & Equipe</span>
          </button>
        </div>

        {/* Action Button: + Nova Demanda */}
        <button
          type="button"
          onClick={onOpenNewDemandModal}
          className="px-6 py-2.5 rounded-full bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md shrink-0 active:scale-95"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Nova demanda</span>
        </button>
      </div>

      {/* Saudação Executiva com Data */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
            {formattedDateCapitalized}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {currentUser.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{activeDemands.length} demandas ativas no pipeline</span>
          <span aria-hidden="true">·</span>
          <span>{clients.length} clientes cadastrados</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP METRIC PILLS ROW (4 CAPSULE CARDS DISTINTOS DO FINANCEIRO)    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Fluxo em Andamento (Orange Solid Capsule) */}
        <div 
          onClick={() => onNavigate('demandas')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver demandas no Quadro Kanban"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Fluxo em Andamento
          </p>
          <div className="w-full bg-[#ff9900] hover:bg-[#e68a00] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs transition-all">
            <span className="font-black text-slate-950 text-sm tracking-tight tabular-nums">
              {activeDemands.length} demandas
            </span>
            <span className="text-[11px] font-bold text-slate-900/80 flex items-center gap-0.5">
              <span>•</span> {inProduction.length} produção
            </span>
          </div>
        </div>

        {/* KPI 2: Carteira de Clientes (Dark/Black Solid Capsule) */}
        <div 
          onClick={() => onNavigate('clientes')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver carteira de clientes"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Carteira de Clientes
          </p>
          <div className="w-full bg-[#12151e] hover:bg-[#1a1f2e] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs border border-slate-800/60 transition-all">
            <span className="font-black text-white text-sm tracking-tight tabular-nums">
              {clients.length} contas
            </span>
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5">
              <span>•</span> {activeClients.length} ativas
            </span>
          </div>
        </div>

        {/* KPI 3: Entregas para Hoje (Light Grey Capsule) */}
        <div 
          onClick={() => {
            setCurrentTab('demandas_prazos');
            setDemandTab('hoje');
          }}
          className="space-y-1.5 cursor-pointer group"
          title="Filtrar demandas com vencimento hoje"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Entregas de Hoje
          </p>
          <div className="w-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs transition-all">
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight tabular-nums">
              {dueTodayDemands.length} para hoje
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
              <span>•</span> {upcomingDemands.length} agendadas
            </span>
          </div>
        </div>

        {/* KPI 4: Atrasados (Diagonal Stripe Hatched Texture Capsule) */}
        <div 
          onClick={() => {
            setCurrentTab('demandas_prazos');
            setDemandTab('atrasadas');
          }}
          className="space-y-1.5 cursor-pointer group"
          title="Filtrar demandas com prazo vencido"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Prazos Atrasados
          </p>
          <div 
            className="w-full rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs border border-rose-300 dark:border-rose-900/50 relative overflow-hidden transition-all"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 8px, #edf2f7 8px, #edf2f7 16px)'
            }}
          >
            <span className="font-black text-rose-600 dark:text-rose-500 text-sm tracking-tight relative z-10 tabular-nums">
              {overdueDemands.length} em atraso
            </span>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 relative z-10">
              {overdueDemands.length > 0 ? '• Crítico' : '• 100% no prazo'}
            </span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. ABA ATIVA: "Visão Geral"                                          */}
      {/*    (LAYOUT EM GRADE 7:5 COM CARD LIGHT À ESQUERDA E DARK À DIREITA)  */}
      {/* ==================================================================== */}
      {currentTab === 'visao_geral' && (
        <div className="space-y-6">
          
          {/* Grid Principal 7:5 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* ---------------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: Pipeline de Produção & Entregas (7 cols)        */}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-6">
              
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#ff9900] flex items-center justify-center border border-amber-200/60 dark:border-amber-900/40 shadow-xs">
                    <Kanban size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Pipeline de Produção & Entregas
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Volume operacional distribuído pelas etapas do Kanban
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('demandas')}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#ff9900] hover:text-[#e68a00] cursor-pointer"
                >
                  <span>Abrir Kanban</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Área do Gráfico de Barras com Linhas Pontilhadas */}
              <div className="relative pt-4 pb-2">
                {/* Linhas de grade horizontais pontilhadas */}
                <div className="space-y-7 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums">{maxPipelineCount}</span>
                    <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums">{Math.round(maxPipelineCount * 0.75)}</span>
                    <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums">{Math.round(maxPipelineCount * 0.5)}</span>
                    <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums">{Math.round(maxPipelineCount * 0.25)}</span>
                    <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums">0</span>
                    <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                </div>

                {/* Barras Horizontais / Verticais proporcionais */}
                <div className="absolute inset-0 left-9 right-2 bottom-6 top-6 flex items-end justify-between px-3 sm:px-6">
                  {pipelineStages.map((stage) => {
                    const heightPercent = maxPipelineCount > 0 ? Math.min(100, Math.round((stage.count / maxPipelineCount) * 100)) : 0;
                    return (
                      <div 
                        key={stage.id} 
                        className="flex flex-col items-center gap-2 group relative z-10 cursor-pointer"
                        onClick={() => onNavigate('demandas')}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-20">
                          <span className="font-bold text-[#ff9900]">{stage.label}:</span> {stage.count} demanda(s)
                        </div>

                        {/* Barra */}
                        <div 
                          className="w-5 sm:w-7 bg-[#ff9900] hover:bg-[#e68a00] rounded-full transition-all shadow-xs min-h-[6px]"
                          style={{ height: `${Math.max(6, heightPercent * 1.25)}px` }}
                        />

                        {/* Label da Etapa */}
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[65px] text-center" title={stage.label}>
                          {stage.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda do Gráfico */}
                <div className="flex items-center justify-end gap-5 pt-7 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900]" />
                    <span>Demandas Ativas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                    <span>Capacidade da Agência</span>
                  </div>
                </div>

              </div>

              {/* Faixa métrica inferior dividida por borda pontilhada */}
              <div className="pt-5 border-t border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Em Produção</p>
                  <p className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight pt-0.5 tabular-nums">
                    {inProduction.length} demandas
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Aprovação Cliente</p>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-400 tracking-tight pt-0.5 tabular-nums">
                    {pendingApprovals.length} pendentes
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Para Agendamento</p>
                  <p className="text-sm font-black text-purple-600 dark:text-purple-400 tracking-tight pt-0.5 tabular-nums">
                    {scheduledDemands.length} agendadas
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Concluídas</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight pt-0.5 tabular-nums">
                    {concludedDemands.length} entregas
                  </p>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------- */}
            {/* COLUNA DIREITA: Prazos Críticos Dark Card (5 cols)               */}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-5 bg-[#10141e] text-white rounded-[28px] p-6 sm:p-7 shadow-xl border border-slate-800/80 flex flex-col justify-between space-y-6">
              
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Prazos Críticos & Alertas
                    </h2>
                    <p className="text-xs text-slate-400">
                      Entregas urgentes que exigem atenção imediata
                    </p>
                  </div>
                </div>

                {/* Segmented Filter Pills estilo Financeiro */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                  <button
                    type="button"
                    onClick={() => setCriticalFilter('atrasadas')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      criticalFilter === 'atrasadas'
                        ? 'bg-[#331114] text-[#f87171] border border-rose-900/50 shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    Atrasadas ({overdueDemands.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCriticalFilter('hoje')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      criticalFilter === 'hoje'
                        ? 'bg-[#332211] text-[#fbbf24] border border-amber-900/50 shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    Para Hoje ({dueTodayDemands.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCriticalFilter('proximas')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      criticalFilter === 'proximas'
                        ? 'bg-[#142142] text-[#60a5fa] border border-blue-900/50 shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    Próximas ({upcomingDemands.length})
                  </button>
                </div>

                {/* Lista de Demandas Críticas */}
                <div className="space-y-3 pt-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {criticalDemandsList.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 mb-1">
                        <CheckCircle2 size={20} />
                      </div>
                      <p className="text-xs font-bold text-white">Nenhum prazo crítico em aberto</p>
                      <p className="text-[11px] text-slate-400">
                        {criticalFilter === 'atrasadas' 
                          ? 'Excelente! Todas as demandas da agência estão dentro do prazo previsto.' 
                          : 'Nenhuma entrega agendada nesta categoria.'}
                      </p>
                    </div>
                  ) : (
                    criticalDemandsList.slice(0, 5).map((demand) => {
                      const dueStatus = demandDueStatusMap.get(demand.id) || getDemandDueStatus(demand);
                      const clientInfo = getClientInfo(demand);

                      return (
                        <div 
                          key={demand.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
                          onClick={() => onSelectDemand ? onSelectDemand(demand.id) : onNavigate('demandas')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar do Cliente */}
                            {clientInfo.avatar ? (
                              <img
                                src={clientInfo.avatar}
                                alt={clientInfo.displayName}
                                className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {clientInfo.initial}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover:text-[#ff9900] transition-colors">
                                {demand.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {clientInfo.displayName} · <span className={dueStatus.isOverdue ? 'text-rose-400 font-semibold' : 'text-amber-400'}>{dueStatus.label}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              dueStatus.isOverdue 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {demand.priority || 'Normal'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Botão de Rodapé */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('demandas')}
                  className="w-full py-2.5 px-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Ver todas as demandas no Kanban</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>

          </div>

          {/* Stories das Demandas (se houver demandas ativas) */}
          {activeDemands.length > 0 && (
            <DemandsStoriesSection
              clients={clients}
              demands={demands}
              columns={activeColumns}
              onSelectDemand={onSelectDemand}
              onOpenNewDemandModal={onOpenNewDemandModal}
            />
          )}

          {/* Seção Operacional com Atalhos e Ações Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <button
              type="button"
              onClick={onOpenNewDemandModal}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#ff9900]/80 transition-all text-left flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#ff9900] flex items-center justify-center border border-amber-200/60 dark:border-amber-900/40 shrink-0">
                <Plus size={22} className="stroke-[3]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#ff9900] transition-colors">
                  Nova Demanda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Post, carrossel ou vídeo
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('clientes')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-500/80 transition-all text-left flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/40 shrink-0">
                <UserPlus size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                  Cadastrar Cliente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Adicionar nova conta ao CRM
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('calendario')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-500/80 transition-all text-left flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-900/40 shrink-0">
                <Calendar size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                  Calendário Editorial
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Datas, feriados e pautas
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('financeiro')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500/80 transition-all text-left flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shrink-0">
                <Wallet size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                  Módulo Financeiro
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Fluxo de caixa e faturamento
                </p>
              </div>
            </button>

          </div>

          {/* Aniversariantes do Mês */}
          <ClientBirthdaysSection
            clients={clients}
            onNavigate={onNavigate}
            onSelectClient={onSelectClient}
          />

          {/* Mapa de Clientes */}
          <ClientLocationMap
            clients={clients}
            onNavigate={onNavigate}
          />

        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ABA ATIVA: "Demandas & Prazos"                                    */}
      {/*    (LISTA DETALHADA COM BARRA DE BUSCA E FILTROS SEGMENTADOS)        */}
      {/* ==================================================================== */}
      {currentTab === 'demandas_prazos' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-2xs space-y-5">
          
          {/* Header e Filtros */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Controle Operacional de Demandas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe prazos de entrega, gargalos e tarefas em produção
              </p>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 overflow-x-auto scrollbar-none self-start lg:self-auto max-w-full">
              <button
                type="button"
                onClick={() => setDemandTab('todas')}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  demandTab === 'todas'
                    ? 'bg-white dark:bg-[#0c1424] text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({activeDemands.length})
              </button>

              <button
                type="button"
                onClick={() => setDemandTab('atrasadas')}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  demandTab === 'atrasadas'
                    ? 'bg-rose-600 text-white font-bold shadow-2xs'
                    : overdueDemands.length > 0
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle size={13} />
                <span>Atrasadas ({overdueDemands.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDemandTab('hoje')}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  demandTab === 'hoje'
                    ? 'bg-[#ff9900] text-[#142142] font-black shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock size={13} />
                <span>Para Hoje ({dueTodayDemands.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDemandTab('producao')}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  demandTab === 'producao'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Em Produção ({inProduction.length})
              </button>

              <button
                type="button"
                onClick={() => setDemandTab('aprovacao')}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  demandTab === 'aprovacao'
                    ? 'bg-amber-600 text-white font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Aprovação ({pendingApprovals.length})
              </button>
            </div>
          </div>

          {/* Barra de Busca de Demandas */}
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={demandSearch}
              onChange={(e) => setDemandSearch(e.target.value)}
              placeholder="Buscar por título da demanda ou cliente..."
              className="w-full text-xs pl-9 pr-8 py-2.5 rounded-full bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-[#ff9900] focus:bg-white dark:focus:bg-slate-900 transition-all shadow-2xs"
            />
            {demandSearch && (
              <button
                type="button"
                onClick={() => setDemandSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Lista de Demandas */}
          <div className="space-y-2.5">
            {filteredDemandsList.length === 0 ? (
              <div className="py-14 text-center rounded-[24px] bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Nenhuma demanda encontrada nesta visualização
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cadastre uma nova demanda ou altere os filtros de busca.
                </p>
              </div>
            ) : (
              filteredDemandsList.map((demand) => {
                const dueStatus = demandDueStatusMap.get(demand.id) || getDemandDueStatus(demand);
                const clientInfo = getClientInfo(demand);
                const assignee = getAssigneeInfo(demand.assignee);

                return (
                  <div
                    key={demand.id}
                    onClick={() => onSelectDemand ? onSelectDemand(demand.id) : onNavigate('demandas')}
                    className={`p-4 rounded-[20px] border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-[#ff9900] hover:shadow-xs ${
                      dueStatus.isOverdue
                        ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50'
                        : dueStatus.status === 'hoje'
                        ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50'
                        : 'bg-white dark:bg-[#0c1424] border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {clientInfo.avatar ? (
                        <img
                          src={clientInfo.avatar}
                          alt={clientInfo.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">
                          {clientInfo.initial}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {clientInfo.displayName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{demand.type || 'Geral'}</span>
                          {demand.priority === 'urgente' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                <Flame size={12} /> Urgente
                              </span>
                            </>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#ff9900] transition-colors truncate">
                          {demand.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${
                          dueStatus.isOverdue 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : dueStatus.status === 'hoje'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          <Clock size={13} />
                          <span>{dueStatus.label}</span>
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Resp: {assignee.name}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ABA ATIVA: "Clientes & CRM"                                       */}
      {/* ==================================================================== */}
      {currentTab === 'clientes_crm' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0c1424] rounded-[26px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Contas</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{clients.length}</p>
              <p className="text-xs text-slate-400">Clientes cadastrados na agência</p>
            </div>

            <div className="bg-white dark:bg-[#0c1424] rounded-[26px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contas Ativas</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{activeClients.length}</p>
              <p className="text-xs text-slate-400">Contratos vigentes com demandas</p>
            </div>

            <div className="bg-white dark:bg-[#0c1424] rounded-[26px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Em Onboarding</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {clients.filter(c => c.status === 'Em Onboarding').length}
              </p>
              <p className="text-xs text-slate-400">Fase inicial de alinhamento</p>
            </div>
          </div>

          {/* Aniversariantes */}
          <ClientBirthdaysSection
            clients={clients}
            onNavigate={onNavigate}
            onSelectClient={onSelectClient}
          />

          {/* Mapa Geográfico de Clientes */}
          <ClientLocationMap
            clients={clients}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. ABA ATIVA: "Desempenho & Equipe"                                  */}
      {/* ==================================================================== */}
      {currentTab === 'desempenho_equipe' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Gráfico de Rosca de Status */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <DemandsStatusDoughnutChart demands={demands} columns={activeColumns} onNavigate={onNavigate} />
            </div>

            {/* Quadro da Equipe */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center border border-purple-200/60 dark:border-purple-900/40">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Capacidade da Equipe</h3>
                    <p className="text-xs text-slate-500">Distribuição de demandas por colaborador</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('equipe')}
                  className="text-xs font-bold text-[#ff9900] hover:underline cursor-pointer"
                >
                  Gerenciar equipe →
                </button>
              </div>

              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const memberDemands = demands.filter(d => 
                    d.assignee?.name?.toLowerCase().includes(member.name.toLowerCase()) && !isConcludedDemand(d, activeColumns)
                  );

                  return (
                    <div 
                      key={member.id} 
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{member.role}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {memberDemands.length} tarefas
                        </span>
                        <p className="text-[10px] text-slate-400">em andamento</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

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
  Building2,
  Flame,
  Search,
  LayoutGrid,
  BarChart3,
  Check,
  Receipt,
  MoreVertical,
  Download,
  Copy,
  ExternalLink,
  ShieldCheck,
  Layers,
  SlidersHorizontal,
  DollarSign,
  CreditCard,
  Handshake,
  FileSpreadsheet
} from 'lucide-react';
import { Client, DemandItem, KanbanColumn, PageId, ClientActivity, Invoice, TeamMember } from '../types';
import { ClientLocationMap } from '../components/ClientLocationMap';
import { ClientBirthdaysSection } from '../components/ClientBirthdaysSection';
import { DemandsStoriesSection } from '../components/DemandsStoriesSection';
import { DemandsStatusDoughnutChart } from '../components/DemandsStatusDoughnutChart';
import { initialRecentActivities, currentUser, kanbanColumnsData } from '../data/mockData';

export const parseDemandDate = (dateStr?: string): Date | null => {
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

export const formatDemandDateFull = (dateStr?: string): string => {
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
  const [criticalFilter, setCriticalFilter] = useState<'atrasadas' | 'hoje' | 'proximas'>('atrasadas');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

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

  // Clientes ativos
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'Ativo'), [clients]);

  // Indicadores Financeiros integrados (MRR recorrente + faturamento de faturas)
  const mrrTotal = useMemo(() => {
    return activeClients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  }, [activeClients]);

  const totalInvoicedValue = useMemo(() => {
    if (!invoices || invoices.length === 0) return mrrTotal;
    return invoices.reduce((acc, inv) => acc + (inv.value || 0), 0);
  }, [invoices, mrrTotal]);

  const paidInvoicesValue = useMemo(() => {
    if (!invoices || invoices.length === 0) return 0;
    return invoices.filter(i => i.status === 'Pago').reduce((acc, inv) => acc + (inv.value || 0), 0);
  }, [invoices]);

  const pendingInvoicesValue = useMemo(() => {
    if (!invoices || invoices.length === 0) return 0;
    return invoices.filter(i => i.status === 'Pendente').reduce((acc, inv) => acc + (inv.value || 0), 0);
  }, [invoices]);

  // Top clientes por investimento mensal (Top 3)
  const topClientsByInvestment = useMemo(() => {
    return [...clients]
      .filter(c => (c.monthlyFee || 0) > 0)
      .sort((a, b) => (b.monthlyFee || 0) - (a.monthlyFee || 0))
      .slice(0, 3);
  }, [clients]);

  // Lista de demandas críticas para o Card Dark da direita
  const criticalDemandsList = useMemo(() => {
    if (criticalFilter === 'atrasadas') return overdueDemands;
    if (criticalFilter === 'hoje') return dueTodayDemands;
    return upcomingDemands;
  }, [criticalFilter, overdueDemands, dueTodayDemands, upcomingDemands]);


  // Dados para o gráfico do pipeline operacional (5 etapas principais do Kanban)
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

  // Pontos SVG para a curva pontilhada de ritmo operacional (idêntica à linha pontilhada do Financeiro)
  const trendLinePoints = useMemo(() => {
    if (pipelineStages.length === 0) return '';
    const width = 600;
    const height = 120;
    const step = width / Math.max(1, pipelineStages.length - 1);

    const coords = pipelineStages.map((stage, idx) => {
      const x = Math.round(idx * step);
      const ratio = maxPipelineCount > 0 ? stage.count / maxPipelineCount : 0;
      // Inverted Y: 0 count is height - 15, max count is 15
      const y = Math.round((height - 18) - (ratio * (height - 36)));
      return { x, y };
    });

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      d += ` L ${coords[i].x} ${coords[i].y}`;
    }
    return { path: d, coords };
  }, [pipelineStages, maxPipelineCount]);

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

  // Exportar resumo operacional da agência para CSV
  const handleExportOperationalCSV = () => {
    try {
      const headers = ['ID', 'Título', 'Cliente', 'Projeto', 'Etapa', 'Prazo', 'Prioridade', 'Responsável'];
      const rows = demands.map((d) => {
        const col = activeColumns.find(c => c.id === d.columnId);
        const colTitle = col ? col.title : d.columnId;
        const assignee = getAssigneeInfo(d.assignee);
        return [
          `"${d.id}"`,
          `"${(d.title || '').replace(/"/g, '""')}"`,
          `"${(d.client || '').replace(/"/g, '""')}"`,
          `"${(d.clientProject || '').replace(/"/g, '""')}"`,
          `"${colTitle}"`,
          `"${d.dueDate || ''}"`,
          `"${d.priority || 'Normal'}"`,
          `"${assignee.name || ''}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-operacional-agencia-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Relatório operacional exportado com sucesso!');
    } catch {
      showToast('Erro ao exportar planilha CSV.');
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard?.writeText?.('financeiro@helpideiasdigitais.com.br');
    showToast('Chave PIX da agência copiada com sucesso!');
  };

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-150">
      
      {/* Toast Notification no padrão do Financeiro */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#142142] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/80 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-[#ff9900]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. TOP HEADER: SAUDAÇÃO EXECUTIVA & BOTÃO NOVA DEMANDA               */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
            {formattedDateCapitalized}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {currentUser.name}
          </h1>
        </div>

        {/* Action Button: + Nova Demanda (Estilo Financeiro) */}
        <button
          type="button"
          onClick={onOpenNewDemandModal}
          className="px-6 py-2.5 rounded-full bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md shrink-0 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Nova demanda</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP METRIC PILLS ROW (4 CAPSULE CARDS DISTINTOS DO FINANCEIRO)    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Faturamento Mensal / MRR (Orange Solid Capsule) */}
        <div 
          onClick={() => onNavigate('financeiro')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver detalhes de faturamento no Módulo Financeiro"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Faturamento Mensal (MRR)
          </p>
          <div className="w-full bg-[#ff9900] hover:bg-[#e68a00] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs transition-all">
            <span className="font-black text-slate-950 text-sm tracking-tight tabular-nums">
              R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-bold text-slate-900/80 flex items-center gap-0.5">
              <span>•</span> {activeClients.length} ativas
            </span>
          </div>
        </div>

        {/* KPI 2: Fluxo Operacional (Dark/Black Solid Capsule) */}
        <div 
          onClick={() => onNavigate('demandas')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver demandas no Quadro Kanban"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Fluxo em Andamento
          </p>
          <div className="w-full bg-[#12151e] hover:bg-[#1a1f2e] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs border border-slate-800/60 transition-all">
            <span className="font-black text-white text-sm tracking-tight tabular-nums">
              {activeDemands.length} demandas
            </span>
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5">
              <span>•</span> {inProduction.length} produção
            </span>
          </div>
        </div>

        {/* KPI 3: Entregas de Hoje (Light Grey Capsule) */}
        <div 
          onClick={() => onNavigate('demandas')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver demandas com vencimento hoje no Kanban"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Entregas de Hoje
          </p>
          <div className="w-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs transition-all">
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight tabular-nums">
              {dueTodayDemands.length} para hoje
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
              <span>•</span> {upcomingDemands.length} na fila
            </span>
          </div>
        </div>

        {/* KPI 4: Atrasados (Diagonal Stripe Hatched Texture Capsule) */}
        <div 
          onClick={() => onNavigate('demandas')}
          className="space-y-1.5 cursor-pointer group"
          title="Ver demandas com prazo vencido no Kanban"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Prazos Atrasados
          </p>
          <div 
            className="w-full rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs border border-rose-300 dark:border-rose-900/50 relative overflow-hidden transition-all"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.08), rgba(244, 63, 94, 0.08) 8px, rgba(244, 63, 94, 0.16) 8px, rgba(244, 63, 94, 0.16) 16px)'
            }}
          >
            <span className="font-black text-rose-600 dark:text-rose-400 text-sm tracking-tight relative z-10 tabular-nums">
              {overdueDemands.length} em atraso
            </span>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 relative z-10">
              {overdueDemands.length > 0 ? '• Atenção imediata' : '• 100% no prazo'}
            </span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. GRID PRINCIPAL & CONTEÚDO EXECUTIVO                               */}
      {/* ==================================================================== */}
      <div className="space-y-6">
          
          {/* Grid Principal 7:5 no mesmo padrão estrutural do Financeiro */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* ---------------------------------------------------------------- */}
            {/* COLUNA ESQUERDA: Pipeline Operacional & Entregas (7 cols)        */}
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
                      Volume operacional distribuído pelas etapas do fluxo
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

              {/* Área do Gráfico de Barras com Linhas Pontilhadas e Curva de Ritmo */}
              <div className="relative pt-4 pb-2">
                {/* Linhas de grade horizontais pontilhadas com escala Y */}
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

                {/* Container de Barras e SVG Overlay */}
                <div className="absolute inset-0 left-9 right-2 bottom-6 top-6 flex items-end justify-between px-3 sm:px-6">
                  
                  {/* Linha pontilhada curva de tendência do ritmo operacional */}
                  {trendLinePoints && (
                    <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible px-4 sm:px-6">
                      <path
                        d={trendLinePoints.path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                      {trendLinePoints.coords.map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#64748b" />
                      ))}
                    </svg>
                  )}

                  {/* Barras Verticais arredondadas no padrão Financeiro */}
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

                        {/* Barra Arredondada */}
                        <div 
                          className="w-5 sm:w-7 bg-[#ff9900] hover:bg-[#e68a00] rounded-full transition-all shadow-xs min-h-[6px]"
                          style={{ height: `${Math.max(6, heightPercent * 1.25)}px` }}
                        />

                        {/* Etapa Label */}
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
                    <span>Ritmo Operacional</span>
                  </div>
                </div>

              </div>

              {/* Faixa métrica inferior dividida por borda pontilhada (estilo Financeiro) */}
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

              {/* Botão de Rodapé no padrão do Financeiro */}
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

          {/* ================================================================ */}
          {/* PAINEL EXECUTIVO INTEGRADO: Saúde Financeira & Principais Clientes */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Bloco 1: Saúde Financeira & Receita Recorrente (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Saúde Financeira da Agência
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Receita recorrente e faturamento em tempo real
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('financeiro')}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span>Abrir Financeiro</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>

              {/* 3 Colunas Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">MRR Recorrente</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400">{activeClients.length} contratos vigentes</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Faturamento Emitido</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    R$ {totalInvoicedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400">{invoices.length} faturas lançadas</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Inadimplência</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    {invoices.length > 0 && pendingInvoicesValue > 0
                      ? `${Math.round((pendingInvoicesValue / totalInvoicedValue) * 100)}%`
                      : '0,0%'}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">100% recebimentos saudáveis</p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Principais Contas da Agência (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Top Contas da Agência
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Maiores mensalidades no CRM
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('clientes')}
                  className="text-xs font-bold text-[#ff9900] hover:underline cursor-pointer"
                >
                  Ver todos →
                </button>
              </div>

              <div className="space-y-2.5">
                {topClientsByInvestment.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Nenhum cliente com mensalidade cadastrada.
                  </div>
                ) : (
                  topClientsByInvestment.map((client) => (
                    <div 
                      key={client.id}
                      onClick={() => onSelectClient ? onSelectClient(client) : onNavigate('clientes')}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-[#ff9900] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {client.avatar ? (
                          <img
                            src={client.avatar}
                            alt={client.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {client.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#ff9900] transition-colors">
                            {client.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {client.segment || 'Geral'}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                        R$ {(client.monthlyFee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </span>
                    </div>
                  ))
                )}
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
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-[#ff9900]/80 transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
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
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-[#ff9900] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('clientes')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-500/80 transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
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
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('calendario')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-500/80 transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
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
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('financeiro')}
              className="bg-white dark:bg-[#0c1424] rounded-[24px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500/80 transition-all text-left flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
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
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
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
    </div>
  );
};

import React from 'react';
import { 
  Briefcase, 
  Clock, 
  Receipt, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles,
  TrendingUp,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export interface QuickStatsWidgetProps {
  activeDemandsCount: number;
  pendingApprovalsCount: number;
  totalInvoicesCount: number;
  totalInvoicesValue?: number;
  pendingInvoicesCount?: number;
  paidInvoicesCount?: number;
  clientName?: string;
  onNavigateToDemands?: () => void;
  onNavigateToApprovals?: () => void;
  onNavigateToInvoices?: () => void;
  className?: string;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({
  activeDemandsCount,
  pendingApprovalsCount,
  totalInvoicesCount,
  totalInvoicesValue = 0,
  pendingInvoicesCount = 0,
  paidInvoicesCount = 0,
  clientName,
  onNavigateToDemands,
  onNavigateToApprovals,
  onNavigateToInvoices,
  className = ''
}) => {
  return (
    <div 
      className={`bg-white dark:bg-[#0c1424] rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 ${className}`}
      data-testid="quick-stats-widget"
    >
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ff9900]/15 text-[#ff9900] flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Quick Stats
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[#ff9900] text-[10px] font-black uppercase tracking-wider border border-[#ff9900]/20">
                Resumo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Indicadores rápidos e em tempo real para {clientName || 'o cliente logado'}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sincronizado</span>
        </div>
      </div>

      {/* Grid com os 3 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* ==================================================================== */}
        {/* CARD 1: DEMANDAS ATIVAS (ACTIVE DEMANDS)                              */}
        {/* ==================================================================== */}
        <div 
          onClick={onNavigateToDemands}
          className={`rounded-2xl sm:rounded-[24px] p-4 sm:p-5 border transition-all flex flex-col justify-between group relative overflow-hidden ${
            onNavigateToDemands ? 'cursor-pointer hover:shadow-md hover:border-blue-400/60 dark:hover:border-blue-500/50' : ''
          } bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/40 dark:to-blue-950/20 border-slate-200/80 dark:border-slate-800`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-blue-500" />
              <span>Demandas Ativas</span>
            </span>
            {onNavigateToDemands && (
              <span className="p-1 rounded-lg text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-100/60 dark:group-hover:bg-blue-900/40 transition-colors">
                <ArrowUpRight size={14} />
              </span>
            )}
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {activeDemandsCount}
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {activeDemandsCount === 1 ? 'demanda' : 'demandas'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {activeDemandsCount > 0 ? 'Em andamento na agência' : 'Nenhuma demanda ativa'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <TrendingUp size={11} />
              <span>Ativas</span>
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CARD 2: APROVAÇÕES PENDENTES (PENDING APPROVALS)                      */}
        {/* ==================================================================== */}
        <div 
          onClick={onNavigateToApprovals}
          className={`rounded-2xl sm:rounded-[24px] p-4 sm:p-5 border transition-all flex flex-col justify-between group relative overflow-hidden ${
            onNavigateToApprovals ? 'cursor-pointer hover:shadow-md hover:border-[#ff9900]/70' : ''
          } ${
            pendingApprovalsCount > 0 
              ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-orange-50/30 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-orange-950/20 border-[#ff9900]/40 ring-1 ring-[#ff9900]/20'
              : 'bg-gradient-to-br from-slate-50 to-emerald-50/20 dark:from-slate-900/40 dark:to-emerald-950/10 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className={pendingApprovalsCount > 0 ? 'text-[#ff9900]' : 'text-emerald-500'} />
              <span>Aprovações Pendentes</span>
            </span>
            {onNavigateToApprovals && (
              <span className={`p-1 rounded-lg transition-colors ${
                pendingApprovalsCount > 0 
                  ? 'text-[#ff9900] group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40' 
                  : 'text-slate-400 group-hover:text-emerald-500'
              }`}>
                <ArrowUpRight size={14} />
              </span>
            )}
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                pendingApprovalsCount > 0 ? 'text-[#ff9900]' : 'text-slate-900 dark:text-white'
              }`}>
                {pendingApprovalsCount}
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {pendingApprovalsCount === 1 ? 'post/material' : 'posts/materiais'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {pendingApprovalsCount > 0 ? 'Aguardando sua revisão' : 'Tudo revisado'}
            </span>
            {pendingApprovalsCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ff9900] text-[#142142] shadow-xs">
                <AlertCircle size={11} />
                <span>Ação necessária</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={11} />
                <span>Em dia</span>
              </span>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CARD 3: TOTAL DE FATURAS (TOTAL INVOICES)                             */}
        {/* ==================================================================== */}
        <div 
          onClick={onNavigateToInvoices}
          className={`rounded-2xl sm:rounded-[24px] p-4 sm:p-5 border transition-all flex flex-col justify-between group relative overflow-hidden ${
            onNavigateToInvoices ? 'cursor-pointer hover:shadow-md hover:border-emerald-400/60 dark:hover:border-emerald-500/50' : ''
          } bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900/40 dark:to-emerald-950/20 border-slate-200/80 dark:border-slate-800`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt size={14} className="text-emerald-500" />
              <span>Total de Faturas</span>
            </span>
            {onNavigateToInvoices && (
              <span className="p-1 rounded-lg text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-100/60 dark:group-hover:bg-emerald-900/40 transition-colors">
                <ArrowUpRight size={14} />
              </span>
            )}
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {totalInvoicesCount}
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {totalInvoicesCount === 1 ? 'fatura emitida' : 'faturas emitidas'}
              </span>
            </div>
            {totalInvoicesValue > 0 && (
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                R$ {totalInvoicesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {pendingInvoicesCount > 0 
                ? `${pendingInvoicesCount} pendente${pendingInvoicesCount > 1 ? 's' : ''}`
                : totalInvoicesCount > 0 
                  ? 'Cobranças regulares' 
                  : 'Sem faturas emitidas'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <FileCheck2 size={11} />
              <span>Financeiro</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

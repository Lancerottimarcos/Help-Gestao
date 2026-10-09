import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  MessageSquare, 
  Sparkles, 
  Search, 
  Eye, 
  Download, 
  Check, 
  Copy, 
  ArrowRight, 
  ExternalLink, 
  Send, 
  ImageIcon, 
  Film, 
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Calendar,
  Layers,
  Building2,
  HelpCircle,
  ThumbsUp,
  MessageCircle,
  X,
  LayoutGrid,
  Columns3,
  Smartphone,
  List,
  SlidersHorizontal,
  Plus,
  Share2,
  FileText,
  TrendingUp,
  Wrench,
  ChevronDown,
  Filter,
  CheckSquare,
  StickyNote,
  Tag,
  AlignLeft,
  CalendarDays,
  User,
  Sliders,
  KeyRound,
  Lock,
  ShieldCheck,
  Monitor,
  PhoneCall,
  Instagram
} from 'lucide-react';
import { DemandItem, Client, UserProfile, DemandAttachment } from '../types';
import { ClientPasswordManagerModal } from '../components/ClientPasswordManagerModal';
import { FlamengoMockupCard } from '../components/FlamengoMockupCard';

export interface ClientApprovalsViewProps {
  demands: DemandItem[];
  clients: Client[];
  currentUser: UserProfile;
  onClientApprovalAction: (
    demandId: string, 
    action: 'aprovado' | 'reprovado' | 'alteracao_solicitada', 
    feedback?: string
  ) => void;
  onOpenClientApprovalPortal?: (demand: DemandItem) => void;
  onNavigateToPortal?: () => void;
  onOpenWhatsAppNotification?: (demand: DemandItem) => void;
  onUpdateClient?: (client: Client) => void;
  onOpenDemandModal?: (demand: DemandItem) => void;
  onSelectClientDemands?: (clientName: string) => void;
}

type ViewMode = 'grade' | 'quadro' | 'feed' | 'lista' | 'calendario' | 'gantt';
type TopNavTab = 'demandas' | 'social' | 'aprovacao' | 'notas' | 'desempenho' | 'chat' | 'ferramentas';

export const ClientApprovalsView: React.FC<ClientApprovalsViewProps> = ({
  demands,
  clients,
  currentUser,
  onClientApprovalAction,
  onOpenClientApprovalPortal,
  onNavigateToPortal,
  onOpenWhatsAppNotification,
  onUpdateClient,
  onOpenDemandModal,
  onSelectClientDemands,
}) => {
  // Navigation & View Mode states matching image
  const [topNavTab, setTopNavTab] = useState<TopNavTab>('aprovacao');
  const [viewMode, setViewMode] = useState<ViewMode>('grade');
  
  // Filters matching image
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('todos');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('todos');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isBulkApprovalModalOpen, setIsBulkApprovalModalOpen] = useState(false);
  const [isPasswordManagerModalOpen, setIsPasswordManagerModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSimulatorDevice, setActiveSimulatorDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Approval action states
  const [feedbackDemand, setFeedbackDemand] = useState<DemandItem | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<{ id: string; message: string; type: 'success' | 'warn' } | null>(null);
  const [previewDemand, setPreviewDemand] = useState<DemandItem | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // New post modal form state
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostType, setNewPostType] = useState('Stories');
  const [newPostClient, setNewPostClient] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');

  // Client user scope detection
  const isClientRole = currentUser.role === 'cliente';
  const clientScopeName = (currentUser.clientName || currentUser.name || '').trim().toLowerCase();
  
  const clientObj = useMemo(() => {
    return clients.find(
      (c) => c.id === currentUser.clientId || 
             c.name.trim().toLowerCase() === clientScopeName ||
             (c.companyName && c.companyName.trim().toLowerCase() === clientScopeName)
    );
  }, [clients, currentUser.clientId, clientScopeName]);

  // Scope demands: if client role, filter strictly by this client AND strictly by column "Aprovação Cliente"
  const clientAllDemands = useMemo(() => {
    if (!isClientRole) return demands;
    return demands.filter((d) => {
      if (currentUser.clientId && d.clientId === currentUser.clientId) return true;
      const dClient = (d.client || '').trim().toLowerCase();
      const dProject = (d.clientProject || '').trim().toLowerCase();
      return (
        dClient === clientScopeName || 
        dProject.includes(clientScopeName) ||
        (clientObj && (dClient === clientObj.name.toLowerCase() || dClient === (clientObj.companyName || '').toLowerCase()))
      );
    });
  }, [demands, isClientRole, currentUser.clientId, clientScopeName, clientObj]);

  const scopedDemands = useMemo(() => {
    // Regra: Mostrar a demanda no portal do cliente, quando a demanda estiver na coluna Aprovação Cliente ou com alteração solicitada
    return clientAllDemands.filter((d) => {
      const isApproval = 
        d.columnId === 'aprovacao' || 
        d.columnId === 'aprovacao-cliente' || 
        d.columnId === 'aprovacao_cliente' || 
        (d.columnId && d.columnId.toLowerCase().includes('aprov'));

      // Se o usuário selecionou o filtro 'aprovado', permite ver os itens já aprovados
      if (selectedStatusFilter === 'aprovado') {
        return d.approvalStatus === 'aprovado' || d.columnId === 'agendamento' || d.columnId === 'concluidas';
      }

      if (selectedStatusFilter === 'alteracoes') {
        return d.approvalStatus === 'alteracao_solicitada' || Boolean(d.approvalFeedback);
      }

      // Por padrão, incluir demandas na coluna de aprovação ou que tiveram ajustes pedidos pelo cliente
      return isApproval || d.approvalStatus === 'alteracao_solicitada' || Boolean(d.approvalFeedback);
    });
  }, [clientAllDemands, selectedStatusFilter]);

  // Filtered demands based on controls
  const filteredDemands = useMemo(() => {
    return scopedDemands.filter((d) => {
      // Status filter
      if (selectedStatusFilter === 'pendente') {
        const isApprovalCol = d.columnId === 'aprovacao' || d.columnId === 'aprovacao-cliente' || d.columnId === 'aprovacao_cliente' || (d.columnId && d.columnId.toLowerCase().includes('aprov'));
        const isPending = isApprovalCol && d.approvalStatus !== 'aprovado' && d.approvalStatus !== 'reprovado';
        if (!isPending) return false;
      } else if (selectedStatusFilter === 'aprovado') {
        const isApproved = d.approvalStatus === 'aprovado' || d.columnId === 'agendamento' || d.columnId === 'concluidas';
        if (!isApproved) return false;
      } else if (selectedStatusFilter === 'alteracoes') {
        if (d.approvalStatus !== 'alteracao_solicitada' && !d.approvalFeedback) return false;
      } else if (selectedStatusFilter === 'reprovado') {
        if (d.approvalStatus !== 'reprovado') return false;
      }

      // Type / Format filter
      if (selectedTypeFilter !== 'todos') {
        const typeMatch = (d.type || '').toLowerCase() === selectedTypeFilter.toLowerCase();
        if (!typeMatch) return false;
      }

      // Client filter (if agency mode)
      if (!isClientRole && selectedClientFilter !== 'todos') {
        if (d.client.toLowerCase() !== selectedClientFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (d.title || '').toLowerCase().includes(q);
        const matchesDesc = (d.description || '').toLowerCase().includes(q);
        const matchesClient = (d.client || '').toLowerCase().includes(q);
        const matchesType = (d.type || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesClient && !matchesType) return false;
      }

      return true;
    });
  }, [scopedDemands, selectedStatusFilter, selectedTypeFilter, selectedClientFilter, searchQuery, isClientRole]);

  // Counts
  const totalCount = scopedDemands.length;
  const pendingCount = clientAllDemands.filter(
    (d) => (d.columnId === 'aprovacao' || (d.columnId && d.columnId.toLowerCase().includes('aprov'))) && (d.approvalStatus === 'pendente' || !d.approvalStatus || d.columnId === 'aprovacao')
  ).length;
  const approvedCount = clientAllDemands.filter(
    (d) => d.approvalStatus === 'aprovado' || d.columnId === 'agendamento' || d.columnId === 'concluidas'
  ).length;
  const changesCount = clientAllDemands.filter(
    (d) => d.approvalStatus === 'alteracao_solicitada'
  ).length;

  const handleApprove = (demand: DemandItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onClientApprovalAction(demand.id, 'aprovado');
    setActionSuccessNotice({
      id: demand.id,
      message: `"${demand.title}" aprovado! A agência foi avisada.`,
      type: 'success',
    });
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  const handleBulkApprove = () => {
    const pendings = scopedDemands.filter(
      (d) => d.columnId === 'aprovacao' || d.approvalStatus === 'pendente' || (!d.approvalStatus && d.columnId === 'aprovacao')
    );
    pendings.forEach((d) => onClientApprovalAction(d.id, 'aprovado'));
    setIsBulkApprovalModalOpen(false);
    setActionSuccessNotice({
      id: 'bulk',
      message: `${pendings.length} posts aprovados com sucesso! A agência foi avisada.`,
      type: 'success',
    });
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackDemand || !feedbackText.trim()) return;
    onClientApprovalAction(feedbackDemand.id, 'alteracao_solicitada', feedbackText.trim());
    setActionSuccessNotice({
      id: feedbackDemand.id,
      message: `Solicitação de alteração enviada para "${feedbackDemand.title}".`,
      type: 'warn',
    });
    setFeedbackDemand(null);
    setFeedbackText('');
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  const openPreview = (demand: DemandItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewDemand(demand);
    setPreviewSlideIndex(0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. TOP FLOATING PILL NAVIGATION BAR (Matching exact design from image - Oculto na visualização do cliente) */}
      {!isClientRole && (
        <div className="flex items-center justify-center pt-1 pb-1">
          <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 bg-white dark:bg-[#0f172a] rounded-full border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-black/40 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => onNavigateToPortal && onNavigateToPortal()}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                topNavTab === 'demandas' 
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Columns3 size={15} />
              <span>Demandas</span>
            </button>

            <button
              type="button"
              onClick={() => setTopNavTab('social')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                topNavTab === 'social' 
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Share2 size={15} />
              <span>Social</span>
            </button>

            <button
              type="button"
              onClick={() => setTopNavTab('aprovacao')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-[#fab518] text-[#142142] shadow-sm cursor-pointer whitespace-nowrap"
            >
              <CheckSquare size={15} />
              <span>Aprovação</span>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#142142] text-[#fab518] text-[10px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTopNavTab('notas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                topNavTab === 'notas' 
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <StickyNote size={15} />
              <span>Notas</span>
            </button>

            <button
              type="button"
              onClick={() => setTopNavTab('desempenho')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                topNavTab === 'desempenho' 
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp size={15} />
              <span>Desempenho</span>
            </button>

            <button
              type="button"
              onClick={() => setTopNavTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                topNavTab === 'chat' 
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>

            {/* Tools Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  topNavTab === 'ferramentas' || isToolsDropdownOpen
                    ? 'bg-[#fab518] text-[#142142] font-black shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Wrench size={14} />
                <span>Ferramentas</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl z-40 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordManagerModalOpen(true);
                      setIsToolsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                      <KeyRound size={16} />
                    </div>
                    <div>
                      <p className="font-bold">Acessos & Senhas</p>
                      <p className="text-[10px] text-slate-400 font-normal">Credenciais dos clientes</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSimulatorModalOpen(true);
                      setIsToolsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                      <Smartphone size={16} />
                    </div>
                    <div>
                      <p className="font-bold">Simulador do Cliente</p>
                      <p className="text-[10px] text-slate-400 font-normal">Prévia mobile do portal</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TITLE SECTION (Matching exact typography from image) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Aprovação de Posts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isClientRole ? (
              <span>Visualizando criativos de <strong>{currentUser.clientName || currentUser.name}</strong> • {filteredDemands.length} materiais listados</span>
            ) : (
              <span>Painel de Aprovação de Criativos e Campanhas da Agência</span>
            )}
          </p>
        </div>

        {/* Action toast */}
        {actionSuccessNotice && (
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 duration-200 ${
            actionSuccessNotice.type === 'success' 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
              : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
          }`}>
            <CheckCircle2 size={16} />
            <span>{actionSuccessNotice.message}</span>
            <button
              type="button"
              onClick={() => setActionSuccessNotice(null)}
              className="ml-2 hover:opacity-80 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 3. CONTROLS & VIEW MODES TOOLBAR (Matching image exactly) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left Segment: Dropdown, Filters button, View Modes */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Status Dropdown "Todos (12) ▾" */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-all"
            >
              <span>
                {selectedStatusFilter === 'todos' ? `Todos (${totalCount})` :
                 selectedStatusFilter === 'pendente' ? `Pendentes (${pendingCount})` :
                 selectedStatusFilter === 'alteracoes' ? `Ajustes (${changesCount})` :
                 selectedStatusFilter === 'aprovado' ? `Aprovados (${approvedCount})` : 'Filtrado'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('todos'); setIsFilterDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                    selectedStatusFilter === 'todos' ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Todos os Posts</span>
                  <span className="text-[11px] opacity-75">{totalCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('pendente'); setIsFilterDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                    selectedStatusFilter === 'pendente' ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Aguardando Aprovação</span>
                  <span className="text-[11px] opacity-75">{pendingCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('alteracoes'); setIsFilterDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                    selectedStatusFilter === 'alteracoes' ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Alterações Solicitadas</span>
                  <span className="text-[11px] opacity-75">{changesCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedStatusFilter('aprovado'); setIsFilterDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                    selectedStatusFilter === 'aprovado' ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>Aprovados</span>
                  <span className="text-[11px] opacity-75">{approvedCount}</span>
                </button>
              </div>
            )}
          </div>

          {/* Client Filter Dropdown for Agency */}
          {!isClientRole && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-all"
              >
                <Building2 size={13} className="text-slate-400" />
                <span className="max-w-[130px] truncate">
                  {selectedClientFilter === 'todos' ? 'Todos Clientes' : selectedClientFilter}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isClientDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl z-30 p-1.5 space-y-1 max-h-72 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => { setSelectedClientFilter('todos'); setIsClientDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                      selectedClientFilter === 'todos' ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Todos os Clientes</span>
                    <span className="text-[11px] opacity-75">{clients.length}</span>
                  </button>
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedClientFilter(c.name); setIsClientDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                        selectedClientFilter.toLowerCase() === c.name.toLowerCase() ? 'bg-[#fab518] text-[#142142]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filtros button */}
          <button
            type="button"
            onClick={() => setIsFiltersModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer transition-all"
          >
            <SlidersHorizontal size={14} className="text-slate-500" />
            <span>Filtros</span>
          </button>

          {/* Segmented View Switchers: Grade, Quadro, Feed, Lista, Calendário, Gantt */}
          <div className="flex items-center p-1 bg-white dark:bg-[#0f172a] rounded-full border border-slate-200/90 dark:border-slate-800 shadow-2xs gap-0.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setViewMode('grade')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grade'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('quadro')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'quadro'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns3 size={13} />
              <span>Quadro</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('feed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'feed'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone size={13} />
              <span>Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendario'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={13} />
              <span>Calendário</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'gantt'
                  ? 'bg-[#fab518] text-[#142142] font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlignLeft size={13} />
              <span>Gantt</span>
            </button>
          </div>
        </div>

        {/* Right Segment: Aprovados button, Em lote, Tipos, + Novo post */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Aprovados pill button */}
          <button
            type="button"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'aprovado' ? 'todos' : 'aprovado')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold cursor-pointer transition-all ${
              selectedStatusFilter === 'aprovado'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={14} className={selectedStatusFilter === 'aprovado' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
            <span>Aprovados ({approvedCount})</span>
          </button>

          {/* Em lote */}
          <button
            type="button"
            onClick={() => setIsBulkApprovalModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer transition-all"
          >
            <Layers size={14} className="text-slate-500" />
            <span>Em lote</span>
          </button>

          {/* Tipos dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer transition-all"
            >
              <Sliders size={14} className="text-slate-500" />
              <span>{selectedTypeFilter === 'todos' ? 'Tipos' : selectedTypeFilter}</span>
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {['todos', 'Stories', 'Reels', 'Carrossel', 'Post', 'Meta Ads'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSelectedTypeFilter(t); setIsTypeDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-xs font-bold cursor-pointer transition-colors ${
                      selectedTypeFilter.toLowerCase() === t.toLowerCase()
                        ? 'bg-[#fab518] text-[#142142]'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{t === 'todos' ? 'Todos os Tipos' : t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* + Novo post CTA button */}
          <button
            type="button"
            onClick={() => setIsNewPostModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#fab518] hover:bg-[#e6a512] text-[#142142] rounded-full text-xs font-black shadow-md shadow-[#fab518]/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Novo post</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN VIEW CONTENT */}
      {viewMode === 'grade' && (
        /* GRADE: Responsive 4-Column Card Grid exactly matching image */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {filteredDemands.length === 0 ? (
            <div className="col-span-full py-16 text-center space-y-3 bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isClientRole && (selectedStatusFilter === 'todos' || selectedStatusFilter === 'pendente')
                  ? 'Nenhum post aguardando aprovação no momento'
                  : 'Nenhum post encontrado com os filtros selecionados'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isClientRole && (selectedStatusFilter === 'todos' || selectedStatusFilter === 'pendente')
                  ? 'Assim que a equipe da agência finalizar a produção e mover as demandas para a coluna "Aprovação Cliente", elas aparecerão aqui para você aprovar.'
                  : 'Tente redefinir os filtros de status ou tipo para visualizar todos os criativos.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedStatusFilter('todos');
                  setSelectedTypeFilter('todos');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-full bg-[#142142] dark:bg-[#fab518] text-white dark:text-[#142142] text-xs font-bold cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            filteredDemands.map((demand) => {
              const isApproved = demand.approvalStatus === 'aprovado' || demand.columnId === 'agendamento' || demand.columnId === 'concluidas';
              const isAlterations = demand.approvalStatus === 'alteracao_solicitada';
              const isPending = !isApproved && !isAlterations;

              // Slide count indication for carousels
              const slideCount = demand.attachmentsCount || (demand.type === 'Carrossel' ? 3 : demand.type === 'Stories' ? 2 : 1);
              const hasMultiSlides = slideCount > 1;

              return (
                <div
                  key={demand.id}
                  onClick={() => openPreview(demand)}
                  className="group bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer p-4 hover:border-amber-300 dark:hover:border-amber-700/60"
                >
                  <div className="space-y-3.5">
                    {/* Image / Creative Mockup Box */}
                    <div className="relative aspect-[4/3] rounded-[22px] overflow-hidden bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-inner group/img">
                      {demand.title.toLowerCase().includes('flamengo') ? (
                        <FlamengoMockupCard />
                      ) : (
                        <img
                          src={demand.thumbnail || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=600'}
                          alt={demand.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        />
                      )}
                      
                      {/* Gradient overlay on bottom of image for contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      {/* Top Right Multiple Slides Badge "+2" matching image */}
                      {hasMultiSlides && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-black border border-white/20 shadow-md">
                          +{slideCount - 1}
                        </div>
                      )}

                      {/* Hover Quick Zoom Icon */}
                      <button
                        type="button"
                        onClick={(e) => openPreview(demand, e)}
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md backdrop-blur-xs cursor-pointer hover:scale-110"
                        title="Ver em tamanho real"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </div>

                    {/* Post Title */}
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                      {demand.title}
                    </h3>

                    {/* Status Badge */}
                    <div>
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
                          <Clock size={12} className="text-slate-500" />
                          <span>Pendente</span>
                        </span>
                      )}
                      {isAlterations && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-xs shadow-rose-500/20">
                          <MessageSquare size={12} />
                          <span>Alterações solicitadas</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs shadow-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>Aprovado</span>
                        </span>
                      )}
                    </div>

                    {/* Priority & Format tags row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority bullet */}
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className={`w-2 h-2 rounded-full ${
                          demand.priority === 'alta' || demand.priority === 'urgente' 
                            ? 'bg-rose-500' 
                            : demand.priority === 'media' 
                            ? 'bg-amber-500' 
                            : 'bg-slate-400'
                        }`} />
                        <span className={
                          demand.priority === 'alta' || demand.priority === 'urgente' 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : demand.priority === 'media' 
                            ? 'text-amber-600 dark:text-amber-400' 
                            : 'text-slate-500 dark:text-slate-400'
                        }>
                          Prioridade {demand.priority === 'alta' || demand.priority === 'urgente' ? 'Alta' : demand.priority === 'media' ? 'Média' : 'Baixa'}
                        </span>
                      </div>

                      {/* Format chip */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        demand.type === 'Stories' 
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-800' 
                          : demand.type === 'Reels' 
                          ? 'bg-pink-50/70 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-300/80 dark:border-pink-800' 
                          : demand.type === 'Carrossel' 
                          ? 'bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-300/80 dark:border-purple-800' 
                          : 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300/80 dark:border-blue-800'
                      }`}>
                        {demand.type || 'Post'}
                      </span>
                    </div>

                    {/* Feedback Quote Box (When alterations requested) */}
                    {(isAlterations || demand.approvalFeedback) && (
                      <div className="p-3 rounded-2xl bg-amber-50/95 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium shadow-2xs">
                        <span className="font-bold block text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <AlertCircle size={11} className="text-amber-600" />
                          <span>Ajuste Solicitado pelo Cliente:</span>
                        </span>
                        <p className="italic font-semibold text-amber-950 dark:text-amber-100">
                          “{demand.approvalFeedback || "Ajustar o material conforme orientações."}”
                        </p>
                      </div>
                    )}

                    {/* Feedback Quote Box (When revision completed) */}
                    {demand.lastApprovalFeedback && !isAlterations && !demand.approvalFeedback && (
                      <div className="p-3 rounded-2xl bg-emerald-50/95 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium shadow-2xs">
                        <span className="font-bold block text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Check size={11} className="text-emerald-600" />
                          <span>Material Revisado após Ajuste:</span>
                        </span>
                        <p className="italic font-semibold text-emerald-950 dark:text-emerald-100">
                          “{demand.lastApprovalFeedback}”
                        </p>
                      </div>
                    )}

                    {/* Client Pill Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      <User size={12} className="text-slate-400" />
                      <span>{demand.client}</span>
                    </div>
                  </div>

                  {/* Card Bottom Divider & Date / Actions */}
                  <div className="pt-3.5 mt-3.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      {demand.dueDate ? demand.dueDate.split('-').reverse().join('/') : '24/08/2026'}
                    </span>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isApproved && (
                        <button
                          type="button"
                          onClick={(e) => handleApprove(demand, e)}
                          className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                          title="Aprovar post"
                        >
                          <Check size={12} strokeWidth={2.5} />
                          <span>Aprovar</span>
                        </button>
                      )}

                      {!isApproved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeedbackDemand(demand);
                            setFeedbackText(demand.approvalFeedback || '');
                          }}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
                          title="Solicitar alterações"
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}

                      {clientObj?.phone && onOpenWhatsAppNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWhatsAppNotification(demand);
                          }}
                          className="p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-[#25D366] transition-colors cursor-pointer"
                          title="Discutir no WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. ALTERNATE VIEW MODES */}
      {viewMode === 'quadro' && (
        /* QUADRO: Kanban view columns */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-2">
          {[
            { id: 'pendente', title: 'Aguardando Aprovação', count: pendingCount, color: 'border-amber-400 dark:border-amber-700' },
            { id: 'alteracoes', title: 'Ajustes Solicitados', count: changesCount, color: 'border-rose-400 dark:border-rose-800' },
            { id: 'agendamento', title: 'Agendamento (Aprovados)', count: scopedDemands.filter(d => d.columnId === 'agendamento' || (d.approvalStatus === 'aprovado' && d.columnId !== 'concluidas')).length, color: 'border-purple-400 dark:border-purple-800' },
            { id: 'concluidas', title: 'Finalizados', count: scopedDemands.filter(d => d.columnId === 'concluidas').length, color: 'border-emerald-400 dark:border-emerald-800' },
          ].map((col) => {
            const items = scopedDemands.filter((d) => {
              if (col.id === 'pendente') return d.columnId === 'aprovacao' || d.approvalStatus === 'pendente' || (!d.approvalStatus && d.columnId === 'aprovacao');
              if (col.id === 'alteracoes') return d.approvalStatus === 'alteracao_solicitada';
              if (col.id === 'agendamento') return d.columnId === 'agendamento' || (d.approvalStatus === 'aprovado' && d.columnId !== 'concluidas');
              if (col.id === 'concluidas') return d.columnId === 'concluidas';
              return false;
            });

            return (
              <div key={col.id} className="bg-slate-50 dark:bg-slate-900/60 rounded-[24px] p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {col.title}
                  </h4>
                  <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 text-[10px] font-black flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-2xs">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[600px] no-scrollbar">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openPreview(item)}
                      className="p-3 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.thumbnail || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=200'}
                          alt={item.title}
                          className="w-11 h-11 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.client}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span>{item.type || 'Post'}</span>
                        {item.approvalStatus !== 'aprovado' && (
                          <button
                            type="button"
                            onClick={(e) => handleApprove(item, e)}
                            className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px]"
                          >
                            Aprovar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'feed' && (
        /* FEED: Instagram Grid 3x3 Simulator */
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#0f172a] rounded-[32px] border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 p-0.5 flex items-center justify-center">
                  <span className="text-xs font-black text-[#142142] dark:text-[#fab518]">IG</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Feed Preview 3x3 • {currentUser.clientName || 'Instagram'}
                </h3>
                <p className="text-xs text-slate-400">
                  Simulação visual de harmonia da grade do feed
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">{filteredDemands.length} posts</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {filteredDemands.slice(0, 9).map((d) => (
              <div
                key={d.id}
                onClick={() => openPreview(d)}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group shadow-2xs"
              >
                <img
                  src={d.thumbnail || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=400'}
                  alt={d.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                  <span className="text-[10px] font-black uppercase">{d.type}</span>
                  <p className="text-xs font-bold truncate">{d.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'lista' && (
        /* LISTA: Detailed table list */
        <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Post</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Formato</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredDemands.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <img
                        src={d.thumbnail || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=150'}
                        alt={d.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 cursor-pointer"
                        onClick={() => openPreview(d)}
                      />
                      <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:underline" onClick={() => openPreview(d)}>
                        {d.title}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{d.client}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">{d.type}</span>
                    </td>
                    <td className="py-3.5 px-4">{d.priority}</td>
                    <td className="py-3.5 px-4 text-slate-400">{d.dueDate || '24/08/2026'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        d.approvalStatus === 'aprovado' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : d.approvalStatus === 'alteracao_solicitada' 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {d.approvalStatus === 'aprovado' ? 'Aprovado' : d.approvalStatus === 'alteracao_solicitada' ? 'Ajustes' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {d.approvalStatus !== 'aprovado' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(d)}
                          className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                        >
                          Aprovar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openPreview(d)}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'calendario' && (
        /* CALENDÁRIO: Monthly posts scheduling grid */
        <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Calendário de Publicações • Agosto/Setembro 2026
            </h3>
            <span className="text-xs font-bold text-slate-400">{filteredDemands.length} posts agendados</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-1 font-bold text-slate-400 uppercase tracking-wider">{day}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const postsOnDay = filteredDemands.filter((d) => {
                const parts = (d.dueDate || '').split('-');
                return parts.length === 3 && parseInt(parts[2], 10) === day;
              });

              return (
                <div
                  key={day}
                  className={`min-h-[85px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-colors ${
                    postsOnDay.length > 0 
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60'
                  }`}
                >
                  <span className="text-xs font-black text-slate-500">{day}</span>
                  <div className="space-y-1">
                    {postsOnDay.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => openPreview(p)}
                        className="text-[10px] font-bold p-1 rounded-lg bg-white dark:bg-slate-800 text-[#142142] dark:text-[#fab518] truncate cursor-pointer shadow-2xs hover:scale-102"
                      >
                        {p.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'gantt' && (
        /* GANTT: Timeline schedule */
        <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Cronograma & Linha do Tempo (Gantt)
          </h3>
          <div className="space-y-3 pt-2">
            {filteredDemands.map((d, idx) => (
              <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{d.title}</span>
                  <span className="text-[11px] text-slate-400">{d.client} • {d.type}</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-1/2">
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        d.approvalStatus === 'aprovado' ? 'bg-emerald-500' : 'bg-[#fab518]'
                      }`}
                      style={{ width: `${Math.min(100, (idx + 2) * 20)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{d.dueDate || '24/08/2026'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DESEMPENHO TAB */}
      {topNavTab === 'desempenho' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Criativos</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{scopedDemands.length}</span>
                <span className="text-[11px] font-semibold text-slate-500">No fluxo de trabalho</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Layers size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Aguardando Validação</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{pendingCount}</span>
                <span className="text-[11px] font-semibold text-amber-600/80">Pendentes com o cliente</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Aprovados</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{approvedCount}</span>
                <span className="text-[11px] font-semibold text-emerald-600/80">Prontos para publicação</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Ajustes Solicitados</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{changesCount}</span>
                <span className="text-[11px] font-semibold text-rose-600/80">Retornados para equipe</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTAS TAB */}
      {topNavTab === 'notas' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/90 dark:border-slate-800 p-6 space-y-4 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Notas & Alinhamentos de Conteúdo</h3>
              <p className="text-xs text-slate-400">Instruções de tom de voz, regras da marca e sugestões de pautas</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs">
              Help Ideias Digitais
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800 space-y-2">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">Tom de Voz</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Manter comunicação dinâmica, moderna e focada em resultados. Use chamadas assertivas no início dos stories e reels.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 space-y-2">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Padrões Visuais</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Priorizar contraste alto, tipografia limpa sem serifa nos títulos e aplicar sempre o logotipo no canto superior ou fechamento.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800 space-y-2">
              <span className="text-xs font-black text-sky-800 dark:text-sky-300 uppercase tracking-wide">Ciclo de Aprovação</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Posts semanais enviados até terça-feira para aprovação do cliente até quinta-feira às 18h antes da publicação.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {topNavTab === 'chat' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/90 dark:border-slate-800 p-6 space-y-4 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Central de Comunicação & WhatsApp</h3>
              <p className="text-xs text-slate-400">Contate os responsáveis pelos criativos diretamente</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {clients.slice(0, 6).map((c) => {
              const clientPending = scopedDemands.filter(d => (d.client || '').toLowerCase() === c.name.toLowerCase() && (d.columnId === 'aprovacao' || d.approvalStatus === 'pendente')).length;
              const phoneClean = (c.phone || '11999999999').replace(/[^0-9]/g, '');
              const waUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(`Olá ${c.name}! Tudo bem? Temos ${clientPending} materiais no seu Portal de Aprovação da Help Ideias Digitais para você conferir.`)}`;

              return (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{c.name}</h4>
                    <p className="text-[11px] text-slate-400">{c.phone || '(11) 98765-4321'}</p>
                    <span className="text-[10px] font-bold text-amber-500">{clientPending} pendentes</span>
                  </div>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xs cursor-pointer flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MODALS */}

      {/* LIGHTBOX / FULLSCREEN PREVIEW MODAL - DESIGN FIEL À IMAGEM "EXEMPLO.PNG" */}
      {previewDemand && (() => {
        const clientName = previewDemand.client || 'Portal Publicitário';
        const clientInitials = (() => {
          const raw = clientName.trim().split(/\s+/).filter(Boolean);
          if (raw.length >= 2) return `${raw[0][0]}${raw[1][0]}`.toUpperCase();
          return clientName.slice(0, 2).toUpperCase();
        })();

        const mediaItems = (previewDemand.attachments || []).filter(
          (a) => a.type === 'image' || a.type === 'video'
        );

        const isFlamengoPost = 
          previewDemand.title.toLowerCase().includes('flamengo') || 
          (previewDemand.description && previewDemand.description.toLowerCase().includes('flamengo')) ||
          mediaItems.length === 0;

        const effectiveMedia = mediaItems.length > 0 
          ? mediaItems 
          : (previewDemand.thumbnail ? [{
              id: 'thumb-1',
              name: `${previewDemand.title}.jpg`,
              size: 1024 * 1024,
              type: 'image',
              url: previewDemand.thumbnail,
              uploadedAt: 'Versão para aprovação',
            }] : [
              {
                id: 'slide-1',
                name: 'Lâmina 1 - Mockup Principal.jpg',
                size: 1024 * 1024,
                type: 'image',
                url: '',
                uploadedAt: 'Versão para aprovação',
              },
              {
                id: 'slide-2',
                name: 'Lâmina 2 - Detalhes do Design.jpg',
                size: 1024 * 1024,
                type: 'image',
                url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=1000',
                uploadedAt: 'Versão para aprovação',
              },
              {
                id: 'slide-3',
                name: 'Lâmina 3 - Encerramento & CTA.jpg',
                size: 1024 * 1024,
                type: 'image',
                url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000',
                uploadedAt: 'Versão para aprovação',
              }
            ]);

        const totalSlides = effectiveMedia.length;
        const currentMedia = effectiveMedia[previewSlideIndex] || effectiveMedia[0];
        const isApproved = previewDemand.approvalStatus === 'aprovado' || previewDemand.columnId === 'agendamento' || previewDemand.columnId === 'concluidas';
        const placementLabel = previewDemand.type === 'Stories' ? 'Stories' : previewDemand.type === 'Carrossel' ? 'Carrossel' : 'Feed';
        const scheduledDate = previewDemand.dueDate || '12/10 às 18:00';

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
            onClick={() => setPreviewDemand(null)}
          >
            <div 
              className="bg-[#EEF0F4] dark:bg-[#0c1220] w-full max-w-5xl rounded-[32px] sm:rounded-[36px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 text-slate-900 dark:text-slate-100 flex flex-col md:grid md:grid-cols-12 max-h-[94vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* TOP HEADER: AF Agência Farol • Link de aprovação (exemplo.png) */}
              <header className="col-span-12 px-6 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#0c1220]/70 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#12151e] text-white flex items-center justify-center font-black text-xs tracking-tight shadow-xs shrink-0">
                    AF
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
                      Agência Farol
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">
                      Link de aprovação
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewDemand(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="Fechar visualização"
                >
                  <X size={16} />
                </button>
              </header>

              {/* COLUNA 1 (ESQUERDA): CARD VISUAL DA PEÇA (MOCKUP / ARTWORK) */}
              {/* Exactly matching CSS Selector 1: ... > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) */}
              <div className="md:col-span-5 p-6 sm:p-8 flex flex-col items-center justify-center overflow-y-auto">
                <div className="w-full max-w-[390px] aspect-[4/5] rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-xl border border-slate-200/90 dark:border-slate-800/80 bg-gradient-to-b from-[#fbf8f3] via-[#ffedd5] to-[#f97316] relative flex flex-col justify-between group">
                  
                  {/* Badge Contador de Lâmina: 1/3 (Top-Right) */}
                  <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-black tracking-wider shadow-xs">
                    {previewSlideIndex + 1}/{totalSlides}
                  </div>

                  {/* Botão de Expandir Lightbox */}
                  {currentMedia?.url && (
                    <button
                      type="button"
                      onClick={() => window.open(currentMedia.url, '_blank')}
                      className="absolute bottom-4 left-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Ampliar imagem"
                    >
                      <Maximize2 size={15} />
                    </button>
                  )}

                  {/* Controles de Navegação do Carrossel */}
                  {totalSlides > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewSlideIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Slide anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Próximo slide"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Imagem do Post ou Ilustração Mockup Fiel ao Exemplo */}
                  <div 
                    className="w-full h-full relative cursor-pointer overflow-hidden"
                    onClick={totalSlides > 1 ? () => setPreviewSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0)) : undefined}
                  >
                    {previewSlideIndex === 0 && (isFlamengoPost || !currentMedia?.url) ? (
                      <FlamengoMockupCard />
                    ) : currentMedia?.url ? (
                      <img
                        src={currentMedia.url}
                        alt={previewDemand.title}
                        className="absolute inset-0 w-full h-full object-cover rounded-[32px] sm:rounded-[36px]"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 sm:p-7 bg-gradient-to-b from-[#fbf8f3] via-[#ffedd5] to-[#f97316] text-[#142142]">
                        <div className="pt-8">
                          <p className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#142142]">
                            {previewDemand.title}
                          </p>
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-slate-800 font-medium">
                            {previewDemand.description || 'Mockup para aprovação da agência'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Indicador de Bolinhas do Carrossel */}
                {totalSlides > 1 && (
                  <div className="flex items-center gap-1.5 pt-3">
                    {effectiveMedia.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          previewSlideIndex === idx 
                            ? 'w-6 bg-[#f97316]' 
                            : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* COLUNA 2 (DIREITA): INFORMAÇÕES DO POST & DECISÃO DO CLIENTE */}
              {/* Exactly matching CSS Selector 2: ... > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(2) */}
              <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-5 overflow-y-auto">
                
                {/* 1. Meta Row: [PP] Portal Publicitário • Feed • 12/10 às 18:00 */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                  <div className="w-7 h-7 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {clientInitials}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {clientName}
                  </span>
                  <span className="text-slate-400">·</span>
                  <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                    <Instagram size={14} className="text-slate-500" />
                    <span>{placementLabel}</span>
                  </div>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {scheduledDate}
                  </span>
                </div>

                {/* 2. Título do Post (Flamengo: camisa feita pelo público) */}
                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-normal text-slate-900 dark:text-white tracking-tight leading-snug">
                  {previewDemand.title}
                </h1>

                {/* 3. Descrição / Legenda do Post */}
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {previewDemand.description || 'O clube divulgou os 5 finalistas do uniforme desenhado pela torcida. O designer vencedor leva R$ 10 mil e a camisa.'}
                </p>

                {/* 4. Status Capsule: Aguardando sua aprovação */}
                <div>
                  {isApproved ? (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-medium shadow-xs">
                      <Check size={14} className="stroke-[2.5]" />
                      <span>Aprovado para agendamento</span>
                    </div>
                  ) : previewDemand.approvalStatus === 'alteracao_solicitada' ? (
                    <div className="space-y-2.5">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-medium shadow-xs">
                        <Clock size={14} className="stroke-[2.5]" />
                        <span>Ajustes solicitados à agência</span>
                      </div>
                      {previewDemand.approvalFeedback && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 text-xs sm:text-sm font-medium shadow-2xs">
                          <span className="font-bold block text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-amber-600 dark:text-amber-400" />
                            <span>O que o cliente pediu para ajustar:</span>
                          </span>
                          <p className="italic font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                            “{previewDemand.approvalFeedback}”
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8E99A8] text-white text-xs sm:text-sm font-medium shadow-xs">
                        <Clock size={14} className="stroke-[2.5]" />
                        <span>Aguardando sua aprovação</span>
                      </div>
                      {previewDemand.lastApprovalFeedback && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100 text-xs sm:text-sm font-medium shadow-2xs">
                          <span className="font-bold block text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Material revisado após solicitação de ajuste:</span>
                          </span>
                          <p className="italic font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                            “{previewDemand.lastApprovalFeedback}”
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Caixa de Comentário para a Agência (exemplo.png) */}
                <div className="bg-white dark:bg-[#121827] rounded-[24px] p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-[#f97316]/30 transition-all">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    <MessageSquare size={14} className="text-slate-500" />
                    <span>Comentário para a agência</span>
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Amei! Ficou excelente... Ou descreva os ajustes desejados"
                    rows={2}
                    className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none font-normal leading-relaxed"
                  />
                </div>

                {/* 6. Botões de Ação: [Pedir ajustes]  [✓ Aprovar] (exemplo.png) */}
                <div className="flex items-center justify-end gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (feedbackText.trim()) {
                        onClientApprovalAction(previewDemand.id, 'alteracao_solicitada', feedbackText.trim());
                        setActionSuccessNotice({
                          id: previewDemand.id,
                          message: `Solicitação de alteração enviada para "${previewDemand.title}".`,
                          type: 'warn',
                        });
                        setPreviewDemand(null);
                        setFeedbackText('');
                      } else {
                        setFeedbackDemand(previewDemand);
                        setPreviewDemand(null);
                      }
                    }}
                    className="px-6 sm:px-7 py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm shadow-xs border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    Pedir ajustes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(previewDemand);
                      setPreviewDemand(null);
                    }}
                    className="px-7 sm:px-8 py-3 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Check size={18} className="stroke-[3]" />
                    <span>Aprovar</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* FEEDBACK / ALTERAÇÃO MODAL */}
      {feedbackDemand && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setFeedbackDemand(null)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Solicitar Ajuste no Criativo
              </h3>
              <button 
                type="button" 
                onClick={() => setFeedbackDemand(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Descreva com detalhes o que a equipe da Help Ideias Digitais deve alterar em <strong>"{feedbackDemand.title}"</strong>:
            </p>

            <form onSubmit={handleSendFeedback} className="space-y-3">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Ex: Ajustar a cor do fundo, trocar a foto da lâmina 2 e aumentar o logo no fechamento..."
                rows={4}
                required
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fab518]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackDemand(null)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#142142] dark:bg-[#fab518] text-white dark:text-[#142142] text-xs font-black cursor-pointer shadow-md"
                >
                  Enviar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK APPROVAL MODAL */}
      {isBulkApprovalModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBulkApprovalModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Aprovação em Lote
            </h3>

            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Deseja aprovar todos os <strong>{pendingCount} posts pendentes</strong> de uma só vez? Eles serão movidos imediatamente para a coluna Agendamento.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkApprovalModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={pendingCount === 0}
                className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs cursor-pointer shadow-md"
              >
                Confirmar e Aprovar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO POST MODAL */}
      {isNewPostModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsNewPostModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Solicitar / Cadastrar Novo Post
              </h3>
              <button 
                type="button" 
                onClick={() => setIsNewPostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsNewPostModalOpen(false);
                setActionSuccessNotice({
                  id: 'new-post',
                  message: `Demanda de post "${newPostTitle || 'Novo Post'}" cadastrada com sucesso!`,
                  type: 'success',
                });
                setNewPostTitle('');
                setNewPostDescription('');
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Post / Tema
                </label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Ex: Post lançamento produto de verão"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fab518]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Formato
                  </label>
                  <select
                    value={newPostType}
                    onChange={(e) => setNewPostType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Stories">Stories</option>
                    <option value="Reels">Reels</option>
                    <option value="Carrossel">Carrossel</option>
                    <option value="Post">Post Estático</option>
                    <option value="Meta Ads">Meta Ads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data Desejada
                  </label>
                  <input
                    type="date"
                    defaultValue="2026-08-28"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Briefing / Instruções para a Agência
                </label>
                <textarea
                  value={newPostDescription}
                  onChange={(e) => setNewPostDescription(e.target.value)}
                  placeholder="Explique o objetivo, chamada para ação, promoções ou referências visuais desejadas..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#fab518] text-[#142142] text-xs font-black cursor-pointer shadow-md"
                >
                  Criar Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTROS AVANÇADOS MODAL */}
      {isFiltersModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsFiltersModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Filtros de Criativos
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFiltersModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Busca por Palavra-Chave
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por título, texto ou cliente..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>
              </div>

              {!isClientRole && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Filtrar por Cliente
                  </label>
                  <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <option value="todos">Todos os Clientes</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedStatusFilter('todos');
                  setSelectedTypeFilter('todos');
                  setSelectedClientFilter('todos');
                  setSearchQuery('');
                  setIsFiltersModalOpen(false);
                }}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setIsFiltersModalOpen(false)}
                className="px-5 py-2 rounded-full bg-[#142142] dark:bg-[#fab518] text-white dark:text-[#142142] text-xs font-black cursor-pointer shadow-md"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT PASSWORD MANAGER MODAL */}
      {isPasswordManagerModalOpen && (
        <ClientPasswordManagerModal
          isOpen={isPasswordManagerModalOpen}
          onClose={() => setIsPasswordManagerModalOpen(false)}
          clients={clients}
          onUpdateClient={onUpdateClient || (() => {})}
        />
      )}

      {/* CLIENT SIMULATOR MODAL */}
      {isSimulatorModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsSimulatorModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Simulador do Portal do Cliente</h3>
                  <p className="text-[11px] text-slate-400">Visão real do cliente ao acessar pelo celular ou computador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Device Switcher */}
            <div className="px-5 pt-3 pb-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSimulatorDevice('mobile')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSimulatorDevice === 'mobile'
                    ? 'bg-[#142142] dark:bg-[#fab518] text-white dark:text-[#142142]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Smartphone size={13} />
                <span>Mobile (iPhone)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSimulatorDevice('desktop')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSimulatorDevice === 'desktop'
                    ? 'bg-[#142142] dark:bg-[#fab518] text-white dark:text-[#142142]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Monitor size={13} />
                <span>Desktop (Navegador)</span>
              </button>
            </div>

            {/* Frame Body */}
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950/60">
              <div className={`transition-all duration-300 ${
                activeSimulatorDevice === 'mobile'
                  ? 'w-[320px] rounded-[36px] border-4 border-slate-800 bg-white dark:bg-[#0f172a] p-4 shadow-xl space-y-3'
                  : 'w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-4 shadow-lg space-y-3'
              }`}>
                {/* Simulated Notch */}
                {activeSimulatorDevice === 'mobile' && (
                  <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
                )}

                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-black text-[#142142] dark:text-[#fab518]">Help Ideias Digitais</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">Portal Ativo</span>
                </div>

                {filteredDemands.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900">
                      <img
                        src={filteredDemands[0].thumbnail || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=400'}
                        alt={filteredDemands[0].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">{filteredDemands[0].title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{filteredDemands[0].client} • {filteredDemands[0].type}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleApprove(filteredDemands[0]);
                          setIsSimulatorModalOpen(false);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-emerald-500 text-white text-[11px] font-bold text-center cursor-pointer shadow-xs"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSimulatorModalOpen(false);
                          setFeedbackDemand(filteredDemands[0]);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/10 text-rose-600 text-[11px] font-bold text-center cursor-pointer"
                      >
                        Pedir Ajuste
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Nenhum post em aprovação no momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  DemandItem, 
  Client, 
  UserProfile, 
  Invoice,
  KanbanColumn,
  Service
} from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  Wallet, 
  Briefcase,
  LayoutGrid, 
  FileText, 
  BarChart3, 
  Receipt, 
  Folder, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare,
  Calendar, 
  Instagram, 
  Globe, 
  MapPin, 
  Building2, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Share2, 
  Lock, 
  Eye, 
  Download,
  ArrowRight,
  TrendingUp,
  ThumbsUp,
  Search,
  Filter,
  Maximize2,
  ZoomIn
} from 'lucide-react';

export interface PortalClienteViewProps {
  demands: DemandItem[];
  clients: Client[];
  services?: Service[];
  invoices?: Invoice[];
  columns?: KanbanColumn[];
  currentUser?: UserProfile;
  onClientApprovalAction: (
    demandId: string, 
    action: 'aprovado' | 'reprovado' | 'alteracao_solicitada', 
    feedback?: string
  ) => void;
  onOpenWhatsAppNotification?: (demand: DemandItem) => void;
  onOpenDemandModal?: (demand: DemandItem) => void;
  onUpdateClient?: (client: Client) => void;
  onSelectClientDemands?: (clientName: string) => void;
  onNavigateToApprovals?: () => void;
  onOpenClientApprovalPortal?: (demand: DemandItem) => void;
  onNavigateToPortal?: () => void;
}

type PortalTab = 'visao_geral' | 'conteudo' | 'metricas' | 'financeiro' | 'arquivos';

export const isAprovacaoClienteColumn = (columnId?: string, columns?: KanbanColumn[]): boolean => {
  if (!columnId) return false;
  const colLower = columnId.toLowerCase().trim();

  // 1. Verificação por identificadores padrão da coluna Aprovação Cliente
  if (
    colLower === 'aprovacao' ||
    colLower === 'aprovacao-cliente' ||
    colLower === 'aprovacao_cliente' ||
    colLower === 'aprovacaocliente' ||
    colLower === 'aprovacao cliente' ||
    colLower === 'em aprovacao' ||
    colLower === 'em aprovação' ||
    colLower.includes('aprov')
  ) {
    return true;
  }

  // 2. Verificação pelas colunas passadas (Kanban)
  if (columns && columns.length > 0) {
    const matchedCol = columns.find(c => c.id.toLowerCase().trim() === colLower);
    if (matchedCol) {
      const titleLower = (matchedCol.title || '').toLowerCase().trim();
      if (titleLower.includes('aprov')) {
        return true;
      }
    }
  }

  // 3. Fallback para colunas persistidas no localStorage
  try {
    const saved = localStorage.getItem('agency_kanban_columns');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const matchedCol = parsed.find((c: any) => c.id && c.id.toLowerCase().trim() === colLower);
        if (matchedCol && (matchedCol.title || '').toLowerCase().trim().includes('aprov')) {
          return true;
        }
      }
    }
  } catch {}

  return false;
};

const defaultFallbackClient: Client = {
  id: 'client-portal-pub',
  name: 'Portal Publicitário',
  companyName: 'Portal Publicitário',
  segment: 'Comunicação & Mídia',
  contactName: 'Equipe de conteúdo',
  contactRole: 'Gerente de Contas',
  email: 'contato@exemplo.com.br',
  phone: '(21) 90000-0000',
  avatar: '',
  coverColor: '#ff9800',
  status: 'Ativo',
  monthlyFee: 2500,
  services: ['Social Media', 'Conteúdo'],
  activeDemandsCount: 0,
  joinedDate: '15/01/2026',
  website: 'https://portalpublicitario.com.br',
  instagram: '@portalpublicitario',
  city: 'Rio de Janeiro',
  state: 'RJ',
  address: 'Av. das Américas, 4200 - Barra da Tijuca',
};

export const PortalClienteView: React.FC<PortalClienteViewProps> = ({
  demands,
  clients,
  services = [],
  invoices = [],
  columns = [],
  currentUser,
  onClientApprovalAction,
  onOpenWhatsAppNotification,
  onOpenDemandModal,
  onUpdateClient,
  onOpenClientApprovalPortal,
  onNavigateToApprovals,
}) => {
  // Aba Ativa (Visão geral, Conteúdo, Métricas, Financeiro, Arquivos)
  const [activeTab, setActiveTab] = useState<PortalTab>('visao_geral');
  
  // Modal Central Estratégica
  const [isEstrategicaModalOpen, setIsEstrategicaModalOpen] = useState(false);
  
  // Feedback ao solicitar ajustes em post
  const [adjustingDemand, setAdjustingDemand] = useState<DemandItem | null>(null);
  const [adjustFeedbackText, setAdjustFeedbackText] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Seletor de cliente para administradores
  const isClientRole = currentUser?.role === 'cliente';
  const clientScopeName = (currentUser?.clientName || currentUser?.name || '').trim().toLowerCase();

  // Cliente selecionado atualmente (para admin testar outros clientes)
  const [selectedAdminClientId, setSelectedAdminClientId] = useState<string>('');

  // Identificação do cliente atual
  const activeClient: Client = useMemo(() => {
    if (selectedAdminClientId) {
      const found = clients.find(c => c.id === selectedAdminClientId);
      if (found) return found;
    }

    if (currentUser?.clientId) {
      const found = clients.find(c => c.id === currentUser.clientId);
      if (found) return found;
    }

    if (clientScopeName) {
      const found = clients.find(
        c => c.name.toLowerCase() === clientScopeName || 
             (c.companyName && c.companyName.toLowerCase() === clientScopeName)
      );
      if (found) return found;
    }

    if (clients.length > 0) {
      return clients[0];
    }

    return defaultFallbackClient;
  }, [clients, currentUser?.clientId, clientScopeName, selectedAdminClientId]);

  // Iniciais do cliente para o avatar circular
  const clientInitials = useMemo(() => {
    const raw = activeClient.companyName || activeClient.name || 'PP';
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [activeClient]);

  // Filtragem de demandas do cliente
  const clientDemands = useMemo(() => {
    const cName = activeClient.name.toLowerCase();
    const cCompany = (activeClient.companyName || '').toLowerCase();
    return demands.filter(d => {
      if (d.clientId && d.clientId === activeClient.id) return true;
      const dClient = (d.client || '').toLowerCase();
      const dProject = (d.clientProject || '').toLowerCase();
      return dClient === cName || dClient === cCompany || dProject.includes(cName) || dProject.includes(cCompany);
    });
  }, [demands, activeClient]);

  // Regra Oficial: No portal do cliente, em conteúdo, mostrar SOMENTE para o cliente a demanda que estiver na coluna Aprovação Cliente
  const pendingApprovalDemands = useMemo(() => {
    return clientDemands.filter((d) => {
      const isColApproval = isAprovacaoClienteColumn(d.columnId, columns);
      const notDone = d.columnId !== 'agendamento' && d.columnId !== 'concluidas';
      return isColApproval && notDone;
    });
  }, [clientDemands, columns]);

  // Se o usuário logado for cliente, apenas demandas de aprovação cliente contam como ativas
  const activeDemandsCount = useMemo(() => {
    if (isClientRole) {
      return pendingApprovalDemands.length;
    }
    return clientDemands.filter(d => d.columnId !== 'concluidas').length;
  }, [clientDemands, isClientRole, pendingApprovalDemands]);

  // Valor do serviço contratado pelo cliente (mensalidade / pacote)
  const contractedServiceValue = useMemo(() => {
    // 1. Mensalidade explicitamente cadastrada no cliente
    if (typeof activeClient.monthlyFee === 'number' && activeClient.monthlyFee > 0) {
      return activeClient.monthlyFee;
    }

    // 2. Se o cliente possui serviços cadastrados e temos catálogo com preços
    if (services && services.length > 0 && activeClient.services && activeClient.services.length > 0) {
      const matched = services.filter((s) =>
        activeClient.services?.some((cs) => {
          const a = cs.toLowerCase().trim();
          const b = s.title.toLowerCase().trim();
          return a === b || a.includes(b) || b.includes(a);
        })
      );
      const sum = matched.reduce((acc, curr) => acc + (curr.basePrice || 0), 0);
      if (sum > 0) return sum;
    }

    // 3. Buscar na última fatura emitida do cliente
    if (invoices && invoices.length > 0) {
      const cInvoices = invoices.filter(
        (inv) => inv.client?.toLowerCase().trim() === activeClient.name?.toLowerCase().trim()
      );
      if (cInvoices.length > 0) {
        const latest = cInvoices[cInvoices.length - 1];
        if (latest.value && latest.value > 0) return latest.value;
      }
    }

    // 4. Valor estimado proporcional ao número de serviços contratados
    if (activeClient.services && activeClient.services.length > 0) {
      return activeClient.services.length * 1500;
    }

    return 2500;
  }, [activeClient, services, invoices]);

  // Data em que virou cliente (formatada para exibição na ficha)
  const formattedJoinedDate = useMemo(() => {
    if (!activeClient.joinedDate) return '15/01/2026';
    const val = String(activeClient.joinedDate).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    try {
      const d = new Date(val.includes('T') ? val : `${val}T00:00:00`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR');
      }
    } catch {}
    return val;
  }, [activeClient.joinedDate]);

  // Estado da aba Conteúdo (Busca, Filtro de Tipo e Modal de Preview da Peça)
  const [conteudoSearch, setConteudoSearch] = useState('');
  const [conteudoTypeFilter, setConteudoTypeFilter] = useState<string>('todos');
  const [previewPost, setPreviewPost] = useState<DemandItem | null>(null);
  const [expandedCaptionIds, setExpandedCaptionIds] = useState<Record<string, boolean>>({});
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const toggleCaption = (demandId: string) => {
    setExpandedCaptionIds(prev => ({ ...prev, [demandId]: !prev[demandId] }));
  };

  const handleCopyCaption = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText?.(text);
    setCopiedCaption(true);
    setActionNotice('Legenda copiada para a área de transferência!');
    setTimeout(() => {
      setCopiedCaption(false);
      setActionNotice(null);
    }, 3000);
  };

  const handleCopyEmail = (emailStr: string) => {
    if (!emailStr) return;
    navigator.clipboard?.writeText?.(emailStr);
    setCopiedEmail(true);
    setActionNotice('E-mail copiado!');
    setTimeout(() => {
      setCopiedEmail(false);
      setActionNotice(null);
    }, 2500);
  };

  // Demandas filtradas para a aba Conteúdo
  const filteredConteudoDemands = useMemo(() => {
    return pendingApprovalDemands.filter((d) => {
      if (conteudoSearch.trim()) {
        const q = conteudoSearch.toLowerCase();
        const matchesTitle = (d.title || '').toLowerCase().includes(q);
        const matchesDesc = (d.description || '').toLowerCase().includes(q);
        const matchesType = (d.type || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesType) return false;
      }
      if (conteudoTypeFilter !== 'todos') {
        const dType = (d.type || '').toLowerCase();
        if (conteudoTypeFilter === 'post' && !dType.includes('post') && !dType.includes('feed') && !dType.includes('estático') && !dType.includes('estatico')) return false;
        if (conteudoTypeFilter === 'stories' && !dType.includes('stor')) return false;
        if (conteudoTypeFilter === 'carrossel' && !dType.includes('carrossel')) return false;
        if (conteudoTypeFilter === 'reels' && !dType.includes('reel') && !dType.includes('vídeo') && !dType.includes('video')) return false;
      }
      return true;
    });
  }, [pendingApprovalDemands, conteudoSearch, conteudoTypeFilter]);

  const projectsCount = useMemo(() => {
    const set = new Set<string>();
    clientDemands.forEach(d => {
      if (d.clientProject && d.clientProject.trim()) {
        set.add(d.clientProject.trim());
      }
    });
    // Se não há nomes de projetos específicos preenchidos, verifica categorias de serviços distintas nas demandas
    if (set.size === 0 && clientDemands.length > 0) {
      clientDemands.forEach(d => {
        if (d.serviceCategory && d.serviceCategory.trim()) {
          set.add(d.serviceCategory.trim());
        }
      });
    }
    return set.size;
  }, [clientDemands]);

  // Faturas do cliente
  const clientInvoices = useMemo(() => {
    const cName = activeClient.name.toLowerCase();
    const cCompany = (activeClient.companyName || '').toLowerCase();
    return invoices.filter(i => {
      const invClient = (i.client || '').toLowerCase();
      return invClient === cName || invClient === cCompany;
    });
  }, [invoices, activeClient]);

  const handleApprove = (demandId: string) => {
    onClientApprovalAction(demandId, 'aprovado');
    setActionNotice('Material Aprovado com sucesso! A agência foi avisada.');
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleOpenAdjustModal = (demand: DemandItem) => {
    setAdjustingDemand(demand);
    setAdjustFeedbackText(demand.approvalFeedback || '');
  };

  const handleSubmitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingDemand) return;
    if (!adjustFeedbackText.trim()) return;

    onClientApprovalAction(adjustingDemand.id, 'alteracao_solicitada', adjustFeedbackText.trim());
    setActionNotice('Solicitação de ajuste enviada para a agência!');
    setAdjustingDemand(null);
    setAdjustFeedbackText('');
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleCopyPix = () => {
    navigator.clipboard?.writeText?.('financeiro@helpideiasdigitais.com.br');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Toast de Confirmação */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#142142] text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#ff9900]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Switcher para Administrador visualizar qualquer cliente */}
      {!isClientRole && clients.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
            <Eye size={15} className="text-[#ff9900]" />
            <span>Modo de visualização administrativa do Portal do Cliente:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedAdminClientId || activeClient.id}
              onChange={(e) => setSelectedAdminClientId(e.target.value)}
              className="bg-white dark:bg-[#0c1424] border border-amber-500/30 rounded-xl px-3 py-1.5 font-bold text-slate-800 dark:text-white cursor-pointer"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name} ({c.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. HEADER DO CLIENTE: CAPA LARANJA + AVATAR + NOME + STATUS (aaaa.png)*/}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-[#0c1424] rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        
        {/* Banner de Capa Laranja Vibrante */}
        <div 
          className="h-32 sm:h-40 w-full relative"
          style={{
            backgroundColor: activeClient.coverColor || '#ff9800',
            backgroundImage: 'linear-gradient(135deg, #ff9900 0%, #f59e0b 50%, #f59e0b 100%)'
          }}
        >
          {/* Avatar Circular Sobreposto na Base da Capa */}
          <div className="absolute -bottom-10 sm:-bottom-12 left-6 sm:left-8 z-10">
            {activeClient.avatar && activeClient.avatar.startsWith('http') ? (
              <img
                src={activeClient.avatar}
                alt={activeClient.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-[#0c1424] shadow-md bg-[#12151e]"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#12151e] border-4 border-white dark:border-[#0c1424] flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-md tracking-tight">
                {clientInitials}
              </div>
            )}
          </div>
        </div>

        {/* Informações Principais do Cliente: Título, Status e Tags */}
        <div className="pt-12 sm:pt-14 px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeClient.companyName || activeClient.name}
                </h1>
                {/* Badge Ativo */}
                <span className="px-3.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs tracking-wide shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{activeClient.status || 'Ativo'}</span>
                </span>
              </div>

              {/* Tags / Serviços Abaixo do Título */}
              {activeClient.services && activeClient.services.length > 0 && (
                <div className="flex items-center gap-2 pt-2.5 flex-wrap">
                  {activeClient.services.map((serv, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                    >
                      {serv}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Acesso rápido às aprovações se houver pendências */}
            {pendingApprovalDemands.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('conteudo')}
                className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#ff9900] border border-amber-300/80 dark:border-amber-800/80 font-bold text-xs flex items-center gap-2 hover:bg-[#ff9900] hover:text-[#142142] transition-all cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <Clock size={14} />
                <span>{pendingApprovalDemands.length} posts aguardando aprovação</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 2. BARRA DE NAVEGAÇÃO EM PÍLULAS (Visão geral, Conteúdo, Métricas...) */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-[#0c1424] rounded-full p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('visao_geral')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'visao_geral'
              ? 'bg-[#ff9900] text-[#142142] shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <LayoutGrid size={15} className={activeTab === 'visao_geral' ? 'text-[#142142]' : 'text-slate-500'} />
          <span>Visão geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conteudo')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'conteudo'
              ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText size={15} className={activeTab === 'conteudo' ? 'text-[#142142]' : 'text-slate-500'} />
          <span>Conteúdo</span>
          {pendingApprovalDemands.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#12151e] text-[#ff9900] text-[10px] font-black flex items-center justify-center">
              {pendingApprovalDemands.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metricas')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'metricas'
              ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 size={15} className={activeTab === 'metricas' ? 'text-[#142142]' : 'text-slate-500'} />
          <span>Métricas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'financeiro'
              ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Receipt size={15} className={activeTab === 'financeiro' ? 'text-[#142142]' : 'text-slate-500'} />
          <span>Financeiro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('arquivos')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'arquivos'
              ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Folder size={15} className={activeTab === 'arquivos' ? 'text-[#142142]' : 'text-slate-500'} />
          <span>Arquivos</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. CONTEÚDO DA ABA: "Visão geral" (DESIGN IDÊNTICO À IMAGEM aaaa.png) */}
      {/* ==================================================================== */}
      {activeTab === 'visao_geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ---------------------------------------------------------------- */}
          {/* CARD ESQUERDO: Ficha do cliente (7 cols)                         */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-6">
            
            {/* Cabeçalho do Card */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ff9900] text-[#142142] flex items-center justify-center font-bold shadow-xs">
                <User size={18} />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Ficha do cliente
              </h2>
            </div>

            {/* Linhas de Informações com Linha de Conexão Horizontal */}
            <div className="space-y-4 pt-1">
              
              {/* Linha 1: Nome */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  <User size={15} className="text-slate-400" />
                  <span>Nome</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-slate-200 dark:border-slate-800" />
                <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right">
                  {activeClient.contactName || activeClient.name || 'Equipe de conteúdo'}
                </span>
              </div>

              {/* Linha 2: E-mail */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  <Mail size={15} className="text-slate-400" />
                  <span>E-mail</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-slate-200 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => handleCopyEmail(activeClient.email || 'contato@exemplo.com.br')}
                  className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right font-mono hover:text-[#ff9900] transition-colors cursor-pointer flex items-center gap-1 group"
                  title="Clique para copiar e-mail"
                >
                  <span>{activeClient.email || 'contato@exemplo.com.br'}</span>
                  {copiedEmail ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="text-slate-400 group-hover:text-[#ff9900]" />}
                </button>
              </div>

              {/* Linha 3: Telefone */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  <Phone size={15} className="text-slate-400" />
                  <span>Telefone</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-slate-200 dark:border-slate-800" />
                {(() => {
                  const rawPhone = activeClient.phone || '(21) 90000-0000';
                  const cleanP = rawPhone.replace(/\D/g, '');
                  const wa = cleanP.length >= 10 ? `https://wa.me/55${cleanP}` : undefined;
                  return wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right font-mono hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 group"
                      title="Abrir no WhatsApp"
                    >
                      <span>{rawPhone}</span>
                      <ExternalLink size={11} className="text-slate-400 group-hover:text-emerald-500" />
                    </a>
                  ) : (
                    <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right font-mono">
                      {rawPhone}
                    </span>
                  );
                })()}
              </div>

              {/* Linha 4: Valor do serviço contratado */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  <Briefcase size={15} className="text-slate-400" />
                  <span>Valor do serviço contratado</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-slate-200 dark:border-slate-800" />
                <span 
                  className="font-black text-slate-900 dark:text-white shrink-0 text-right font-mono flex items-center gap-1.5"
                  title="Valor do serviço contratado fixado pela agência em contrato (edição não permitida para o cliente)"
                >
                  <span>
                    R$ {contractedServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span 
                    className="p-1 rounded-md text-slate-400 dark:text-slate-500 inline-flex items-center justify-center cursor-default"
                    title="Valor contratado fixado pela agência (edição bloqueada)"
                  >
                    <Lock size={12} className="text-slate-400 dark:text-slate-500" />
                  </span>
                </span>
              </div>

              {/* Linha 5: Cliente desde */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  <Calendar size={15} className="text-slate-400" />
                  <span>Cliente desde</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-slate-200 dark:border-slate-800" />
                <span 
                  className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right font-mono flex items-center gap-1.5"
                  title="Data de início da parceria com a agência"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{formattedJoinedDate}</span>
                </span>
              </div>

            </div>

            {/* Informações Complementares da Empresa */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-[#ff9900]" />
                <span>Segmento: <strong>{activeClient.segment || 'Comunicação & Mídia'}</strong></span>
              </div>
              {activeClient.city && (
                <div className="flex items-center gap-1 text-[11px]">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{activeClient.city}/{activeClient.state || 'BR'}</span>
                </div>
              )}
            </div>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CARD DIREITO: Visão geral (5 cols) (Dark Card aaaa.png)          */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-5 bg-[#10141e] text-white rounded-[28px] p-6 sm:p-7 shadow-xl border border-slate-800/80 flex flex-col justify-between space-y-6">
            
            <div className="space-y-6">
              {/* Kicker / Subtítulo */}
              <p className="text-xs text-slate-400 font-medium">
                Visão geral
              </p>

              {/* 3 Contadores Grandes Lado a Lado (Projetos, Conteúdos pendentes, Demandas ativas) */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Projetos */}
                <div>
                  <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    {projectsCount}
                  </p>
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    Projetos
                  </p>
                </div>

                {/* 2. Conteúdos pendentes (Destaque em Laranja) */}
                <div>
                  <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#ff9900]">
                    {pendingApprovalDemands.length}
                  </p>
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    Conteúdos pendentes
                  </p>
                </div>

                {/* 3. Demandas ativas */}
                <div>
                  <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    {activeDemandsCount}
                  </p>
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    Demandas ativas
                  </p>
                </div>
              </div>
            </div>

            {/* Botão Inferior: Central Estratégica */}
            <div>
              <button
                type="button"
                onClick={() => setIsEstrategicaModalOpen(true)}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-2xl py-3 px-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#ff9900] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={16} />
                </div>
                <span className="font-bold text-sm text-slate-900">
                  Central Estratégica
                </span>
                <ChevronRight size={16} className="ml-auto text-slate-400" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. CONTEÚDO DA ABA: "Conteúdo" (POSTS PARA APROVAÇÃO DO CLIENTE)     */}
      {/* ==================================================================== */}
      {activeTab === 'conteudo' && (
        <div className="space-y-5">
          {/* Cabeçalho da Aba com Explicação & Contador */}
          <div className="bg-white dark:bg-[#0c1424] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900] animate-pulse" />
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Fila de Aprovação de Conteúdos
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Materiais e peças preparadas pela agência aguardando a sua revisão e aprovação. Somente demandas posicionadas na coluna <strong className="text-[#ff9900] font-bold">Aprovação Cliente</strong> ficam visíveis aqui para garantir máxima privacidade e controle.
              </p>
            </div>
            {pendingApprovalDemands.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                  <Clock size={13} className="text-[#ff9900]" />
                  <span>{pendingApprovalDemands.length} post(s) pendente(s)</span>
                </span>
              </div>
            )}
          </div>

          {/* Barra de Filtros & Busca se houver demandas */}
          {pendingApprovalDemands.length > 0 && (
            <div className="bg-white dark:bg-[#0c1424] rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Campo de Busca */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={conteudoSearch}
                  onChange={(e) => setConteudoSearch(e.target.value)}
                  placeholder="Buscar material por título, legenda ou formato..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#ff9900]"
                />
                {conteudoSearch && (
                  <button
                    type="button"
                    onClick={() => setConteudoSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Pílulas de Filtro de Formato */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
                <span className="text-[11px] font-semibold text-slate-400 pl-1 shrink-0 flex items-center gap-1">
                  <Filter size={12} /> Formato:
                </span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'post', label: 'Feed' },
                  { id: 'carrossel', label: 'Carrossel' },
                  { id: 'stories', label: 'Stories' },
                  { id: 'reels', label: 'Reels/Vídeo' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConteudoTypeFilter(item.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      conteudoTypeFilter === item.id
                        ? 'bg-[#142142] dark:bg-white text-white dark:text-[#142142] shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Listagem de Posts Aguardando Aprovação */}
          {pendingApprovalDemands.length === 0 ? (
            <div className="bg-white dark:bg-[#0c1424] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center shadow-2xs">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Não há conteúdos pendentes na coluna <strong className="text-[#ff9900]">Aprovação Cliente</strong> no momento. Assim que a agência finalizar as criações e mover para aprovação, elas aparecerão aqui para você conferir.
                </p>
              </div>
            </div>
          ) : filteredConteudoDemands.length === 0 ? (
            <div className="bg-white dark:bg-[#0c1424] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-10 text-center space-y-3 shadow-2xs">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum material encontrado com os filtros atuais.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConteudoSearch('');
                  setConteudoTypeFilter('todos');
                }}
                className="text-xs font-bold text-[#ff9900] hover:underline cursor-pointer"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredConteudoDemands.map((post) => {
                const isCaptionExpanded = Boolean(expandedCaptionIds[post.id]);
                const hasLongCaption = (post.description || '').length > 130;

                return (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Visualizador do Post (Proporção amigável para Social Media) */}
                      <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                        {post.thumbnail ? (
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#ff9900] flex items-center justify-center">
                              <FileText size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Peça Publicitária</span>
                            <span className="text-[11px] text-slate-400">Clique para abrir detalhes</span>
                          </div>
                        )}

                        {/* Tag de Formato (canto superior esquerdo) */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                            {post.type || 'Post Feed'}
                          </span>
                        </div>

                        {/* Botão de Ver em Tela Cheia / Zoom (canto superior direito) */}
                        <button
                          type="button"
                          onClick={() => setPreviewPost(post)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white transition-all cursor-pointer shadow-xs"
                          title="Visualizar em tamanho grande"
                        >
                          <Maximize2 size={13} />
                        </button>

                        {/* Badge de Aprovação Pendente na base da imagem */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/90 text-[#142142] text-[10px] font-extrabold backdrop-blur-xs shadow-xs">
                            Aguardando Aprovação
                          </span>
                        </div>
                      </div>

                      {/* Informações Textuais & Metadados do Post */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span className="font-mono font-semibold">{post.id}</span>
                          {post.dueDate && (
                            <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300 font-medium">
                              <Calendar size={12} className="text-[#ff9900]" /> {post.dueDate}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {post.title}
                        </h3>

                        {post.description && (
                          <div className="space-y-1">
                            <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${!isCaptionExpanded && hasLongCaption ? 'line-clamp-3' : ''}`}>
                              {post.description}
                            </p>
                            {hasLongCaption && (
                              <button
                                type="button"
                                onClick={() => toggleCaption(post.id)}
                                className="text-[11px] font-bold text-[#ff9900] hover:underline cursor-pointer"
                              >
                                {isCaptionExpanded ? 'Ver menos' : 'Ver legenda completa...'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações de Aprovação do Cliente */}
                    <div className="p-5 pt-0 space-y-2">
                      {/* Botão Principal: Aprovar Post */}
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                      >
                        <ThumbsUp size={14} />
                        <span>Aprovar Post</span>
                      </button>

                      {/* Ações Secundárias: Ajustes, Reprovar e Ver Detalhes */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(post)}
                          className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Solicitar Ajustes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onClientApprovalAction(post.id, 'reprovado', 'Material reprovado pelo cliente')}
                          className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X size={13} />
                          <span>Reprovar</span>
                        </button>
                      </div>

                      {/* Botão de Análise Completa em Modal */}
                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        className="w-full py-1.5 text-center text-[11px] font-medium text-slate-500 hover:text-[#ff9900] transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Eye size={12} />
                        <span>Visualizar em alta resolução</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. CONTEÚDO DA ABA: "Métricas" (DESEMPENHO DA MARCA)                 */}
      {/* ==================================================================== */}
      {activeTab === 'metricas' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Painel de Desempenho & Métricas
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhamento de alcance, engajamento e resultados das campanhas ativas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Alcance Total (30d)</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">148.200</p>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp size={11} /> +18.4% vs mês anterior
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Engajamento Médio</span>
              <p className="text-2xl font-black text-[#ff9900] font-mono">4.82%</p>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp size={11} /> +0.6% taxa saudável
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Publicações Veiculadas</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">24 posts</p>
              <span className="text-[10px] text-slate-400">100% do cronograma cumprido</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Novos Seguidores</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">+1.430</p>
              <span className="text-[10px] text-slate-400">Público qualificado</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. CONTEÚDO DA ABA: "Financeiro" (FATURAS E MENSALIDADE)             */}
      {/* ==================================================================== */}
      {activeTab === 'financeiro' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Extrato Financeiro & Mensalidade
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe suas cobranças, pagamentos e dados para transferência bancária / PIX.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPix}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copiedPix ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedPix ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
                Valor do Serviço Contratado / Mensalidade
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                R$ {contractedServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500">
                Serviços inclusos: {(activeClient.services && activeClient.services.length > 0 ? activeClient.services.join(', ') : 'Nenhum serviço registrado')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Dados para Faturamento
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                Razão Social: HELP IDEIAS DIGITAIS LTDA<br />
                Chave PIX: financeiro@helpideiasdigitais.com.br<br />
                Banco: 260 - Nu Pagamentos S.A.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. CONTEÚDO DA ABA: "Arquivos" (MANUAL DE MARCA, LOGOS E DRIVE)     */}
      {/* ==================================================================== */}
      {activeTab === 'arquivos' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Arquivos & Ativos de Marca
            </h2>
            <p className="text-xs text-slate-500">
              Acesse logos oficiais, manuais de identidade visual e repositório de mídias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <Folder size={24} className="text-[#ff9900] mb-2" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Logotipos Oficiais</h3>
                <p className="text-[11px] text-slate-400">Versões PNG transparente, SVG vetorial e PDF</p>
              </div>
              <button
                type="button"
                onClick={() => setActionNotice('Download do kit de logotipos iniciado')}
                className="mt-3 py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100"
              >
                <Download size={13} /> Baixar Pacote
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <FileText size={24} className="text-blue-500 mb-2" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Manual de Marca</h3>
                <p className="text-[11px] text-slate-400">Guia de tipografia, paleta de cores e tom de voz</p>
              </div>
              <button
                type="button"
                onClick={() => setActionNotice('Visualizando Brand Guide')}
                className="mt-3 py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100"
              >
                <Eye size={13} /> Visualizar Guia
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <ExternalLink size={24} className="text-emerald-500 mb-2" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Repositório Cloud Drive</h3>
                <p className="text-[11px] text-slate-400">Fotos em alta resolução, vídeos e artes aprovadas</p>
              </div>
              <a
                href={activeClient.website || 'https://drive.google.com'}
                target="_blank"
                rel="noreferrer"
                className="mt-3 py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100 text-center"
              >
                <ExternalLink size={13} /> Abrir Pasta
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. MODAL: CENTRAL ESTRATÉGICA (Acionado pelo card preto aaaa.png)    */}
      {/* ==================================================================== */}
      {isEstrategicaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-hidden space-y-5">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#ff9900] text-white flex items-center justify-center shadow-xs">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Central Estratégica da Marca
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeClient.companyName || activeClient.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEstrategicaModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1">
                <span className="font-bold text-[#ff9900] uppercase tracking-wider text-[10px]">
                  Posicionamento Principal
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  Autoridade no segmento de {activeClient.segment || 'comunicação e serviços'}, com foco em geração de demanda, autoridade de marca e conexão genuína com a audiência.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Pilares Editoriais Ativos</span>
                <div className="grid grid-cols-2 gap-2">
                  <span className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    💡 Educação & Conteúdo de Valor
                  </span>
                  <span className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    🚀 Prova Social & Resultados
                  </span>
                  <span className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    🎯 Ofertas Diretas & Conversão
                  </span>
                  <span className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    🤝 Bastidores & Humanização
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Tom de Voz</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Profissional, direto, acolhedor e focado na resolução de problemas do cliente final.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEstrategicaModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all cursor-pointer shadow-xs"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL: SOLICITAR AJUSTES NO POST                                  */}
      {/* ==================================================================== */}
      {adjustingDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-hidden space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-[#ff9900] flex items-center justify-center font-bold">
                  <Edit3 size={15} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Solicitar Alteração no Material
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingDemand(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Post: <strong>{adjustingDemand.title}</strong>
            </p>

            <form onSubmit={handleSubmitAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descreva os ajustes necessários para a equipe:
                </label>
                <textarea
                  rows={4}
                  value={adjustFeedbackText}
                  onChange={(e) => setAdjustFeedbackText(e.target.value)}
                  placeholder="Ex: Trocar a foto do slide 2, ajustar o texto da legenda para mencionar a promoção de sexta-feira..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#ff9900]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustingDemand(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all shadow-xs cursor-pointer"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. MODAL: PREVIEW DETALHADO DO POST (LIGHTBOX & ANÁLISE COMPLETA)   */}
      {/* ==================================================================== */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0c1424] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Coluna da Esquerda: Arte / Criativo em Tamanho Grande */}
            <div className="md:w-3/5 bg-slate-950 flex flex-col items-center justify-center relative p-4 min-h-[320px] md:min-h-[500px]">
              {previewPost.thumbnail ? (
                <img
                  src={previewPost.thumbnail}
                  alt={previewPost.title}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3 p-8 text-center">
                  <FileText size={48} className="text-[#ff9900]" />
                  <p className="font-bold text-sm text-slate-200">Arquivo Criativo do Post</p>
                  <p className="text-xs text-slate-400 max-w-xs">Arte preparada para publicação nas redes sociais da marca.</p>
                </div>
              )}

              {/* Botão de Fechar no Mobile (Sobre a imagem) */}
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Tag de Formato na base da imagem */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-xs font-bold shadow-xs">
                  {previewPost.type || 'Post Feed'}
                </span>
                {previewPost.thumbnail && (
                  <a
                    href={previewPost.thumbnail}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Abrir imagem original em nova aba"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Coluna da Direita: Dados, Legenda e Ações Rápidas */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-[92vh] space-y-5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
              
              <div className="space-y-4">
                {/* Cabeçalho do modal */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#ff9900] uppercase tracking-wider">
                      {previewPost.id}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {previewPost.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPost(null)}
                    className="hidden md:flex p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Metadados: Data de publicação e Status */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-[#ff9900]" /> Agendamento:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {previewPost.dueDate || 'A definir'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-[#ff9900]" /> Status:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Aguardando Sua Aprovação
                    </span>
                  </div>
                </div>

                {/* Texto da Legenda / Copy */}
                {previewPost.description && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Texto da Legenda (Copy)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCaption(previewPost.description || '')}
                        className="text-[11px] font-semibold text-[#ff9900] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCaption ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedCaption ? 'Copiada!' : 'Copiar Texto'}</span>
                      </button>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto scrollbar-thin font-sans">
                      {previewPost.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação na Base da Coluna Direita */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(previewPost.id);
                    setPreviewPost(null);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <ThumbsUp size={15} />
                  <span>Aprovar Este Material</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewPost;
                      setPreviewPost(null);
                      handleOpenAdjustModal(p);
                    }}
                    className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Pedir Ajustes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClientApprovalAction(previewPost.id, 'reprovado', 'Material reprovado pelo cliente');
                      setPreviewPost(null);
                    }}
                    className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <X size={13} />
                    <span>Reprovar</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

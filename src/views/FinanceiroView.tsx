import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Download, 
  DollarSign, 
  ShieldCheck, 
  Copy, 
  Receipt, 
  Sparkles, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  CreditCard,
  KeyRound,
  Check,
  AlertTriangle,
  ArrowUpDown,
  Wallet,
  Percent,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Building2,
  LayoutGrid,
  Users,
  BarChart3,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  Handshake,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Client, Invoice } from '../types';

export const normalizeInvoice = (raw: any): Invoice => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `FAT-${Date.now()}`,
      client: 'Cliente',
      service: 'Serviço da Agência',
      value: 0,
      dueDate: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente',
      category: 'Recorrência Mensal',
      paymentMethod: 'PIX PJ Direto'
    };
  }

  const rawVal = raw.value !== undefined ? raw.value : raw.amount;
  const numVal = typeof rawVal === 'number' ? rawVal : (parseFloat(String(rawVal || 0).replace(/[^\d.-]/g, '')) || 0);

  const clientName = String(raw.client || raw.clientName || 'Cliente').trim();
  const serviceName = String(raw.service || raw.description || 'Serviço da Agência').trim();
  const categoryName = String(raw.category || 'Recorrência Mensal').trim();
  const method = String(raw.paymentMethod || 'PIX PJ Direto').trim();
  
  const rawStatus = String(raw.status || 'Pendente').trim().toLowerCase();
  const isPaid = rawStatus === 'pago' || rawStatus === 'paga' || rawStatus === 'paid';
  const status: 'Pago' | 'Pendente' = isPaid ? 'Pago' : 'Pendente';

  const clientInitials = raw.clientInitial || clientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('') || 'CL';

  let rawDate = String(raw.dueDate || raw.issueDate || '').trim();
  let formattedDate = rawDate;
  if (rawDate && rawDate.includes('-')) {
    const parts = rawDate.split('T')[0].split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return {
    id: String(raw.id || raw.code || `FAT-${Date.now()}`),
    client: clientName,
    clientInitial: clientInitials,
    service: serviceName,
    value: numVal,
    dueDate: formattedDate || new Date().toLocaleDateString('pt-BR'),
    status,
    category: categoryName,
    paymentMethod: method,
  };
};

interface FinanceiroViewProps {
  clients?: Client[];
  invoices?: Invoice[];
  onAddInvoice?: (newInvoice: Invoice) => void;
  onToggleStatus?: (id: string) => void;
  onDeleteInvoice?: (id: string) => void;
  onDeleteMultipleInvoices?: (ids: string[]) => void;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  cost: number;
  renewal: string;
  status: 'Ativo' | 'Em aberto' | 'Pausado';
}

type FinanceTopTab = 'visao_geral' | 'lancamentos' | 'fornecedores' | 'equipe' | 'dre' | 'fluxo_caixa';

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({ 
  clients = [], 
  invoices: externalInvoices,
  onAddInvoice,
  onToggleStatus: externalToggleStatus,
  onDeleteInvoice: externalDeleteInvoice,
  onDeleteMultipleInvoices,
}) => {
  const safeClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    return clients.filter((c): c is Client => Boolean(c && typeof c === 'object' && c.name));
  }, [clients]);

  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([]);
  
  const invoices = useMemo(() => {
    const list = externalInvoices !== undefined ? externalInvoices : localInvoices;
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map(normalizeInvoice);
  }, [externalInvoices, localInvoices]);

  // Fornecedores / Ferramentas SaaS (inicia limpo para lançamento oficial)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('agency_suppliers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState('Hospedagem & Cloud');
  const [newSupplierCost, setNewSupplierCost] = useState('');
  const [newSupplierRenewal, setNewSupplierRenewal] = useState('Dia 10 todo mês');

  const totalSuppliersCost = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.cost || 0), 0);
  }, [suppliers]);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !newSupplierCost) {
      showToast('Preencha o nome e o custo do fornecedor.');
      return;
    }
    const costNum = parseFloat(newSupplierCost.replace(/\./g, '').replace(',', '.'));
    if (isNaN(costNum) || costNum <= 0) {
      showToast('Insira um valor numérico válido.');
      return;
    }
    const created: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupplierName.trim(),
      category: newSupplierCategory,
      cost: costNum,
      renewal: newSupplierRenewal.trim() || 'Mensal',
      status: 'Ativo'
    };
    const updated = [created, ...suppliers];
    setSuppliers(updated);
    try {
      localStorage.setItem('agency_suppliers', JSON.stringify(updated));
    } catch {}
    setIsSupplierModalOpen(false);
    setNewSupplierName('');
    setNewSupplierCost('');
    showToast(`Fornecedor "${created.name}" cadastrado com sucesso!`);
  };

  const handleDeleteSupplier = (id: string) => {
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated);
    try {
      localStorage.setItem('agency_suppliers', JSON.stringify(updated));
    } catch {}
    showToast('Fornecedor removido com sucesso.');
  };

  // Navegação Superior por Abas (Visão geral, Lançamentos, Fornecedores, etc.)
  const [currentTab, setCurrentTab] = useState<FinanceTopTab>('visao_geral');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Toggle de atrasados no card da direita (Receber / Pagar)
  const [overdueType, setOverdueType] = useState<'receber' | 'pagar'>('receber');

  // Filtros & Controles de Ledger (Aba Lançamentos)
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'value_desc' | 'value_asc' | 'client_asc'>('date_desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Modal Novo Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'receita' | 'despesa'>('receita');
  const [newClient, setNewClient] = useState('');
  const [newService, setNewService] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState('Recorrência Mensal');
  const [newPaymentMethod, setNewPaymentMethod] = useState('PIX PJ Direto');
  const [newStatus, setNewStatus] = useState<'Pendente' | 'Pago'>('Pendente');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Verificador se fatura está atrasada em relação à data atual
  const isInvoiceOverdue = (inv: Invoice): boolean => {
    if (inv.status === 'Pago') return false;
    if (!inv.dueDate) return false;
    const parts = inv.dueDate.split('/');
    if (parts.length === 3) {
      const due = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    }
    return false;
  };

  // Cálculos do Motor Financeiro
  const totalInvoiced = useMemo(() => {
    return invoices.reduce((acc, i) => acc + (i.value || 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices
      .filter(i => i.status === 'Pago')
      .reduce((acc, i) => acc + (i.value || 0), 0);
  }, [invoices]);

  const totalPending = useMemo(() => {
    return invoices
      .filter(i => i.status === 'Pendente')
      .reduce((acc, i) => acc + (i.value || 0), 0);
  }, [invoices]);

  const totalOverdue = useMemo(() => {
    return invoices
      .filter(i => isInvoiceOverdue(i))
      .reduce((acc, i) => acc + (i.value || 0), 0);
  }, [invoices]);

  const overdueCount = useMemo(() => {
    return invoices.filter(i => isInvoiceOverdue(i)).length;
  }, [invoices]);

  // Cálculos do Motor Financeiro Estritamente Reais
  const faturamentoDisplay = totalInvoiced > 0 
    ? (totalInvoiced >= 1000 ? `R$ ${(totalInvoiced / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : `R$ ${totalInvoiced.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    : 'R$ 0,00';

  const despesasDisplay = totalSuppliersCost > 0
    ? (totalSuppliersCost >= 1000 ? `R$ ${(totalSuppliersCost / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : `R$ ${totalSuppliersCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    : 'R$ 0,00';

  const saldoLiquido = totalInvoiced - totalSuppliersCost;
  const saldoDisplay = totalInvoiced > 0 || totalSuppliersCost > 0
    ? `R$ ${saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'R$ 0,00';

  const atrasadosDisplay = String(overdueCount);

  const recebidoDisplay = totalPaid > 0 
    ? `R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
    : 'R$ 0,00';

  const aReceberDisplay = totalPending > 0
    ? (totalPending >= 1000 ? `R$ ${(totalPending / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil` : `R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    : 'R$ 0,00';

  // Lista dinâmica de faturas atrasadas a receber
  const overdueReceivables = useMemo(() => {
    return invoices
      .filter(i => isInvoiceOverdue(i))
      .map(i => {
        let delayStr = 'Em atraso';
        if (i.dueDate && i.dueDate.includes('/')) {
          const parts = i.dueDate.split('/');
          if (parts.length === 3) {
            const due = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            const diffDays = Math.max(1, Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)));
            delayStr = `${diffDays}d em atraso`;
          }
        }
        return {
          id: i.id,
          title: i.service || 'Serviço',
          client: i.client || 'Cliente',
          delay: delayStr,
          value: i.value || 0
        };
      });
  }, [invoices]);

  // Lista dinâmica de despesas a pagar atrasadas
  const overduePayables = useMemo(() => {
    return [];
  }, []);

  // Categorias disponíveis
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [invoices]);

  // Faturas Filtradas e Ordenadas (Aba Lançamentos)
  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv => {
      if (activeTab === 'paid' && inv.status !== 'Pago') return false;
      if (activeTab === 'pending' && inv.status !== 'Pendente') return false;
      if (activeTab === 'overdue' && !isInvoiceOverdue(inv)) return false;

      if (selectedCategory !== 'all' && inv.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (inv.client || '').toLowerCase().includes(q) ||
          (inv.id || '').toLowerCase().includes(q) ||
          (inv.service || '').toLowerCase().includes(q) ||
          (inv.category || '').toLowerCase().includes(q) ||
          (inv.paymentMethod || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'value_desc') return (b.value || 0) - (a.value || 0);
      if (sortBy === 'value_asc') return (a.value || 0) - (b.value || 0);
      if (sortBy === 'client_asc') return (a.client || '').localeCompare(b.client || '');
      
      const parseDate = (d?: string) => {
        if (!d) return 0;
        const p = d.split('/');
        if (p.length === 3) return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
        return 0;
      };
      const dateA = parseDate(a.dueDate);
      const dateB = parseDate(b.dueDate);
      if (sortBy === 'date_asc') return dateA - dateB;
      return dateB - dateA;
    });

    return result;
  }, [invoices, activeTab, selectedCategory, searchQuery, sortBy]);

  const handleCopyPix = (id: string) => {
    setCopiedId(id);
    navigator.clipboard?.writeText?.('financeiro@helpideiasdigitais.com.br');
    showToast('Chave PIX copiada com sucesso!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = (id: string) => {
    if (externalToggleStatus) {
      externalToggleStatus(id);
    } else {
      setLocalInvoices(prev => prev.map(inv => {
        if (inv.id === id) {
          return {
            ...inv,
            status: inv.status === 'Pago' ? 'Pendente' : 'Pago'
          };
        }
        return inv;
      }));
    }
  };

  const handleDelete = (id: string) => {
    if (externalDeleteInvoice) {
      externalDeleteInvoice(id);
    } else {
      setLocalInvoices(prev => prev.filter(inv => inv.id !== id));
    }
    showToast('Lançamento excluído com sucesso.');
  };

  const handleToggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map(i => i.id));
    }
  };

  const handleBulkMarkAsPaid = () => {
    if (selectedInvoiceIds.length === 0) return;
    selectedInvoiceIds.forEach(id => {
      const inv = invoices.find(i => i.id === id);
      if (inv && inv.status === 'Pendente') {
        handleToggleStatus(id);
      }
    });
    showToast(`${selectedInvoiceIds.length} fatura(s) atualizadas como Pagas!`);
    setSelectedInvoiceIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedInvoiceIds.length === 0) return;
    if (onDeleteMultipleInvoices) {
      onDeleteMultipleInvoices(selectedInvoiceIds);
      setSelectedInvoiceIds([]);
    } else {
      setLocalInvoices(prev => prev.filter(inv => !selectedInvoiceIds.includes(inv.id)));
      showToast(`${selectedInvoiceIds.length} faturas excluídas.`);
      setSelectedInvoiceIds([]);
    }
  };

  const handleSelectClientInModal = (clientName: string) => {
    setNewClient(clientName);
    const found = safeClients.find(c => c.name === clientName);
    if (found) {
      if (found.monthlyFee && found.monthlyFee > 0 && !newValue) {
        setNewValue(String(found.monthlyFee));
      }
      if (found.segment && !newService) {
        setNewService(`Gestão Mensal (${found.segment})`);
      }
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || !newService.trim() || !newValue) {
      showToast('Por favor, informe a descrição/cliente, o serviço e o valor.');
      return;
    }

    const numValue = parseFloat(newValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numValue) || numValue <= 0) {
      showToast('Por favor, insira um valor numérico válido.');
      return;
    }

    const clientInitials = newClient
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('') || 'CL';

    let formattedDate = newDueDate;
    if (newDueDate && newDueDate.includes('-')) {
      const [year, month, day] = newDueDate.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const created: Invoice = {
      id: `FAT-${Math.floor(1000 + Math.random() * 9000)}`,
      client: newClient.trim(),
      clientInitial: clientInitials,
      service: newService.trim(),
      value: numValue,
      dueDate: formattedDate || new Date().toLocaleDateString('pt-BR'),
      status: newStatus,
      category: newCategory,
      paymentMethod: newPaymentMethod,
    };

    if (onAddInvoice) {
      onAddInvoice(created);
    } else {
      setLocalInvoices(prev => [created, ...prev]);
    }

    showToast(`Novo lançamento "${created.service}" cadastrado com sucesso!`);
    setIsModalOpen(false);
    setNewClient('');
    setNewService('');
    setNewValue('');
    setNewDueDate('');
    setNewStatus('Pendente');
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      showToast('Nenhum dado financeiro para exportar.');
      return;
    }

    const headers = ['Código', 'Cliente/Descrição', 'Serviço', 'Categoria', 'Forma Pagamento', 'Vencimento', 'Valor (R$)', 'Status'];
    const rows = filteredInvoices.map(i => [
      i.id,
      `"${(i.client || '').replace(/"/g, '""')}"`,
      `"${(i.service || '').replace(/"/g, '""')}"`,
      `"${(i.category || 'Recorrência').replace(/"/g, '""')}"`,
      `"${(i.paymentMethod || 'PIX PJ Direto').replace(/"/g, '""')}"`,
      i.dueDate || '',
      (i.value || 0).toFixed(2),
      i.status || 'Pendente'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financeiro_help_ideias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório exportado em CSV com sucesso.');
  };

  // Dados dinâmicos dos últimos 6 meses para o gráfico (Faturamento x Despesas)
  const chartMonths = useMemo(() => {
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const monthLabel = monthsNames[mIdx];

      const monthInvoices = invoices.filter(inv => {
        if (!inv.dueDate) return false;
        const parts = inv.dueDate.split('/');
        if (parts.length === 3) {
          const invM = parseInt(parts[1], 10) - 1;
          const invY = parseInt(parts[2], 10);
          return invM === mIdx && invY === d.getFullYear();
        }
        return false;
      });

      const entradasSum = monthInvoices.reduce((acc, inv) => acc + (inv.value || 0), 0);
      const saidasSum = totalSuppliersCost > 0 && i === 0 ? totalSuppliersCost : 0;

      result.push({
        label: monthLabel,
        entradas: entradasSum,
        saidas: saidasSum,
        entradasVal: `R$ ${entradasSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        saidasVal: `R$ ${saidasSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      });
    }
    return result;
  }, [invoices, totalSuppliersCost]);

  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...chartMonths.map(m => Math.max(m.entradas, m.saidas)), 0);
    return maxVal > 0 ? maxVal : 1000;
  }, [chartMonths]);

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#142142] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/80 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-[#fab518]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. TOP SEGMENTED NAVIGATION TAB BAR & ACTION BUTTON                  */}
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
            onClick={() => setCurrentTab('lancamentos')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'lancamentos'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Receipt size={15} className={currentTab === 'lancamentos' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Lançamentos</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('fornecedores')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'fornecedores'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Handshake size={15} className={currentTab === 'fornecedores' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Fornecedores</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('equipe')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'equipe'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users size={15} className={currentTab === 'equipe' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Equipe</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('dre')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'dre'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 size={15} className={currentTab === 'dre' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>DRE</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('fluxo_caixa')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === 'fluxo_caixa'
                ? 'bg-[#ff9900] text-[#142142] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp size={15} className={currentTab === 'fluxo_caixa' ? 'text-[#142142]' : 'text-slate-500'} />
            <span>Fluxo de caixa</span>
          </button>

          {/* More menu dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Mais opções financeiras"
            >
              <MoreVertical size={16} />
            </button>

            {isMoreMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#0c1424] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-in fade-in zoom-in-95"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download size={14} className="text-[#ff9900]" />
                  <span>Exportar Planilha (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPix('menu')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Copy size={14} className="text-emerald-500" />
                  <span>Copiar Chave PIX</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: + Novo Lançamento */}
        <button
          type="button"
          onClick={() => {
            setModalType('receita');
            setIsModalOpen(true);
          }}
          className="px-6 py-2.5 rounded-full bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md shrink-0"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Novo lançamento</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP METRIC PILLS ROW (Faturamento, Despesas, Saldo, Atrasados)    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Faturamento do mês (Orange Solid Capsule) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1">
            Faturamento do mês
          </p>
          <div className="w-full bg-[#ff9900] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs">
            <span className="font-black text-slate-950 text-sm tracking-tight">
              {faturamentoDisplay}
            </span>
            <span className="text-[11px] font-bold text-slate-900/80 flex items-center gap-0.5">
              <span>•</span> {totalInvoiced > 0 ? 'Ativo' : '0%'}
            </span>
          </div>
        </div>

        {/* KPI 2: Despesas do mês (Dark/Black Solid Capsule) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1">
            Despesas do mês
          </p>
          <div className="w-full bg-[#12151e] rounded-full py-2.5 px-5 flex items-center justify-between shadow-2xs border border-slate-800/60">
            <span className="font-black text-white text-sm tracking-tight">
              {despesasDisplay}
            </span>
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5">
              <span>•</span> 0%
            </span>
          </div>
        </div>

        {/* KPI 3: Saldo do mês (Light Grey Capsule) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1">
            Saldo do mês
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-full py-2.5 px-5 flex items-center justify-start shadow-2xs">
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
              {saldoDisplay}
            </span>
          </div>
        </div>

        {/* KPI 4: Atrasados (Diagonal Stripe Hatched Texture Capsule) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1">
            Atrasados
          </p>
          <div 
            className="w-full rounded-full py-2.5 px-5 flex items-center justify-center shadow-2xs border border-rose-300 dark:border-rose-900/50 relative overflow-hidden"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 8px, #edf2f7 8px, #edf2f7 16px)'
            }}
          >
            <span className="font-black text-rose-500 text-sm tracking-tight relative z-10">
              {atrasadosDisplay}
            </span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. ABA ATIVA: "Visão geral" (DESIGN IDÊNTICO À IMAGEM ANEXADA)       */}
      {/* ==================================================================== */}
      {currentTab === 'visao_geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ---------------------------------------------------------------- */}
          {/* COLUNA ESQUERDA: Faturamento x Despesas Card (7 cols)            */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0c1424] rounded-[28px] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#ff9900] flex items-center justify-center border border-amber-200/60 dark:border-amber-900/40 shadow-xs">
                <Wallet size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Faturamento x Despesas
              </h2>
            </div>

            {/* Chart Area: Bar & Line Graphic */}
            <div className="relative pt-4 pb-2">
              {/* Horizontal dotted grid lines and Y-axis scale */}
              <div className="space-y-7 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right">160k</span>
                  <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right">120k</span>
                  <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right">80k</span>
                  <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right">40k</span>
                  <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 text-right">0</span>
                  <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
                </div>
              </div>

              {/* Bars & Overlay Container (positioned on top of grid lines) */}
              <div className="absolute inset-0 left-10 right-2 bottom-6 top-6 flex items-end justify-between px-3 sm:px-6">
                
                {/* SVG Line for Saídas (Dashed grey line across points - only when real expenses exist) */}
                {chartMonths.some(m => m.saidas > 0) && (
                  <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible px-4 sm:px-6">
                    <path
                      d="M 24 88 L 138 90 L 252 91 L 366 80 L 480 85 L 576 86"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                    <circle cx="24" cy="88" r="3" fill="#64748b" />
                    <circle cx="138" cy="90" r="3" fill="#64748b" />
                    <circle cx="252" cy="91" r="3" fill="#64748b" />
                    <circle cx="366" cy="80" r="3" fill="#64748b" />
                    <circle cx="480" cy="85" r="3" fill="#64748b" />
                    <circle cx="576" cy="86" r="3" fill="#64748b" />
                  </svg>
                )}

                {/* Bars for Entradas */}
                {chartMonths.map((m, idx) => {
                  const heightPercent = maxChartValue > 0 ? Math.min(100, Math.round((m.entradas / maxChartValue) * 100)) : 0;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 group relative z-10">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        <span className="text-[#ff9900] font-bold">Entradas: {m.entradasVal}</span><br />
                        <span className="text-slate-300">Saídas: {m.saidasVal}</span>
                      </div>

                      {/* Bar Column */}
                      <div 
                        className="w-3.5 sm:w-4 bg-[#ff9900] hover:bg-[#e68a00] rounded-full transition-all cursor-pointer shadow-xs min-h-[4px]"
                        style={{ height: `${Math.max(4, heightPercent * 1.2)}px` }}
                      />
                      {/* Month Label */}
                      <span className="text-xs text-slate-500 font-medium">
                        {m.label}
                      </span>
                    </div>
                  );
                })}

              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-end gap-5 pt-7 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900]" />
                  <span>Entradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                  <span>Saídas</span>
                </div>
              </div>

            </div>

            {/* Bottom Metric Strip (Divided by subtle dotted border) */}
            <div className="pt-5 border-t border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Recebido no mês</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight pt-0.5">
                  {recebidoDisplay}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">A receber no mês</p>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight pt-0.5">
                  {aReceberDisplay}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pago no mês</p>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight pt-0.5">
                  R$ 0,00
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">A pagar no mês</p>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight pt-0.5">
                  R$ {totalSuppliersCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* COLUNA DIREITA: Pagamentos Atrasados Dark Card (5 cols)           */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-5 bg-[#10141e] text-white rounded-[28px] p-6 sm:p-7 shadow-xl border border-slate-800/80 flex flex-col justify-between space-y-6">
            
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Pagamentos atrasados
                </h2>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOverdueType('receber')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    overdueType === 'receber'
                      ? 'bg-[#331114] text-[#f87171] border border-rose-900/50 shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  Receber R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </button>

                <button
                  type="button"
                  onClick={() => setOverdueType('pagar')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    overdueType === 'pagar'
                      ? 'bg-[#331114] text-[#f87171] border border-rose-900/50 shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  Pagar R$ 0,00
                </button>
              </div>

              {/* Overdue Items List */}
              <div className="space-y-3.5 pt-1">
                {(overdueType === 'receber' ? overdueReceivables : overduePayables).length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 mb-1">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-bold text-white">Nenhum pagamento em atraso</p>
                    <p className="text-[11px] text-slate-400">Todos os pagamentos e recebimentos estão em dia.</p>
                  </div>
                ) : (
                  (overdueType === 'receber' ? overdueReceivables : overduePayables).map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setCurrentTab('lancamentos')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                          {overdueType === 'receber' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.client} · <span className="text-rose-400">{item.delay}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black ${overdueType === 'receber' ? 'text-[#10b981]' : 'text-rose-400'}`}>
                          {overdueType === 'receber' ? '+' : '-'} R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Link Button: Ver todos os lançamentos */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentTab('lancamentos')}
                className="w-full py-2.5 px-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Ver todos os lançamentos</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ABA: "Lançamentos" (LIVRO CAIXA COMPLETO, FILTROS E TABELA)       */}
      {/* ==================================================================== */}
      {currentTab === 'lancamentos' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden space-y-4">
          
          {/* Controls Toolbar: Search, Status Tabs, Category Filter, and Sorting */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Status Tabs (Segmented Buttons) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-[#0c1424] text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({invoices.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paid')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'paid'
                    ? 'bg-white dark:bg-[#0c1424] text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Pagos ({invoices.filter(i => i.status === 'Pago').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-[#0c1424] text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock size={13} className="text-amber-500" />
                <span>Abertos ({invoices.filter(i => i.status === 'Pendente').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'overdue'
                    ? 'bg-white dark:bg-[#0c1424] text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle size={13} className="text-rose-500" />
                <span>Atrasados ({overdueCount})</span>
              </button>
            </div>

            {/* Search Bar & Categorization Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, ID ou serviço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#ff9900]"
                />
              </div>

              {availableCategories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="all">Todas Categorias</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="date_desc">Mais Recentes</option>
                <option value="date_asc">Mais Antigas</option>
                <option value="value_desc">Maior Valor</option>
                <option value="value_asc">Menor Valor</option>
                <option value="client_asc">Cliente (A-Z)</option>
              </select>
            </div>

          </div>

          {/* Bulk Actions Banner (When items are selected) */}
          {selectedInvoiceIds.length > 0 && (
            <div className="mx-4 sm:mx-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {selectedInvoiceIds.length} fatura(s) selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkMarkAsPaid}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Marcar como Pagas
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Excluir Selecionadas
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAllInvoices}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                        <CheckSquare size={16} className="text-[#ff9900]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente / Sacado</th>
                  <th className="py-3 px-4">Serviço & Categoria</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Receipt size={28} className="mx-auto text-slate-400 mb-2 opacity-50" />
                      <p className="font-semibold">Nenhum lançamento encontrado.</p>
                      <p className="text-[11px] text-slate-400">Clique em "+ Novo lançamento" para cadastrar.</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const overdue = isInvoiceOverdue(inv);
                    const isSelected = selectedInvoiceIds.includes(inv.id);
                    return (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectInvoice(inv.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#ff9900]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {inv.id}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                              {inv.clientInitial || 'CL'}
                            </span>
                            <span className="truncate max-w-[180px]">{inv.client}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{inv.service}</div>
                          <div className="text-[10px] text-slate-400">{inv.category || 'Recorrência'}</div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-800 dark:text-slate-200">{inv.dueDate}</div>
                          {overdue && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle size={10} /> Vencida
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          R$ {(inv.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(inv.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              inv.status === 'Pago'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : overdue
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}
                            title="Clique para alternar status entre Pago e Pendente"
                          >
                            {inv.status === 'Pago' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{inv.status}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyPix(inv.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Copiar Chave PIX"
                            >
                              {copiedId === inv.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(inv.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Excluir fatura"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ABA: "Fornecedores" (GESTÃO DE DESPESAS COM FERRAMENTAS E VENDORS)*/}
      {/* ==================================================================== */}
      {currentTab === 'fornecedores' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fornecedores & Ferramentas SaaS da Agência
              </h2>
              <p className="text-xs text-slate-500">
                Custos fixos de infraestrutura, softwares criativos e fornecedores parceiros.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 rounded-full bg-[#ff9900] text-[#142142] font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto hover:bg-[#e68a00] transition-colors"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Adicionar Fornecedor</span>
            </button>
          </div>

          {suppliers.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-3">
                <Handshake size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhum fornecedor cadastrado
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                O módulo financeiro está limpo e zerado para o lançamento oficial. Cadastre seus fornecedores, softwares e plataformas SaaS.
              </p>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ff9900] text-[#142142] font-black text-xs hover:bg-[#e68a00] cursor-pointer transition-colors"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Cadastrar primeiro fornecedor</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map((vendor) => (
                <div key={vendor.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{vendor.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                        {vendor.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(vendor.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-opacity"
                        title="Excluir fornecedor"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{vendor.category}</p>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">{vendor.renewal}</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      R$ {vendor.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. ABA: "Equipe" (FOLHA DE PAGAMENTO E COMISSIONAMENTO)              */}
      {/* ==================================================================== */}
      {currentTab === 'equipe' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Folha de Remuneração da Equipe
              </h2>
              <p className="text-xs text-slate-500">
                Compensação mensal fixa e comissões por entrega de projetos.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Folha:</span>
              <p className="text-sm font-black text-[#ff9900]">R$ 0,00 / mês</p>
            </div>
          </div>

          <div className="py-14 text-center text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-3">
              <Users size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma folha de remuneração cadastrada
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              O sistema financeiro está limpo e zerado para o lançamento. As remunerações da equipe aparecerão aqui quando forem contratadas.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. ABA: "DRE" (DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO)               */}
      {/* ==================================================================== */}
      {currentTab === 'dre' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Demonstrativo do Resultado do Exercício (DRE Sintético)
            </h2>
            <p className="text-xs text-slate-500">
              Análise de receitas, custos diretos de entrega e margem de contribuição líquida.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
              <span>(+) RECEITA BRUTA TOTAL</span>
              <span className="text-emerald-600">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>(-) Impostos sobre Faturamento (Simples Nacional ~6%)</span>
              <span className="text-rose-500">
                - R$ {(totalPaid * 0.06).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pt-1">
              <span>(=) RECEITA LÍQUIDA</span>
              <span>
                R$ {(totalPaid * 0.94).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>(-) Custos Operacionais & Ferramentas Diretas</span>
              <span className="text-rose-500">
                - R$ {totalSuppliersCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>(-) Folha de Pagamento & Colaboradores</span>
              <span className="text-rose-500">- R$ 0,00</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700 font-black text-sm text-[#142142] dark:text-[#ff9900]">
              <span>(=) LUCRO LÍQUIDO DO PERÍODO</span>
              <span className="text-emerald-500">
                R$ {Math.max(0, (totalPaid * 0.94) - totalSuppliersCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {totalPaid > 0 ? `(${(((Math.max(0, (totalPaid * 0.94) - totalSuppliersCost)) / totalPaid) * 100).toFixed(1)}% Margem)` : '(0,0% Margem)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. ABA: "Fluxo de caixa" (PROJEÇÃO DE ENTRADAS E SAÍDAS)             */}
      {/* ==================================================================== */}
      {currentTab === 'fluxo_caixa' && (
        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Projeção e Execução de Fluxo de Caixa
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhamento cronológico de liquidez financeira para os próximos 60 dias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Entradas Previstas (Próx. 30d)</span>
              <p className="text-xl font-black text-emerald-600 font-mono">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-1">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Saídas Previstas (Próx. 30d)</span>
              <p className="text-xl font-black text-rose-600 font-mono">
                R$ {totalSuppliersCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Superávit Projetado</span>
              <p className="text-xl font-black text-[#ff9900] font-mono">
                {totalPending >= totalSuppliersCost ? '+' : '-'} R$ {Math.abs(totalPending - totalSuppliersCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: CADASTRAR NOVO LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-hidden">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#ff9900] text-[#142142] flex items-center justify-center font-bold shadow-xs">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Novo Lançamento Financeiro
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cadastre uma receita de cliente ou despesa de fornecedor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4">
              
              {/* Tipo de Lançamento (Receita / Despesa) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalType('receita')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    modalType === 'receita'
                      ? 'bg-white dark:bg-[#0c1424] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Receita (Cliente)
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('despesa')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    modalType === 'despesa'
                      ? 'bg-white dark:bg-[#0c1424] text-rose-600 dark:text-rose-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Despesa (Fornecedor)
                </button>
              </div>

              {/* Cliente / Fornecedor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {modalType === 'receita' ? 'Cliente / Empresa' : 'Fornecedor / Beneficiário'} *
                </label>
                {modalType === 'receita' && safeClients.length > 0 ? (
                  <select
                    value={newClient}
                    onChange={(e) => handleSelectClientInModal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white cursor-pointer"
                    required
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {safeClients.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.monthlyFee ? `(Mensalidade: R$ ${c.monthlyFee.toLocaleString('pt-BR')})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={modalType === 'receita' ? 'Ex: Loja Aurora, TechFlow...' : 'Ex: AWS Cloud, Adobe, Studio Frame...'}
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                )}
              </div>

              {/* Descrição do Serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Serviço / Fatura *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gestão de Mídias Sociais - Mensalidade Outubro"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Valor e Data de Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5000,00"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Categoria e Status Inicial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Recorrência Mensal">Recorrência Mensal</option>
                    <option value="Serviço Pontual">Serviço Pontual</option>
                    <option value="Branding & Identidade">Branding & Identidade</option>
                    <option value="Tráfego Pago">Tráfego Pago</option>
                    <option value="Infraestrutura & Ferramentas">Infraestrutura & Ferramentas</option>
                    <option value="Produção Audiovisual">Produção Audiovisual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Pendente">Pendente (Aberto)</option>
                    <option value="Pago">Pago (Liquidado)</option>
                  </select>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all shadow-xs cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 10. MODAL: ADICIONAR NOVO FORNECEDOR */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0c1424] rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#ff9900] text-[#142142] flex items-center justify-center font-bold shadow-xs">
                  <Handshake size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Novo Fornecedor / Ferramenta
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cadastre um software SaaS ou fornecedor parceiro
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Fornecedor / Software *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Google Workspace, AWS Cloud, Adobe CC..."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={newSupplierCategory}
                  onChange={(e) => setNewSupplierCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="Hospedagem & Cloud">Hospedagem & Cloud</option>
                  <option value="Design & Criação">Design & Criação</option>
                  <option value="Produtividade & IA">Produtividade & IA</option>
                  <option value="Produção Audiovisual">Produção Audiovisual</option>
                  <option value="Assessoria Fiscal">Assessoria Fiscal</option>
                  <option value="Tráfego & Anúncios">Tráfego & Anúncios</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custo Mensal (R$) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1950,00"
                    value={newSupplierCost}
                    onChange={(e) => setNewSupplierCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Renovação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Todo dia 10"
                    value={newSupplierRenewal}
                    onChange={(e) => setNewSupplierRenewal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#ff9900] hover:bg-[#e68a00] text-[#142142] font-black text-xs transition-all shadow-xs cursor-pointer"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

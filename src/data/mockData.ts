import {
  DemandItem,
  Client,
  ClientActivity,
  Service,
  TeamMember,
  BudgetProposal,
  Invoice,
  UserProfile,
  KanbanColumn
} from '../types';

export const currentUser: UserProfile = {
  id: 'usr-1',
  name: 'Marcos Lancerotti',
  email: 'lancerottirmarcos@gmail.com',
  username: 'lancerotti',
  role: 'proprietario',
  roleLabel: 'Proprietário da Agência',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  isMaster: true,
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

export const kanbanColumnsData: KanbanColumn[] = [
  { id: 'ideias', title: 'Ideias & Briefing', count: 0, color: 'text-amber-500', buttonBg: 'bg-amber-50 dark:bg-amber-950/40' },
  { id: 'producao', title: 'Em Produção', count: 0, color: 'text-blue-500', buttonBg: 'bg-blue-50 dark:bg-blue-950/40' },
  { id: 'aprovacao', title: 'Aprovação cliente', count: 0, color: 'text-amber-600', buttonBg: 'bg-amber-50 dark:bg-amber-950/40' },
  { id: 'agendamento', title: 'Agendamento', count: 0, color: 'text-purple-500', buttonBg: 'bg-purple-50 dark:bg-purple-950/40' },
  { id: 'concluidas', title: 'Concluídas', count: 0, color: 'text-emerald-500', buttonBg: 'bg-emerald-50 dark:bg-emerald-950/40' },
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'mem-1',
    name: 'Marcos Lancerotti',
    role: 'CEO & Diretor Criativo',
    functionRole: 'CEO',
    email: 'lancerottirmarcos@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    activeTasks: 0,
    status: 'Disponível',
    specialties: ['Direção Executiva', 'Liderança', 'Visão Estratégica'],
    username: 'lancerotti',
    password: '521Spide#*',
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
  },
];

export const initialClients: Client[] = [];

export const initialDemands: DemandItem[] = [];

export const initialRecentActivities: ClientActivity[] = [];

export const initialServices: Service[] = [
  {
    id: 'srv-1',
    title: 'Gestão Completa de Redes Sociais',
    category: 'Social Media',
    description: 'Planejamento estratégico, redação de copy persuasivo, criação de artes/vídeos semanais e relatórios de métricas.',
    basePrice: 2000,
    isMonthly: true,
    deliverables: ['12 posts no feed', '24 stories mensais', 'Relatório mensal', 'Gestão de comunidade'],
    activeClientsCount: 0,
  },
  {
    id: 'srv-2',
    title: 'Gestão de Tráfego Pago de Alta Conversão',
    category: 'Tráfego Pago',
    description: 'Criação, teste A/B, otimização de campanhas no Meta Ads e Google Ads com foco em geração de leads e vendas diretas.',
    basePrice: 1800,
    isMonthly: true,
    deliverables: ['Configuração de Pixel e API de Conversões', 'Otimização diária de lances', 'Dashboard em tempo real'],
    activeClientsCount: 0,
  },
  {
    id: 'srv-3',
    title: 'Desenvolvimento de Sites & Landing Pages',
    category: 'Criação de Sites',
    description: 'Páginas modernas, ultra-rápidas, responsivas para celulares e otimizadas para SEO e conversão.',
    basePrice: 3500,
    isMonthly: false,
    deliverables: ['Design exclusivo', 'Integração WhatsApp/CRM', 'Hospedagem inclusa', 'Painel administrativo'],
    activeClientsCount: 0,
  },
  {
    id: 'srv-4',
    title: 'Consultoria Estratégica & Branding',
    category: 'Consultoria',
    description: 'Diagnóstico profundo de posicionamento de marca, jornada do cliente e funil de vendas digital.',
    basePrice: 2500,
    isMonthly: false,
    deliverables: ['Diagnóstico completo', 'Manual de marca', 'Mapa de personas'],
    activeClientsCount: 0,
  },
];

export const initialProposals: BudgetProposal[] = [];

export const initialInvoices: Invoice[] = [];

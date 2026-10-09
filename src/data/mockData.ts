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

export const initialClients: Client[] = [
  {
    id: 'cli-portal-pub',
    name: 'Portal Publicitário',
    companyName: 'Portal Publicitário',
    segment: 'Comunicação & Mídia',
    contactName: 'Equipe de Conteúdo',
    contactRole: 'Gerente de Contas',
    email: 'contato@portalpublicitario.com.br',
    phone: '(21) 98765-4321',
    avatar: '',
    coverColor: '#f97316',
    status: 'Ativo',
    monthlyFee: 3500,
    services: ['Social Media', 'Campanhas'],
    activeDemandsCount: 1,
    joinedDate: '12/01/2026',
    city: 'Rio de Janeiro',
    state: 'RJ',
  },
];

export const initialDemands: DemandItem[] = [
  {
    id: 'DEM-FLAMENGO-01',
    title: 'Flamengo: camisa feita pelo público',
    client: 'Portal Publicitário',
    clientId: 'cli-portal-pub',
    clientProject: 'Concurso Uniforme Torcida',
    description: 'O clube divulgou os 5 finalistas do uniforme desenhado pela torcida. O designer vencedor leva R$ 10 mil e a camisa.',
    dueDate: '12/10 às 18:00',
    type: 'Feed',
    serviceCategory: 'Social Media',
    priority: 'alta',
    priorityBars: 3,
    columnId: 'aprovacao',
    approvalStatus: 'pendente',
    assignee: {
      name: 'Marcos Lancerotti',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    },
    commentsCount: 1,
    attachmentsCount: 3,
  },
];

export const initialRecentActivities: ClientActivity[] = [];

export const initialServices: Service[] = [];

export const initialProposals: BudgetProposal[] = [];

export const initialInvoices: Invoice[] = [];

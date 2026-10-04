import React from 'react';
import { DemandItem, Client, UserProfile } from '../types';
import { ClientApprovalsView } from './ClientApprovalsView';

export interface PortalClienteViewProps {
  demands: DemandItem[];
  clients: Client[];
  currentUser?: UserProfile;
  onClientApprovalAction: (
    demandId: string, 
    action: 'aprovado' | 'reprovado' | 'alteracao_solicitada', 
    feedback?: string
  ) => void;
  onOpenWhatsAppNotification: (demand: DemandItem) => void;
  onOpenDemandModal?: (demand: DemandItem) => void;
  onUpdateClient?: (client: Client) => void;
  onSelectClientDemands?: (clientName: string) => void;
  onNavigateToApprovals?: () => void;
  onOpenClientApprovalPortal?: (demand: DemandItem) => void;
  onNavigateToPortal?: () => void;
}

const defaultUser: UserProfile = {
  id: 'admin',
  name: 'Agência Help',
  email: 'contato@helpideias.com.br',
  role: 'proprietario',
  roleLabel: 'Administrador',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
};

export const PortalClienteView: React.FC<PortalClienteViewProps> = ({
  demands,
  clients,
  currentUser = defaultUser,
  onClientApprovalAction,
  onOpenWhatsAppNotification,
  onOpenDemandModal,
  onUpdateClient,
  onSelectClientDemands,
  onNavigateToApprovals,
  onOpenClientApprovalPortal,
  onNavigateToPortal,
}) => {
  return (
    <ClientApprovalsView
      demands={demands}
      clients={clients}
      currentUser={currentUser}
      onClientApprovalAction={onClientApprovalAction}
      onOpenWhatsAppNotification={onOpenWhatsAppNotification}
      onOpenDemandModal={onOpenDemandModal}
      onUpdateClient={onUpdateClient}
      onSelectClientDemands={onSelectClientDemands}
      onNavigateToPortal={onNavigateToPortal || onNavigateToApprovals || (() => {})}
      onOpenClientApprovalPortal={onOpenClientApprovalPortal || (() => {})}
    />
  );
};

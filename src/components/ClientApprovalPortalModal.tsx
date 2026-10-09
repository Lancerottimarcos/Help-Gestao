import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Instagram, 
  Edit3
} from 'lucide-react';
import { DemandItem, Client } from '../types';
import { detectAndSanitizeInput } from '../utils/securityProtocols';
import { FlamengoMockupCard } from './FlamengoMockupCard';

interface ClientApprovalPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: DemandItem | null;
  client?: Client | null;
  onApprove: (demandId: string) => void;
  onReject: (demandId: string, reason?: string) => void;
  onRequestChange: (demandId: string, feedback: string) => void;
}

export const ClientApprovalPortalModal: React.FC<ClientApprovalPortalModalProps> = ({
  isOpen,
  onClose,
  demand,
  client,
  onApprove,
  onReject,
  onRequestChange,
}) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('Amei! Ficou excelente.');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!isOpen || !demand) return null;

  const clientName = client?.companyName || client?.name || demand.client || 'Portal Publicitário';
  
  // Iniciais do cliente (ex: PP para Portal Publicitário)
  const clientInitials = (() => {
    const raw = clientName.trim().split(/\s+/).filter(Boolean);
    if (raw.length >= 2) return `${raw[0][0]}${raw[1][0]}`.toUpperCase();
    return clientName.slice(0, 2).toUpperCase();
  })();

  const mediaItems = (demand.attachments || []).filter(
    (a) => a.type === 'image' || a.type === 'video'
  );

  const effectiveMedia = mediaItems.length > 0 
    ? mediaItems 
    : (demand.thumbnail ? [{
        id: 'thumb-1',
        name: `${demand.title}.jpg`,
        size: 1024 * 1024,
        type: 'image',
        url: demand.thumbnail,
        uploadedAt: 'Versão para aprovação',
      }] : [
        {
          id: 'slide-1',
          name: 'Lâmina 1 - Mockup Principal.jpg',
          size: 1024 * 1024,
          type: 'image',
          url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=1000',
          uploadedAt: 'Versão para aprovação',
        },
        {
          id: 'slide-2',
          name: 'Lâmina 2 - Detalhes.jpg',
          size: 1024 * 1024,
          type: 'image',
          url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000',
          uploadedAt: 'Versão para aprovação',
        },
        {
          id: 'slide-3',
          name: 'Lâmina 3 - Final.jpg',
          size: 1024 * 1024,
          type: 'image',
          url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1000',
          uploadedAt: 'Versão para aprovação',
        }
      ]);

  const totalSlides = effectiveMedia.length;
  const currentMedia = effectiveMedia[activeMediaIndex] || effectiveMedia[0];

  const handlePrevSlide = () => {
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleNextSlide = () => {
    setActiveMediaIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const handleApproveClick = () => {
    onApprove(demand.id);
    setActionSuccessMessage('Material aprovado com sucesso! A agência foi avisada.');
  };

  const handleRequestAdjustments = () => {
    const rawText = commentText.trim();
    if (!rawText) {
      alert('Por favor, informe seu comentário ou instruções de ajuste.');
      return;
    }
    const sanitizedFeedback = detectAndSanitizeInput(rawText, 'Modal de Aprovação: Solicitação de Ajuste').sanitized;
    onRequestChange(demand.id, sanitizedFeedback);
    setActionSuccessMessage('Sua solicitação de alteração foi enviada para a agência.');
  };

  const isApproved = demand.approvalStatus === 'aprovado' || demand.columnId === 'agendamento' || demand.columnId === 'concluidas';
  const placementLabel = demand.type === 'Stories' ? 'Stories' : demand.type === 'Carrossel' ? 'Carrossel' : 'Feed';
  const scheduledDate = demand.dueDate || '12/10 às 18:00';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#EEF0F4] dark:bg-[#0c1220] w-full max-w-5xl rounded-[32px] sm:rounded-[36px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Minimalist Header: AF Agência Farol • Link de aprovação (bbbbb.png) */}
        <div className="px-6 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#0c1220]/70 backdrop-blur-md shrink-0">
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
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar visualização"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Notification / Feedback Bar */}
        {actionSuccessMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-bold shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#ff9900] shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-white/80 hover:text-white text-xs underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* 2-Column Content Body (bbbbb.png) */}
        <div className="p-6 sm:p-8 lg:p-10 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Creative Asset Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[380px] aspect-[4/5] rounded-[32px] overflow-hidden shadow-lg border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-[#fbf8f3] via-[#ffedd5] to-[#f97316] relative flex flex-col justify-between group">
                
                {/* Badge Contador de Lâmina: 1/3 (Top-Right) */}
                <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-black tracking-wider shadow-xs">
                  {activeMediaIndex + 1}/{totalSlides}
                </div>

                {/* Botão de Expandir Lightbox */}
                {currentMedia?.url && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(currentMedia.url)}
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
                      onClick={handlePrevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Slide anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
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
                  onClick={totalSlides > 1 ? handleNextSlide : undefined}
                >
                  {activeMediaIndex === 0 && (demand.title.toLowerCase().includes('flamengo') || !currentMedia?.url) ? (
                    <FlamengoMockupCard />
                  ) : currentMedia?.url ? (
                    <img
                      src={currentMedia.url}
                      alt={demand.title}
                      className="absolute inset-0 w-full h-full object-cover rounded-[32px]"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#fbf8f3] via-[#ffedd5] to-[#f97316] text-[#142142]">
                      <div className="pt-8">
                        <p className="text-xl font-black uppercase tracking-tight text-[#142142]">
                          {demand.title}
                        </p>
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-slate-800 font-medium">
                          {demand.description || 'Mockup para aprovação da agência'}
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
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activeMediaIndex === idx 
                          ? 'w-6 bg-[#f97316]' 
                          : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Post Details & Decision (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
              
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
                {demand.title}
              </h1>

              {/* 3. Descrição / Legenda do Post */}
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {demand.description || 'O clube divulgou os 5 finalistas do uniforme desenhado pela torcida. O designer vencedor leva R$ 10 mil e a camisa.'}
              </p>

              {/* 4. Status Capsule: Aguardando sua aprovação */}
              <div>
                {isApproved ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-medium shadow-xs">
                    <CheckCircle2 size={14} className="stroke-[2.5]" />
                    <span>Aprovado para agendamento</span>
                  </div>
                ) : demand.approvalStatus === 'alteracao_solicitada' ? (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-medium shadow-xs">
                      <Edit3 size={14} className="stroke-[2.5]" />
                      <span>Ajustes solicitados à agência</span>
                    </div>
                    {demand.approvalFeedback && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 text-xs sm:text-sm font-medium shadow-2xs">
                        <span className="font-bold block text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <MessageSquare size={13} className="text-amber-600 dark:text-amber-400" />
                          <span>O que foi solicitado para ajustar:</span>
                        </span>
                        <p className="italic font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                          “{demand.approvalFeedback}”
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8E99A8] text-white text-xs sm:text-sm font-medium shadow-xs">
                    <Clock size={14} className="stroke-[2.5]" />
                    <span>Aguardando sua aprovação</span>
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
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Amei! Ficou excelente... Ou escreva instruções de alteração"
                  rows={2}
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none font-normal leading-relaxed"
                />
              </div>

              {/* 6. Botões de Ação: [Pedir ajustes]  [✓ Aprovar] (exemplo.png) */}
              <div className="flex items-center justify-end gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={handleRequestAdjustments}
                  className="px-6 sm:px-7 py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm shadow-xs border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Pedir ajustes
                </button>

                <button
                  type="button"
                  onClick={handleApproveClick}
                  className="px-7 sm:px-8 py-3 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Check size={18} className="stroke-[3]" />
                  <span>Aprovar</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Lightbox / Zoom da Imagem */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Preview Ampliado"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Smile,
  Mic,
  Send,
  Paperclip,
  CheckCircle2,
  Users,
  Building,
  Palette,
  Briefcase,
  ChevronDown,
  Info,
  Lock,
  ArrowLeft,
  X,
  Plus,
  Volume2,
  AtSign,
  Radio,
  FileText
} from 'lucide-react';
import { ChatMessage, ChatChannel, TeamMember, UserProfile } from '../types';

interface ComunicacaoViewProps {
  currentUser: UserProfile;
  teamMembers?: TeamMember[];
  onSimulateMember?: (member: TeamMember | null) => void;
  simulatedMemberId?: string;
}

type FilterTab = 'tudo' | 'nao-lidas' | 'tipo';

export const ComunicacaoView: React.FC<ComunicacaoViewProps> = ({
  currentUser,
  teamMembers = [],
  onSimulateMember,
  simulatedMemberId,
}) => {
  // Canais e Mensagens
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('criacao');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Filtros e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('tudo');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'setores' | 'geral'>('todos');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTimer, setAudioRecordingTimer] = useState(0);

  // Visão Mobile
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');

  // WebSocket & Presença Real
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; name: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Usuário efetivo
  const effectiveUser = useMemo(() => {
    if (simulatedMemberId && teamMembers.length > 0) {
      const sim = teamMembers.find((m) => m.id === simulatedMemberId);
      if (sim) {
        return {
          id: sim.id,
          name: sim.name,
          role: sim.role || sim.functionRole || 'Colaborador',
          avatarUrl: sim.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
        };
      }
    }
    return {
      id: currentUser.id,
      name: currentUser.name || 'Felipe Demo',
      role: currentUser.roleLabel || 'Diretor de Operações',
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    };
  }, [currentUser, simulatedMemberId, teamMembers]);

  // Carrega lista de canais da API
  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/chat/channels');
      const data = await res.json();
      if (data.success && Array.isArray(data.channels) && data.channels.length > 0) {
        setChannels(data.channels);
      } else {
        // Fallback garantido exatamente como na imagem
        setChannels([
          {
            id: 'criacao',
            name: 'Criação',
            description: 'Setor Criação',
            icon: 'Palette',
            unreadCount: 0,
            lastMessage: {
              content: 'Parabéns, time! Batemos a meta de propostas do mês.',
              senderName: 'Camila Torres',
              timestamp: '11:18',
            }
          },
          {
            id: 'atendimento',
            name: 'Atendimento',
            description: 'Setor Atendimento',
            icon: 'Building',
            unreadCount: 6,
            lastMessage: {
              content: 'Parabéns, ti...',
              senderName: 'Camila Torres',
              timestamp: '11:18',
            }
          },
          {
            id: 'geral',
            name: 'Geral',
            description: 'Geral da equipe',
            icon: 'Users',
            unreadCount: 22,
            lastMessage: {
              content: 'Ótima sema...',
              senderName: 'Felipe Demo',
              timestamp: '09:18',
            }
          }
        ]);
      }
    } catch (err) {
      console.error('Erro ao buscar canais:', err);
    }
  };

  // Carrega mensagens do canal ativo
  const fetchMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?channelId=${encodeURIComponent(channelId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else if (channelId === 'criacao') {
        // Mensagens padrão da tela de referência
        setMessages([
          {
            id: 'm1',
            channelId: 'criacao',
            senderId: 'juliana',
            senderName: 'Juliana Prado',
            senderRole: 'Designer Gráfico',
            senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
            content: 'Reunião com a Clínica Vitalis remarcada para amanhã às 10h.',
            timestamp: Date.now() - 3600000 * 2,
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            timeFormatted: '09:47',
          },
          {
            id: 'm2',
            channelId: 'criacao',
            senderId: 'marcos',
            senderName: 'Marcos Lima',
            senderRole: 'Redator',
            senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
            content: 'O contrato da Bella Moda foi assinado agora há pouco!',
            timestamp: Date.now() - 3600000 * 1.5,
            createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            timeFormatted: '10:04',
          },
          {
            id: 'm3',
            channelId: 'criacao',
            senderId: 'camila',
            senderName: 'Camila Torres',
            senderRole: 'Customer Success',
            senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
            content: 'Parabéns, time! Batemos a meta de propostas do mês.',
            timestamp: Date.now() - 3600000,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            timeFormatted: '11:18',
          },
        ]);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    fetchMessages(activeChannelId);
  }, [activeChannelId]);

  // Scroll suave para última mensagem
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, activeChannelId]);

  // WebSocket
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          ws.send(
            JSON.stringify({
              type: 'client:join',
              userId: effectiveUser.id,
              name: effectiveUser.name,
              role: effectiveUser.role,
              channelId: activeChannelId,
            })
          );
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'presence:sync' || data.type === 'presence:update') {
              if (Array.isArray(data.presence || data.users)) {
                setOnlineUsers(data.presence || data.users);
              }
            } else if (data.type === 'message:new') {
              const newMsg: ChatMessage = data.message;
              if (newMsg.channelId === activeChannelId) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                setTimeout(() => scrollToBottom(true), 60);
              }
              fetchChannels();
            }
          } catch (e) {
            console.error('Erro WS:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          reconnectTimer = setTimeout(() => {
            if (isMounted) connectWebSocket();
          }, 3000);
        };
      } catch (err) {
        console.error('Falha de conexão WS:', err);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [effectiveUser, activeChannelId]);

  // Enviar Mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = messageText.trim();
    if (!cleanContent || sending) return;

    setSending(true);
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const payload = {
        channelId: activeChannelId,
        senderId: effectiveUser.id,
        senderName: effectiveUser.name,
        senderAvatar: effectiveUser.avatarUrl,
        senderRole: effectiveUser.role,
        content: cleanContent,
        timestamp: formattedTime,
      };

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessageText('');
        setShowEmojiPicker(false);
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        // Fallback local
        const localMsg: ChatMessage = {
          id: `local-${Date.now()}`,
          channelId: activeChannelId,
          senderId: effectiveUser.id,
          senderName: effectiveUser.name,
          senderAvatar: effectiveUser.avatarUrl,
          senderRole: effectiveUser.role,
          content: cleanContent,
          timestamp: now.getTime(),
          createdAt: now.toISOString(),
          timeFormatted: formattedTime,
        };
        setMessages((prev) => [...prev, localMsg]);
        setMessageText('');
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      console.error('Erro ao enviar:', err);
    } finally {
      setSending(false);
    }
  };

  // Gravação de Áudio simulada com botão laranja do microfone
  const handleToggleAudioRecording = () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      setAudioRecordingTimer(0);
      audioTimerIntervalRef.current = setInterval(() => {
        setAudioRecordingTimer((prev) => prev + 1);
      }, 1000);
    } else {
      // Conclui gravação e envia áudio
      if (audioTimerIntervalRef.current) clearInterval(audioTimerIntervalRef.current);
      setIsRecordingAudio(false);
      const secs = audioRecordingTimer;
      const formattedDuration = `0:${String(secs).padStart(2, '0')}`;
      
      const now = new Date();
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const audioMsg: ChatMessage = {
        id: `audio-${Date.now()}`,
        channelId: activeChannelId,
        senderId: effectiveUser.id,
        senderName: effectiveUser.name,
        senderAvatar: effectiveUser.avatarUrl,
        senderRole: effectiveUser.role,
        content: `🎙️ Mensagem de áudio (${formattedDuration})`,
        timestamp: now.getTime(),
        createdAt: now.toISOString(),
        timeFormatted: formattedTime,
      };

      setMessages((prev) => [...prev, audioMsg]);
      setTimeout(() => scrollToBottom(true), 50);
    }
  };

  // Canal ativo selecionado
  const currentChannel = useMemo(() => {
    return (
      channels.find((c) => c.id === activeChannelId) || {
        id: activeChannelId,
        name: activeChannelId === 'criacao' ? 'Criação' : activeChannelId === 'atendimento' ? 'Atendimento' : 'Geral',
        description: activeChannelId === 'criacao' ? 'Setor Criação' : activeChannelId === 'atendimento' ? 'Setor Atendimento' : 'Geral da equipe',
        icon: activeChannelId === 'criacao' ? 'Palette' : activeChannelId === 'atendimento' ? 'Building' : 'Users',
      }
    );
  }, [channels, activeChannelId]);

  // Lista de canais filtrada
  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      // Busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      // Filtro de abas
      if (filterTab === 'nao-lidas') {
        const hasUnread = (c as any).unreadCount && (c as any).unreadCount > 0;
        if (!hasUnread) return false;
      }
      // Filtro de tipos
      if (typeFilter === 'setores') {
        if (c.id === 'geral') return false;
      } else if (typeFilter === 'geral') {
        if (c.id !== 'geral') return false;
      }
      return true;
    });
  }, [channels, searchQuery, filterTab, typeFilter]);

  // Render do ícone do canal
  const renderChannelAvatar = (channel: ChatChannel) => {
    if (channel.id === 'geral') {
      return (
        <div className="w-11 h-11 rounded-full bg-[#5eead4] text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
          <Users size={20} strokeWidth={2.2} />
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-full bg-[#e2e8f0] dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-300/40 dark:border-slate-600/40 shadow-xs">
        <Building size={20} strokeWidth={2} />
      </div>
    );
  };

  const commonEmojis = ['👍', '❤️', '🚀', '🔥', '👏', '👀', '🎉', '💡', '✅', '🙌'];

  return (
    <div className="min-h-[660px] h-[calc(100vh-6.5rem)] flex flex-col md:flex-row gap-4 p-1 max-w-[1720px] mx-auto animate-in fade-in duration-300">
      
      {/* ==================================================================== */}
      {/* 1. LEFT PANEL: DARK CONVERSATIONS CARD (Matching exact image)       */}
      {/* ==================================================================== */}
      <div className={`w-full md:w-80 lg:w-[340px] shrink-0 bg-[#101319] rounded-[32px] p-5 flex flex-col justify-between shadow-xl border border-slate-800/80 ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="space-y-4">
          
          {/* Search Box "Buscar conversa" */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversa"
              className="w-full bg-[#1b1f2b] text-slate-100 placeholder-slate-500 rounded-full pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all border border-transparent focus:border-slate-700"
            />
          </div>

          {/* Filter Pills: Tudo, Não lidas, Tipo ▾ */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setFilterTab('tudo')}
              className={`px-3.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                filterTab === 'tudo'
                  ? 'bg-[#fab518] text-[#142142] shadow-sm'
                  : 'bg-[#1b1f2b] text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('nao-lidas')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'nao-lidas'
                  ? 'bg-[#fab518] text-[#142142] shadow-sm'
                  : 'bg-[#1b1f2b] text-slate-400 hover:text-white'
              }`}
            >
              Não lidas
            </button>

            {/* Dropdown Tipo ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="bg-[#1b1f2b] text-slate-400 hover:text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{typeFilter === 'todos' ? 'Tipo' : typeFilter === 'setores' ? 'Setores' : 'Geral'}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-36 bg-[#1b1f2b] rounded-2xl border border-slate-700 shadow-2xl p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => { setTypeFilter('todos'); setIsTypeDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      typeFilter === 'todos' ? 'bg-[#fab518] text-[#142142]' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Todos os Tipos
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTypeFilter('setores'); setIsTypeDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      typeFilter === 'setores' ? 'bg-[#fab518] text-[#142142]' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Setores da Agência
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTypeFilter('geral'); setIsTypeDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      typeFilter === 'geral' ? 'bg-[#fab518] text-[#142142]' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Canal Geral
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="space-y-1 pt-1 overflow-y-auto max-h-[calc(100vh-280px)] no-scrollbar">
            {filteredChannels.map((channel, idx) => {
              const isActive = activeChannelId === channel.id;
              const unread = (channel as any).unreadCount || 0;
              const lastMsgText = channel.lastMessage?.content || 
                (channel.id === 'criacao' ? 'Camila Torres: Parabéns, time! ...' : 
                 channel.id === 'atendimento' ? 'Camila Torres: Parabéns, ti...' : 'Felipe Demo: Ótima sema...');
              const timestamp = channel.lastMessage?.timestamp || 
                (channel.id === 'criacao' ? '11:18' : channel.id === 'atendimento' ? '11:18' : '09:18');

              return (
                <div key={channel.id}>
                  <div
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setMobileView('chat');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1b212f] border border-slate-700/60 shadow-xs'
                        : 'hover:bg-[#161a24] border border-transparent'
                    }`}
                  >
                    {/* Circle Avatar matching image */}
                    {renderChannelAvatar(channel)}

                    {/* Channel Info & Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-black truncate ${
                          isActive ? 'text-[#fab518]' : 'text-white'
                        }`}>
                          {channel.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium shrink-0 ml-1">
                          {timestamp}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-400 truncate pr-2 font-medium">
                          {lastMsgText}
                        </p>

                        {/* Orange Unread Badge matching image */}
                        {unread > 0 && !isActive && (
                          <span className="w-5 h-5 rounded-full bg-[#fab518] text-[#142142] font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs ml-1">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtle divider line between items */}
                  {idx < filteredChannels.length - 1 && (
                    <div className="border-b border-dashed border-slate-800/80 my-1 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{wsConnected ? 'Tempo real ativo' : 'Conectando chat...'}</span>
          </div>
          <span>Help Ideias</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. RIGHT PANEL: CHAT WINDOW CARD (Matching exact image)             */}
      {/* ==================================================================== */}
      <div className={`flex-1 bg-white dark:bg-[#0f172a] rounded-[32px] p-5 sm:p-7 shadow-sm border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-h-[580px] ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Top Header of Chat Window */}
        <div>
          <div className="flex items-center justify-between pb-3.5">
            
            {/* Left: Avatar + Title + Subtitle */}
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Voltar para conversas"
              >
                <ArrowLeft size={18} />
              </button>

              {/* Sector Icon Circle Avatar */}
              <div className="w-11 h-11 rounded-full bg-[#f1f5f9] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs">
                {currentChannel.id === 'geral' ? (
                  <Users size={20} strokeWidth={2.2} />
                ) : (
                  <Building size={20} strokeWidth={2} />
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {currentChannel.name}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {currentChannel.description || `Setor ${currentChannel.name}`}
                </p>
              </div>
            </div>

            {/* Right: "Só a equipe vê" pill badge matching image */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold">
                ?
              </div>
              <span>Só a equipe vê</span>
            </div>
          </div>

          {/* Dotted divider line below header matching image */}
          <div className="border-b border-dashed border-slate-200 dark:border-slate-800" />
        </div>

        {/* Message Feed / Chat Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 sm:pr-2">
          {messages.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#fab518] flex items-center justify-center mx-auto">
                <Smile size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Inicie uma conversa no canal {currentChannel.name}!
              </p>
              <p className="text-xs text-slate-400">
                Envie uma mensagem ou grave um áudio para a equipe.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const avatar = msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
              const role = msg.senderRole || 'Colaborador';
              const time = msg.timeFormatted || (typeof msg.timestamp === 'number' ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(msg.timestamp || '11:18'));

              return (
                <div key={msg.id} className="flex items-start gap-3.5 group">
                  {/* Photo Avatar on Left */}
                  <img
                    src={avatar}
                    alt={msg.senderName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 shadow-2xs mt-0.5"
                  />

                  {/* Message Column */}
                  <div className="min-w-0 max-w-3xl">
                    {/* Header: Name + Role Badge + Time */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {msg.senderName}
                      </span>

                      {/* Role Chip matching image */}
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">
                        {role}
                      </span>

                      {/* Timestamp */}
                      <span className="text-slate-400 text-xs font-normal">
                        {time}
                      </span>
                    </div>

                    {/* Speech Bubble matching exact style in image */}
                    <div className="mt-1.5 inline-block">
                      <div className="bg-[#f3f4f6] dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 rounded-[22px] rounded-tl-xs px-5 py-3 text-sm font-medium leading-relaxed shadow-2xs">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ==================================================================== */}
        {/* Bottom Input Pill Bar (Matching exact image)                        */}
        {/* ==================================================================== */}
        <div className="pt-2 relative">
          
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-3 right-10 bg-white dark:bg-[#1a2234] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Escolha um emoji</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xl">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setMessageText((prev) => prev + emoji);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-transform hover:scale-120"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pill Bar Form */}
          <form
            onSubmit={handleSendMessage}
            className="bg-[#f3f4f6] dark:bg-slate-800/90 rounded-full p-2 pl-6 flex items-center gap-3 border border-slate-200/70 dark:border-slate-700/70 shadow-xs"
          >
            {/* Audio Recording State Bar */}
            {isRecordingAudio ? (
              <div className="flex-1 flex items-center gap-3 text-rose-500 font-bold text-xs animate-pulse">
                <Radio size={16} />
                <span>Gravando áudio... 0:{String(audioRecordingTimer).padStart(2, '0')}</span>
                <span className="text-slate-400 font-normal">Clique no microfone para enviar</span>
              </div>
            ) : (
              /* Text Input */
              <input
                ref={inputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escreva uma mensagem... use @ para marcar alguém"
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none px-1 font-medium"
              />
            )}

            {/* Right Action Icons: Paperclip, Smile, Orange Mic/Send Button */}
            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              
              {/* Paperclip */}
              <button
                type="button"
                onClick={() => {
                  setMessageText((prev) => prev + ' [anexo.pdf] ');
                  if (inputRef.current) inputRef.current.focus();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                title="Anexar arquivo ou link"
              >
                <Paperclip size={18} />
              </button>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                title="Inserir emoji"
              >
                <Smile size={18} />
              </button>

              {/* Orange Mic / Send Button matching image exactly */}
              {messageText.trim().length > 0 ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-10 h-10 rounded-full bg-[#fab518] hover:bg-[#e5a415] text-[#142142] flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
                  title="Enviar mensagem"
                >
                  <Send size={18} strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleAudioRecording}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95 ${
                    isRecordingAudio 
                      ? 'bg-rose-500 text-white animate-bounce' 
                      : 'bg-[#fab518] hover:bg-[#e5a415] text-[#142142]'
                  }`}
                  title={isRecordingAudio ? "Enviar áudio" : "Gravar mensagem de voz"}
                >
                  <Mic size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import { CommemorativeDate } from '../types';

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CATEGORY_FILTERS = [
  { id: 'todos', label: 'Todas as Datas' },
  { id: 'comercial', label: 'Comercial & Varejo' },
  { id: 'feriado', label: 'Feriados Oficiais' },
  { id: 'redes_sociais', label: 'Redes Sociais & Engajamento' },
  { id: 'profissao_nicho', label: 'Profissões & Nichos' },
  { id: 'aniversario_cliente', label: 'Aniversários de Clientes' },
  { id: 'personalizada', label: 'Criadas pela Agência' },
];

export const initialCommemorativeDates: CommemorativeDate[] = [
  // Janeiro
  { id: 'd-1', day: 1, month: 1, year: 2026, date: '2026-01-01', title: 'Confraternização Universal / Ano Novo', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Celebração de início de novo ciclo anual. Planejamento de metas e novos começos.', isHoliday: true, targetSegments: ['Geral'] },
  { id: 'd-2', day: 7, month: 1, year: 2026, date: '2026-01-07', title: 'Dia do Leitor', category: 'redes_sociais', categoryLabel: 'Redes Sociais', description: 'Incentivo à leitura e indicações de livros que inspiram sua equipe ou clientes.', targetSegments: ['Educação', 'Cultura', 'Geral'] },
  { id: 'd-3', day: 30, month: 1, year: 2026, date: '2026-01-30', title: 'Dia da Saudade', category: 'redes_sociais', categoryLabel: 'Redes Sociais', description: 'Gatilho de nostalgia, TBT antecipado ou resgate de momentos marcantes da marca.', targetSegments: ['Geral', 'Varejo'] },

  // Fevereiro
  { id: 'd-4', day: 14, month: 2, year: 2026, date: '2026-02-14', title: 'Valentine’s Day (Internacional)', category: 'comercial', categoryLabel: 'Comercial', description: 'Dia de São Valentim. Ótimo para marcas que vendem para o exterior ou público que comemora amor.', targetSegments: ['Gastronomia', 'Moda', 'Presentes'] },
  { id: 'd-5', day: 17, month: 2, year: 2026, date: '2026-02-17', title: 'Carnaval (Terça-feira)', category: 'feriado', categoryLabel: 'Feriado / Festividade', description: 'Feriado de Carnaval. Campanhas alegres, promoções de folia e avisos de expediente.', isHoliday: true, targetSegments: ['Geral', 'Turismo', 'Eventos'] },

  // Março
  { id: 'd-6', day: 8, month: 3, year: 2026, date: '2026-03-08', title: 'Dia Internacional da Mulher', category: 'comercial', categoryLabel: 'Comercial & Social', description: 'Homenagem e valorização do protagonismo feminino nos negócios e na sociedade.', targetSegments: ['Geral', 'Moda', 'Beleza', 'Corporativo'] },
  { id: 'd-7', day: 15, month: 3, year: 2026, date: '2026-03-15', title: 'Dia do Consumidor', category: 'comercial', categoryLabel: 'Comercial Forte', description: 'Uma das maiores datas do e-commerce e varejo no primeiro semestre. Ofertas exclusivas.', targetSegments: ['E-commerce', 'Varejo', 'Serviços'] },

  // Abril
  { id: 'd-8', day: 3, month: 4, year: 2026, date: '2026-04-03', title: 'Sexta-feira Santa', category: 'feriado', categoryLabel: 'Feriado Religioso', description: 'Páscoa e feriado sagrado cristão.', isHoliday: true, targetSegments: ['Geral'] },
  { id: 'd-9', day: 5, month: 4, year: 2026, date: '2026-04-05', title: 'Páscoa', category: 'comercial', categoryLabel: 'Comercial & Festivo', description: 'Data forte para confeitarias, restaurantes, chocolates e família reunida.', targetSegments: ['Gastronomia', 'Varejo', 'Alimentação'] },
  { id: 'd-10', day: 21, month: 4, year: 2026, date: '2026-04-21', title: 'Tiradentes', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Feriado em memória de Tiradentes e da Inconfidência Mineira.', isHoliday: true, targetSegments: ['Geral'] },

  // Maio
  { id: 'd-11', day: 1, month: 5, year: 2026, date: '2026-05-01', title: 'Dia do Trabalhador', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Valorização de todos os colaboradores, bastidores da equipe e homenagens.', isHoliday: true, targetSegments: ['Corporativo', 'RH', 'Geral'] },
  { id: 'd-12', day: 10, month: 5, year: 2026, date: '2026-05-10', title: 'Dia das Mães', category: 'comercial', categoryLabel: 'Comercial Premium', description: 'Segunda maior data comercial do ano no Brasil. Afeto, presentes e homenagens emocionantes.', targetSegments: ['Varejo', 'Moda', 'Gastronomia', 'Saúde & Beleza', 'Geral'] },

  // Junho
  { id: 'd-13', day: 12, month: 6, year: 2026, date: '2026-06-12', title: 'Dia dos Namorados', category: 'comercial', categoryLabel: 'Comercial Premium', description: 'Data de altíssimo impacto para casais, jantares românticos e troca de presentes.', targetSegments: ['Gastronomia', 'Moda', 'Hotelaria', 'Joias', 'Geral'] },
  { id: 'd-14', day: 24, month: 6, year: 2026, date: '2026-06-24', title: 'Dia de São João (Festas Juninas)', category: 'redes_sociais', categoryLabel: 'Cultura & Festividade', description: 'Festa junina, comidas típicas e brincadeiras com a comunidade.', targetSegments: ['Alimentação', 'Eventos', 'Geral'] },

  // Julho
  { id: 'd-15', day: 20, month: 7, year: 2026, date: '2026-07-20', title: 'Dia do Amigo e Internacional da Amizade', category: 'redes_sociais', categoryLabel: 'Redes Sociais', description: 'Gatilho de marcação de amigos, parcerias duradouras e promoções de indique um amigo.', targetSegments: ['Geral', 'Serviços', 'Academias'] },
  { id: 'd-16', day: 26, month: 7, year: 2026, date: '2026-07-26', title: 'Dia dos Avós', category: 'redes_sociais', categoryLabel: 'Redes Sociais', description: 'Carinho, aconchego familiar e homenagens aos avós.', targetSegments: ['Família', 'Saúde', 'Geral'] },

  // Agosto
  { id: 'd-17', day: 9, month: 8, year: 2026, date: '2026-08-09', title: 'Dia dos Pais', category: 'comercial', categoryLabel: 'Comercial Forte', description: 'Data importante para homenagens, ferramentas, tecnologia, moda masculina e gastronomia.', targetSegments: ['Varejo', 'Tecnologia', 'Moda Masculina', 'Gastronomia', 'Geral'] },

  // Setembro
  { id: 'd-18', day: 7, month: 9, year: 2026, date: '2026-09-07', title: 'Independência do Brasil', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Feriado da Pátria. Orgulho nacional, avisos de horário especial e campanhas cívicas.', isHoliday: true, targetSegments: ['Geral'] },
  { id: 'd-19', day: 15, month: 9, year: 2026, date: '2026-09-15', title: 'Dia do Cliente', category: 'comercial', categoryLabel: 'Comercial Estratégico', description: 'Data crucial para fidelização! Envie mimos, cupons especiais e agradecimentos públicos.', targetSegments: ['B2B', 'Varejo', 'Serviços', 'Geral'] },
  { id: 'd-20', day: 21, month: 9, year: 2026, date: '2026-09-21', title: 'Dia da Árvore', category: 'redes_sociais', categoryLabel: 'Sustentabilidade', description: 'Consciência ecológica, iniciativas ESG e preservação da natureza.', targetSegments: ['Sustentabilidade', 'Agro', 'Geral'] },
  { id: 'd-21', day: 27, month: 9, year: 2026, date: '2026-09-27', title: 'Dia Mundial do Turismo', category: 'profissao_nicho', categoryLabel: 'Nicho Turismo', description: 'Dicas de viagens, pacotes turísticos e experiências inesquecíveis.', targetSegments: ['Turismo', 'Hotelaria', 'Lazer'] },

  // Outubro
  { id: 'd-22', day: 12, month: 10, year: 2026, date: '2026-10-12', title: 'Nossa Senhora Aparecida / Dia das Crianças', category: 'comercial', categoryLabel: 'Feriado & Comercial', description: 'Feriado nacional e forte pico de vendas de brinquedos, doces e lazer infantil.', isHoliday: true, targetSegments: ['Infantil', 'Brinquedos', 'Moda Infantil', 'Lazer'] },
  { id: 'd-23', day: 15, month: 10, year: 2026, date: '2026-10-15', title: 'Dia do Professor', category: 'profissao_nicho', categoryLabel: 'Profissões', description: 'Reconhecimento aos mestres e educadores que transformam o futuro.', targetSegments: ['Educação', 'Escolas', 'Cursos'] },
  { id: 'd-24', day: 31, month: 10, year: 2026, date: '2026-10-31', title: 'Halloween / Dia das Bruxas', category: 'comercial', categoryLabel: 'Engajamento & Festivo', description: 'Fantasias, brincadeiras, promoções assustadoramente boas e visual temático.', targetSegments: ['Jovem', 'Gastronomia', 'Moda', 'Entretenimento'] },

  // Novembro
  { id: 'd-25', day: 2, month: 11, year: 2026, date: '2026-11-02', title: 'Finados', category: 'feriado', categoryLabel: 'Feriado Religioso', description: 'Dia de respeito e memória.', isHoliday: true, targetSegments: ['Geral'] },
  { id: 'd-26', day: 15, month: 11, year: 2026, date: '2026-11-15', title: 'Proclamação da República', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Feriado nacional da Proclamação da República.', isHoliday: true, targetSegments: ['Geral'] },
  { id: 'd-27', day: 20, month: 11, year: 2026, date: '2026-11-20', title: 'Dia da Consciência Negra', category: 'feriado', categoryLabel: 'Feriado Nacional', description: 'Celebração da cultura afro-brasileira e luta contra o racismo.', isHoliday: true, targetSegments: ['Geral', 'Cultura'] },
  { id: 'd-28', day: 27, month: 11, year: 2026, date: '2026-11-27', title: 'Black Friday 2026', category: 'comercial', categoryLabel: 'Maior Data Comercial', description: 'O dia mais esperado do ano para vendas online e físicas. Campanhas agressivas de conversão.', targetSegments: ['E-commerce', 'Varejo', 'Tecnologia', 'Serviços', 'Geral'] },
  { id: 'd-29', day: 30, month: 11, year: 2026, date: '2026-11-30', title: 'Cyber Monday 2026', category: 'comercial', categoryLabel: 'E-commerce & Tech', description: 'Extensão da Black Friday focada em tecnologia, cursos e infoprodutos.', targetSegments: ['E-commerce', 'Tecnologia', 'Educação'] },

  // Dezembro
  { id: 'd-30', day: 25, month: 12, year: 2026, date: '2026-12-25', title: 'Natal', category: 'comercial', categoryLabel: 'Feriado & Comercial Máximo', description: 'Celebração de fraternidade, família, ceias e troca de presentes em todo o mundo.', isHoliday: true, targetSegments: ['Geral', 'Varejo', 'Gastronomia'] },
  { id: 'd-31', day: 31, month: 12, year: 2026, date: '2026-12-31', title: 'Véspera de Ano Novo / Réveillon', category: 'redes_sociais', categoryLabel: 'Retrospectiva & Metas', description: 'Retrospectiva do ano que passou, celebração de conquistas e votos de prosperidade para 2027.', targetSegments: ['Geral', 'Eventos', 'Turismo'] },
];

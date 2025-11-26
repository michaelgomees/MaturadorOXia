import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contact {
  nome: string | null;
  telefone: string;
  variavel1?: string | null;
  variavel2?: string | null;
  variavel3?: string | null;
}

/**
 * Obtém a saudação apropriada baseada no horário atual
 */
function getSaudacao(): string {
  const hora = new Date().getHours();
  
  if (hora >= 0 && hora < 12) {
    return 'Bom dia';
  } else if (hora >= 12 && hora < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

/**
 * Substitui todas as variáveis na mensagem pelos valores reais
 */
export function substituirVariaveis(mensagem: string, contato: Contact): string {
  const agora = new Date();
  
  // Mapa de substituições
  const substituicoes: Record<string, string> = {
    '<saudacao>': getSaudacao(),
    '<nome>': contato.nome || contato.telefone,
    '<data>': format(agora, 'dd/MM/yyyy', { locale: ptBR }),
    '<diadasemana>': format(agora, 'EEEE', { locale: ptBR }),
    '<hora>': format(agora, 'HH:mm', { locale: ptBR }),
    '<mes>': format(agora, 'MMMM', { locale: ptBR }),
    '<variavel1>': contato.variavel1 || '',
    '<variavel2>': contato.variavel2 || '',
    '<variavel3>': contato.variavel3 || '',
  };
  
  // Substitui todas as variáveis na mensagem
  let mensagemProcessada = mensagem;
  Object.entries(substituicoes).forEach(([variavel, valor]) => {
    mensagemProcessada = mensagemProcessada.replace(new RegExp(variavel, 'g'), valor);
  });
  
  return mensagemProcessada;
}

/**
 * Lista de variáveis disponíveis para uso nas mensagens
 */
export const VARIAVEIS_DISPONIVEIS = [
  { tag: '<saudacao>', descricao: 'Saudação automática (Bom dia, Boa tarde, Boa noite)' },
  { tag: '<nome>', descricao: 'Nome do contato' },
  { tag: '<data>', descricao: 'Data atual (dd/mm/yyyy)' },
  { tag: '<diadasemana>', descricao: 'Dia da semana atual' },
  { tag: '<hora>', descricao: 'Hora atual (HH:mm)' },
  { tag: '<mes>', descricao: 'Mês atual' },
  { tag: '<variavel1>', descricao: 'Variável customizada 1' },
  { tag: '<variavel2>', descricao: 'Variável customizada 2' },
  { tag: '<variavel3>', descricao: 'Variável customizada 3' },
];

interface Contact {
  nome: string | null;
  telefone: string;
  variavel1?: string | null;
  variavel2?: string | null;
  variavel3?: string | null;
}

export function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function substituirVariaveis(mensagem: string, contato: Contact): string {
  // Handle undefined or null message
  if (!mensagem) {
    console.error('Mensagem undefined ou null recebida');
    return '';
  }

  const now = new Date();
  
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const diasSemana = [
    'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado'
  ];
  
  const substituicoes: { [key: string]: string } = {
    '<saudacao>': getSaudacao(),
    '<nome>': contato.nome || contato.telefone,
    '<data>': now.toLocaleDateString('pt-BR'),
    '<diadasemana>': diasSemana[now.getDay()],
    '<hora>': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    '<mes>': meses[now.getMonth()],
    '<variavel1>': contato.variavel1 || '',
    '<variavel2>': contato.variavel2 || '',
    '<variavel3>': contato.variavel3 || '',
  };
  
  let mensagemProcessada = mensagem;
  for (const [variavel, valor] of Object.entries(substituicoes)) {
    mensagemProcessada = mensagemProcessada.replace(new RegExp(variavel, 'g'), valor);
  }
  
  return mensagemProcessada;
}

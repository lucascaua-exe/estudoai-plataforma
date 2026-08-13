/** Sugestões comuns — o usuário também pode digitar livremente. */
export const CARGO_SUGGESTIONS = [
  'Analista de Tecnologia da Informação',
  'Analista de Sistemas',
  'Analista de Dados',
  'Analista Administrativo',
  'Analista Judiciário',
  'Técnico de Informática',
  'Técnico Judiciário',
  'Auditor Fiscal',
  'Auditor de Controle Externo',
  'Agente Administrativo',
  'Agente de Polícia',
  'Delegado de Polícia',
  'Escrivão de Polícia',
  'Perito Criminal',
  'Engenheiro Civil',
  'Engenheiro Elétrico',
  'Engenheiro de Software',
  'Arquiteto',
  'Contador',
  'Economista',
  'Advogado',
  'Procurador',
  'Professor',
  'Enfermeiro',
  'Médico',
  'Assistente Social',
  'Psicólogo',
  'Fiscal de Tributos',
] as const

export function displayCargo(cargo?: string | null, emptyLabel = 'Definir cargo') {
  const value = (cargo || '').trim()
  return value || emptyLabel
}

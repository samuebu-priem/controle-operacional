export const pageMetadata = [
  { match: /^\/$/, title: "Dashboard", description: "Visão geral da operação" },
  { match: /^\/nova-inspecao/, title: "Nova inspeção", description: "Registro guiado da inspeção operacional" },
  { match: /^\/historico/, title: "Histórico de Inspeções", description: "Consulte inspeções anteriores e registros das frotas" },
  { match: /^\/registro-frotas/, title: "Registro de Frotas", description: "Cadastro e gerenciamento da frota operacional" },
  { match: /^\/frotas\//, title: "Histórico da Frota", description: "Inspeções e recorrências da frota" },
  { match: /^\/patio/, title: "Gestão de Pátio", description: "Controle de ocupação e movimentação das frotas" },
  { match: /^\/produtos\//, title: "Ficha do Produto", description: "Informações técnicas e procedimento operacional" },
  { match: /^\/produtos/, title: "Produtos", description: "Catálogo técnico de produtos transportados" },
  { match: /^\/colaboradores/, title: "Colaboradores", description: "Cadastro e indicadores da equipe operacional" },
  { match: /^\/painel-gerencial/, title: "Painel Gerencial", description: "Indicadores de desempenho e qualidade" },
  { match: /^\/perfil/, title: "Minha conta", description: "Dados e preferências do usuário" },
  { match: /^\/inspecao\//, title: "Detalhes da inspeção", description: "Informações, resultado e evidências" }
];

export function metadataFor(pathname) {
  return pageMetadata.find((item) => item.match.test(pathname)) || { title: "Controle Operacional", description: "Gestão da operação" };
}

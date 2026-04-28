export type TipoInspecao = "ANTES_LAVAGEM" | "APOS_LAVAGEM";
export type StatusInspecao = "APROVADO" | "REPROVADO" | "COM_OBSERVACAO";
export type Severidade = "LEVE" | "MEDIA" | "GRAVE";

export interface UserSession {
  id: string;
  name: string;
  fullName: string | null;
  jobTitle: string | null;
  email: string;
  token: string;
}

export interface Frota {
  id: string;
  numeroFrota: string;
  placa: string;
  tipoEquipamento: string;
  material: string;
  capacidade: string;
  observacoesFixas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PontoCritico {
  id: string;
  inspecaoId: string;
  categoria: string;
  localizacao: string;
  descricao: string;
  severidade: Severidade;
  procedimentoRecomendado: string;
  createdAt: string;
}

export interface FotoInspecao {
  id: string;
  inspecaoId: string;
  pontoCriticoId: string | null;
  imageUrl: string;
  fileName: string;
  legenda: string | null;
  createdAt: string;
}

export interface Inspecao {
  id: string;
  frotaId: string;
  dataInspecao: string;
  tipoInspecao: TipoInspecao;
  status: StatusInspecao;
  observacoesGerais: string | null;
  nomeInspetor: string;
  createdAt: string;
  updatedAt: string;
  pontosCriticos: PontoCritico[];
  fotos: FotoInspecao[];
}

export interface ResumoRecorrenciaItem {
  categoria: string;
  localizacao: string;
  descricao: string;
  total: number;
}

export interface ResumoRecorrencia {
  alerta: string;
  recorrencias: ResumoRecorrenciaItem[];
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

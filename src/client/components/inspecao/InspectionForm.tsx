import type { ChangeEvent, FormEvent } from "react";
import type { StatusInspecao, TipoInspecao } from "../../../shared/types";
import Button from "../ui/Button";
import Input, { Textarea } from "../ui/Input";

type InspectionFormValues = {
  numeroFrota: string;
  placa: string;
  tipoEquipamento: string;
  dataInspecao: string;
  tipoInspecao: TipoInspecao;
  status: StatusInspecao;
  nomeInspetor: string;
  observacoesGerais: string;
};

type InspectionFormProps = {
  values: InspectionFormValues;
  onChange: (field: keyof InspectionFormValues, value: string) => void;
  onConfirmType: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  isFrotaEncontrada: boolean;
  tipoConfirmado: boolean;
};

export default function InspectionForm({
  values,
  onChange,
  onConfirmType,
  onSubmit,
  loading = false,
  isFrotaEncontrada,
  tipoConfirmado
}: InspectionFormProps) {
  return (
    <form className="page-stack" onSubmit={onSubmit}>
      <div className="section-card">
        <div className="section-head">
          <div>
            <p className="card-label">Frota</p>
            <h2 className="section-title">Dados da frota</h2>
          </div>
        </div>

        <div className="form-grid form-grid--two">
          <Input label="Número da frota" value={values.numeroFrota} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange("numeroFrota", e.target.value)} />
          <Input label="Placa" value={values.placa} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange("placa", e.target.value)} />
          <label className="input-field">
            <span className="input-field__label">Tipo de tanque</span>
            <select className="input" value={values.tipoEquipamento} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange("tipoEquipamento", e.target.value)}>
              <option value="">Selecione</option>
              <option value="Tanque inox">Tanque inox</option>
              <option value="Tanque carbono">Tanque carbono</option>
              <option value="Carreta tanque">Carreta tanque</option>
              <option value="Bitrem tanque">Bitrem tanque</option>
              <option value="Isotank">Isotank</option>
              <option value="Outro">Outro</option>
            </select>
          </label>
          <div className="detail-actions" style={{ alignSelf: "end" }}>
            <Button variant="secondary" type="button" onClick={onConfirmType}>
              Confirmar tipo
            </Button>
          </div>
        </div>

        <p className="helper">{tipoConfirmado ? "Tipo confirmado." : "Confirme o tipo para continuar."}</p>
        {isFrotaEncontrada ? <p className="notice notice--success">Frota localizada.</p> : null}
      </div>

      <div className="section-card">
        <div className="section-head">
          <div>
            <p className="card-label">Inspeção</p>
            <h2 className="section-title">Dados da inspeção</h2>
          </div>
        </div>

        <div className="form-grid form-grid--two">
          <Input label="Data da inspeção" type="datetime-local" value={values.dataInspecao} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange("dataInspecao", e.target.value)} />
          <label className="input-field">
            <span className="input-field__label">Tipo da inspeção</span>
            <select className="input" value={values.tipoInspecao} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange("tipoInspecao", e.target.value)}>
              <option value="ANTES_LAVAGEM">Antes da lavagem</option>
              <option value="APOS_LAVAGEM">Após lavagem</option>
            </select>
          </label>
          <label className="input-field">
            <span className="input-field__label">Status</span>
            <select className="input" value={values.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange("status", e.target.value)}>
              <option value="APROVADO">Aprovado</option>
              <option value="REPROVADO">Reprovado</option>
              <option value="COM_OBSERVACAO">Com observação</option>
            </select>
          </label>
          <Input label="Nome do inspetor" value={values.nomeInspetor} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange("nomeInspetor", e.target.value)} />
          <Textarea label="Observações gerais" value={values.observacoesGerais} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange("observacoesGerais", e.target.value)} />
        </div>
      </div>

      <div className="detail-actions">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar inspeção"}
        </Button>
      </div>
    </form>
  );
}

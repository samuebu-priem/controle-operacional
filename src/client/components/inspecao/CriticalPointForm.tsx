import type { ChangeEvent } from "react";
import type { Severidade } from "../../../shared/types";
import Button from "../ui/Button";
import Input, { Textarea } from "../ui/Input";

export type DraftPontoCritico = {
  categoria: string;
  localizacao: string;
  descricao: string;
  severidade: Severidade;
  procedimentoRecomendado: string;
  files: File[];
};

type CriticalPointFormProps = {
  pontosCriticos: DraftPontoCritico[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof Omit<DraftPontoCritico, "files">, value: string) => void;
  onRemove: (index: number) => void;
  onChangeFiles: (index: number, files: File[]) => void;
  onRemoveFile: (index: number, fileIndex: number) => void;
};

const severidades: Severidade[] = ["LEVE", "MEDIA", "GRAVE"];
const categoriasPontoCritico = ["Ferrugem", "Resquicio de produto", "Fuligem", "Amarelamento", "Mancha"];

export default function CriticalPointForm({
  pontosCriticos,
  onAdd,
  onUpdate,
  onRemove,
  onChangeFiles,
  onRemoveFile
}: CriticalPointFormProps) {
  return (
    <div className="critical-point-form">
      <Button variant="ghost" type="button" onClick={onAdd}>
        + Adicionar ponto crítico
      </Button>

      {pontosCriticos.map((ponto, index) => (
        <article key={index} className="critical-point-form__item">
          <label className="input-field">
            <span className="input-field__label">Categoria</span>
            <select
              className="input"
              value={ponto.categoria}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onUpdate(index, "categoria", e.target.value)}
            >
              <option value="">Selecione</option>
              {categoriasPontoCritico.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>
          <Input label="Localização" value={ponto.localizacao} onChange={(e) => onUpdate(index, "localizacao", e.target.value)} />
          <Textarea
            label="Descrição"
            value={ponto.descricao}
            onChange={(e: { target: { value: string } }) => onUpdate(index, "descricao", e.target.value)}
          />
          <label className="input-field">
            <span className="input-field__label">Severidade</span>
            <select className="input" value={ponto.severidade} onChange={(e: ChangeEvent<HTMLSelectElement>) => onUpdate(index, "severidade", e.target.value)}>
              {severidades.map((severidade) => (
                <option key={severidade} value={severidade}>
                  {severidade}
                </option>
              ))}
            </select>
          </label>
          <Textarea
            label="Procedimento recomendado"
            value={ponto.procedimentoRecomendado}
            onChange={(e: { target: { value: string } }) => onUpdate(index, "procedimentoRecomendado", e.target.value)}
          />

          <div className="critical-point-form__photos">
            <label className="input-field">
              <span className="input-field__label">Fotos do ponto crítico</span>
              <input
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) => onChangeFiles(index, Array.from(event.target.files ?? []))}
              />
            </label>

            {ponto.files.length > 0 ? (
              <div className="photo-preview-grid">
                {ponto.files.map((file, fileIndex) => (
                  <div key={`${file.name}-${fileIndex}`} className="photo-preview-grid__item">
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <div className="photo-preview-grid__meta">
                      <span>{file.name}</span>
                      <Button variant="ghost" type="button" onClick={() => onRemoveFile(index, fileIndex)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="critical-point-form__actions">
            <Button variant="ghost" type="button" onClick={() => onRemove(index)}>
              Remover ponto crítico
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

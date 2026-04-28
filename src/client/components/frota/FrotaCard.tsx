import type { Frota, Inspecao } from "../../../shared/types";
import Button from "../ui/Button";
import Card from "../ui/Card";

export type FrotaCardProps = {
  frota: Frota;
  ultimaInspecao: Inspecao | null;
  onEdit: () => void;
  onHistory: () => void;
  onOpenLast: () => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function FrotaCard({ frota, ultimaInspecao, onEdit, onHistory, onOpenLast }: FrotaCardProps) {
  return (
    <Card className="frota-card">
      <div className="frota-card__top">
        <div>
          <p className="frota-card__label">Frota em destaque</p>
          <h3 className="frota-card__title">{frota.numeroFrota}</h3>
          <p className="frota-card__meta">{frota.tipoEquipamento}</p>
        </div>
        <span className={`status ${ultimaInspecao?.status === "REPROVADO" ? "status--danger" : "status--success"}`}>
          {ultimaInspecao ? ultimaInspecao.status : "SEM INSPEÇÃO"}
        </span>
      </div>

      <div>
        <p className="frota-card__line">
          <strong>Placa:</strong> {frota.placa}
        </p>
        <p className="frota-card__line">
          <strong>Última inspeção:</strong> {ultimaInspecao ? formatDate(ultimaInspecao.dataInspecao) : "—"}
        </p>
      </div>

      <div className="frota-card__actions">
        <Button variant="secondary" type="button" onClick={onHistory}>
          Ver histórico
        </Button>
        <Button variant="secondary" type="button" onClick={onOpenLast} disabled={!ultimaInspecao}>
          Abrir última inspeção
        </Button>
        <Button variant="ghost" type="button" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import type { Frota } from "../../../shared/types";
import { updateFrota } from "../../api";
import Button from "../ui/Button";
import Input from "../ui/Input";

type EditFrotaModalProps = {
  open: boolean;
  frota: Frota | null;
  onClose: () => void;
  onSaved: (frota: Frota) => void;
};

export default function EditFrotaModal({ open, frota, onClose, onSaved }: EditFrotaModalProps) {
  const [numeroFrota, setNumeroFrota] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipoEquipamento, setTipoEquipamento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (frota) {
      setNumeroFrota(frota.numeroFrota);
      setPlaca(frota.placa);
      setTipoEquipamento(frota.tipoEquipamento);
    }
  }, [frota]);

  async function handleSubmit(event: { preventDefault: () => void }) {
    if (!frota) return;
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await updateFrota(frota.id, { numeroFrota, placa, tipoEquipamento });
      onSaved(response.frota);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar frota");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !frota) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}>
        <h2 className="modal__title">Editar frota</h2>
        <form className="modal__body" onSubmit={handleSubmit}>
          <Input label="Frota" value={numeroFrota} onChange={(e) => setNumeroFrota(e.target.value)} />
          <Input label="Placa" value={placa} onChange={(e) => setPlaca(e.target.value)} />
          <Input label="Tipo de tanque" value={tipoEquipamento} onChange={(e) => setTipoEquipamento(e.target.value)} />
          {error ? <p className="notice notice--error">{error}</p> : null}
          <div className="modal__actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

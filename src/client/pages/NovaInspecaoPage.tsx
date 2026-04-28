import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import type { Frota, StatusInspecao, TipoInspecao } from "../../shared/types";
import { createInspecao, getFrotaByNumero, uploadFotos } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import CriticalPointForm, { type DraftPontoCritico } from "../components/inspecao/CriticalPointForm";
import InspectionForm from "../components/inspecao/InspectionForm";
import { getAuthUser } from "../utils/auth";

type DraftPontoCriticoComArquivos = DraftPontoCritico;

export default function NovaInspecaoPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const inspectorName = authUser?.fullName?.trim() || authUser?.name || "";
  const [frotaEncontrada, setFrotaEncontrada] = useState<Frota | null>(null);
  const [tipoConfirmado, setTipoConfirmado] = useState(false);
  const [values, setValues] = useState({
    numeroFrota: "",
    placa: "",
    tipoEquipamento: "",
    dataInspecao: new Date().toISOString().slice(0, 16),
    tipoInspecao: "ANTES_LAVAGEM" as TipoInspecao,
    status: "COM_OBSERVACAO" as StatusInspecao,
    nomeInspetor: inspectorName,
    observacoesGerais: ""
  });
  const [pontosCriticos, setPontosCriticos] = useState<DraftPontoCriticoComArquivos[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedInspectionId, setSavedInspectionId] = useState("");

  useEffect(() => {
    setValues((current) => ({ ...current, nomeInspetor: inspectorName }));
  }, [inspectorName]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const numero = values.numeroFrota.trim();
      if (!numero) {
        setFrotaEncontrada(null);
        setTipoConfirmado(false);
        return;
      }

      void (async () => {
        try {
          const response = await getFrotaByNumero(numero);
          setFrotaEncontrada(response.frota);
          if (response.frota) {
            setValues((current) => ({
              ...current,
              placa: response.frota?.placa ?? "",
              tipoEquipamento: response.frota?.tipoEquipamento ?? ""
            }));
          }
        } catch {
          setFrotaEncontrada(null);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [values.numeroFrota]);

  const previewUrls = useMemo(() => [], []);

  function handleChange(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function addPonto() {
    setPontosCriticos((current) => [
      ...current,
      {
        categoria: "",
        localizacao: "",
        descricao: "",
        severidade: "LEVE",
        procedimentoRecomendado: "",
        files: []
      }
    ]);
  }

  function updatePonto(index: number, field: keyof DraftPontoCritico, value: string) {
    setPontosCriticos((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removePonto(index: number) {
    setPontosCriticos((current) => current.filter((_, i) => i !== index));
  }

  function updatePontoFiles(index: number, files: File[]) {
    setPontosCriticos((current) => current.map((item, i) => (i === index ? { ...item, files } : item)));
  }

  function removePontoFile(index: number, fileIndex: number) {
    setPontosCriticos((current) =>
      current.map((item, i) =>
        i === index ? { ...item, files: item.files.filter((_, currentIndex) => currentIndex !== fileIndex) } : item
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await createInspecao({
        frotaId: frotaEncontrada?.id ?? values.numeroFrota,
        numeroFrota: values.numeroFrota,
        placa: values.placa,
        tipoEquipamento: values.tipoEquipamento,
        dataInspecao: new Date(values.dataInspecao).toISOString(),
        tipoInspecao: values.tipoInspecao,
        status: values.status,
        observacoesGerais: values.observacoesGerais || null,
        nomeInspetor: values.nomeInspetor,
        pontosCriticos: pontosCriticos.map(({ files: _files, ...ponto }) => ponto)
      });

      const inspectionId = response.inspecao.id;
      setSavedInspectionId(inspectionId);

      const pontosCriados = response.inspecao.pontosCriticos ?? [];
      const filesToUpload = pontosCriticos.flatMap((ponto, index) =>
        ponto.files.map((file) => ({
          file,
          pontoCriticoId: pontosCriados[index]?.id ?? ""
        }))
      );

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        for (const item of filesToUpload) {
          formData.append("files[]", item.file);
          formData.append("pontoCriticoId", item.pontoCriticoId);
        }
        await uploadFotos(inspectionId, formData);
      }

      setSuccess("Inspeção salva com sucesso.");
      navigate(`/inspecao/${inspectionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar inspeção");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-frame">
        <AppHeader title="Nova inspeção" subtitle="Crie a inspeção, inclua pontos críticos e fotos." showBack />
        {error ? <p className="notice notice--error">{error}</p> : null}
        {success ? <p className="notice notice--success">{success}</p> : null}

        <InspectionForm
          values={values}
          onChange={handleChange}
          onConfirmType={() => setTipoConfirmado(Boolean(values.tipoEquipamento))}
          onSubmit={handleSubmit}
          loading={saving}
          isFrotaEncontrada={Boolean(frotaEncontrada)}
          tipoConfirmado={tipoConfirmado}
        />

        <section className="section-card">
          <div className="section-head">
            <div>
              <p className="card-label">Pontos críticos</p>
              <h2 className="section-title">Itens opcionais</h2>
            </div>
          </div>
          <CriticalPointForm
            pontosCriticos={pontosCriticos}
            onAdd={addPonto}
            onUpdate={updatePonto}
            onRemove={removePonto}
            onChangeFiles={updatePontoFiles}
            onRemoveFile={removePontoFile}
          />
        </section>
      </div>
    </AppLayout>
  );
}

import { jsx, jsxs } from "react/jsx-runtime";
import Button from "../ui/Button";
import Input, { Textarea } from "../ui/Input";
const severidades = ["LEVE", "MEDIA", "GRAVE"];
const categoriasPontoCritico = ["Ferrugem", "Resquicio de produto", "Fuligem", "Amarelamento", "Mancha"];
function CriticalPointForm({
  pontosCriticos,
  onAdd,
  onUpdate,
  onRemove,
  onChangeFiles,
  onRemoveFile
}) {
  return /* @__PURE__ */ jsxs("div", { className: "critical-point-form", children: [
    /* @__PURE__ */ jsx(Button, { variant: "ghost", type: "button", onClick: onAdd, children: "+ Adicionar ponto cr\xEDtico" }),
    pontosCriticos.map((ponto, index) => /* @__PURE__ */ jsxs("article", { className: "critical-point-form__item", children: [
      /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
        /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Categoria" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            className: "input",
            value: ponto.categoria,
            onChange: (e) => onUpdate(index, "categoria", e.target.value),
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "Selecione" }),
              categoriasPontoCritico.map((categoria) => /* @__PURE__ */ jsx("option", { value: categoria, children: categoria }, categoria))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx(Input, { label: "Localiza\xE7\xE3o", value: ponto.localizacao, onChange: (e) => onUpdate(index, "localizacao", e.target.value) }),
      /* @__PURE__ */ jsx(
        Textarea,
        {
          label: "Descri\xE7\xE3o",
          value: ponto.descricao,
          onChange: (e) => onUpdate(index, "descricao", e.target.value)
        }
      ),
      /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
        /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Severidade" }),
        /* @__PURE__ */ jsx("select", { className: "input", value: ponto.severidade, onChange: (e) => onUpdate(index, "severidade", e.target.value), children: severidades.map((severidade) => /* @__PURE__ */ jsx("option", { value: severidade, children: severidade }, severidade)) })
      ] }),
      /* @__PURE__ */ jsx(
        Textarea,
        {
          label: "Procedimento recomendado",
          value: ponto.procedimentoRecomendado,
          onChange: (e) => onUpdate(index, "procedimentoRecomendado", e.target.value)
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "critical-point-form__photos", children: [
        /* @__PURE__ */ jsxs("label", { className: "input-field", children: [
          /* @__PURE__ */ jsx("span", { className: "input-field__label", children: "Fotos do ponto cr\xEDtico" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "input",
              type: "file",
              accept: "image/*",
              multiple: true,
              onChange: (event) => onChangeFiles(index, Array.from(event.target.files ?? []))
            }
          )
        ] }),
        ponto.files.length > 0 ? /* @__PURE__ */ jsx("div", { className: "photo-preview-grid", children: ponto.files.map((file, fileIndex) => /* @__PURE__ */ jsxs("div", { className: "photo-preview-grid__item", children: [
          /* @__PURE__ */ jsx("img", { src: URL.createObjectURL(file), alt: file.name }),
          /* @__PURE__ */ jsxs("div", { className: "photo-preview-grid__meta", children: [
            /* @__PURE__ */ jsx("span", { children: file.name }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", type: "button", onClick: () => onRemoveFile(index, fileIndex), children: "Remover" })
          ] })
        ] }, `${file.name}-${fileIndex}`)) }) : null
      ] }),
      /* @__PURE__ */ jsx("div", { className: "critical-point-form__actions", children: /* @__PURE__ */ jsx(Button, { variant: "ghost", type: "button", onClick: () => onRemove(index), children: "Remover ponto cr\xEDtico" }) })
    ] }, index))
  ] });
}
export {
  CriticalPointForm as default
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listInspecoes } from "../api";
import AppHeader from "../components/layout/AppHeader";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import QualityIndicatorsCard from "../components/quality/QualityIndicatorsCard";

export default function HomePage() {
  const navigate = useNavigate();
  const [inspecoes, setInspecoes] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadInspecoes() {
      try {
        const response = await listInspecoes();
        if (active) setInspecoes(response.inspecoes);
      } catch {
        if (active) setInspecoes([]);
      }
    }

    void loadInspecoes();

    return () => {
      active = false;
    };
  }, []);

  return _jsx(AppLayout, {
    children: _jsxs("div", {
      className: "page-frame home-page",
      children: [
        _jsx(AppHeader, {
          title: "Controle Operacional",
          subtitle: "Inspe\u00e7\u00e3o de frotas e hist\u00f3rico."
        }),
        _jsxs("div", {
          className: "home-actions",
          children: [
            _jsx(Button, {
              type: "button",
              variant: "secondary",
              onClick: () => navigate("/colaboradores"),
              children: "Colaboradores"
            }),
            _jsx(Button, {
              type: "button",
              variant: "secondary",
              onClick: () => navigate("/nova-inspecao"),
              children: "Nova inspe\u00e7\u00e3o"
            }),
            _jsx(Button, {
              type: "button",
              variant: "secondary",
              onClick: () => navigate("/historico"),
              children: "Hist\u00f3rico de inspe\u00e7\u00f5es"
            }),
            _jsx(Button, {
              type: "button",
              variant: "secondary",
              onClick: () => navigate("/registro-frotas"),
              children: "Registro de frotas"
            })
          ]
        }),
        _jsx(QualityIndicatorsCard, { inspecoes })
      ]
    })
  });
}

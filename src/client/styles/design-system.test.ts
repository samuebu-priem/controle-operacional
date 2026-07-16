import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const css=readFileSync(new URL("./global.css",import.meta.url),"utf8");
const components=readFileSync(new URL("../components/ui/SystemUI.js",import.meta.url),"utf8");
test("design system expõe os componentes compartilhados solicitados",()=>{for(const name of ["PageContainer","PageHeader","SectionCard","MetricCard","StatusBadge","ResponsiveGrid","FormField","SearchField","DataTable","MobileDataCard","EmptyState","LoadingState","ConfirmModal","InfoBanner","ActionBar"])assert.match(components,new RegExp(`function ${name}\\b`))});
test("tokens visuais centrais estão consolidados",()=>{for(const token of ["page-max-width","page-padding","section-gap","card-radius","card-padding","border-color","surface-color","surface-elevated","text-primary","text-secondary","accent-color","danger-color","success-color","warning-color"])assert.match(css,new RegExp(`--${token}:`))});
test("desktop, tablet e mobile têm contratos próprios",()=>{assert.match(css,/@media\(min-width:1024px\)/);assert.match(css,/@media\(max-width:1023px\)/);assert.match(css,/@media\(max-width:767px\)/);assert.match(css,/@media\(max-width:420px\)/)});
test("cards de conteúdo variável não usam corte na camada compartilhada",()=>{assert.match(css,/\.section-card-system[^}]+height:auto[^}]+overflow:visible/)});

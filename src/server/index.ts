import express from "express";
import "dotenv/config";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./modules/auth/auth.routes";
import { colaboradorRoutes } from "./modules/colaboradores/colaborador.routes";
import { frotaRoutes } from "./modules/frotas/frota.routes";
import { inspecaoRoutes } from "./modules/inspecoes/inspecao.routes";
import { fotoRoutes } from "./modules/fotos/foto.routes";
import { yardRoutes } from "./modules/yard/yard.routes";
import { errorHandler } from "./middleware/errorHandler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/colaboradores", colaboradorRoutes);
app.use("/api/frotas", frotaRoutes);
app.use("/api/inspecoes", inspecaoRoutes);
app.use("/api", fotoRoutes);
app.use("/api/yard", yardRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

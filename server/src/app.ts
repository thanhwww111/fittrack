import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { env } from "./config/env";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api", routes);

// Hai dòng này luôn phải nằm cuối cùng
app.use(notFound);
app.use(errorHandler);

export default app;
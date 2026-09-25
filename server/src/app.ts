import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { env } from "./config/env";

const app = express();

// Sau proxy của Render: dùng X-Forwarded-For để req.ip là IP thật của người dùng
if (env.TRUST_PROXY > 0) {
  app.set("trust proxy", env.TRUST_PROXY);
}

app.use(helmet());
// Dev: cho mọi origin (Expo web, công cụ test). Production: chỉ các origin khai báo,
// app mobile gọi trực tiếp nên không cần CORS.
app.use(
  cors({
    origin: env.NODE_ENV === "development" ? true : env.CORS_ORIGINS,
  })
);
app.use(express.json({ limit: "1mb" }));

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else if (env.NODE_ENV === "production") {
  app.use(morgan("tiny"));
}

app.use("/api", routes);

// Hai dòng này luôn phải nằm cuối cùng
app.use(notFound);
app.use(errorHandler);

export default app;
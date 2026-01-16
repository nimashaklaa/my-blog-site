import express, { Express, Request, Response, NextFunction } from "express";
import connectDB from "./lib/connectDB";
import userRouter from "./routes/user.route";
import postRouter from "./routes/post.route";
import commentRouter from "./routes/comment.route";
import webhookRouter from "./routes/webhook.route";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app: Express = express();

if (!process.env.CLIENT_URL) {
  throw new Error("CLIENT_URL environment variable is not set");
}

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(clerkMiddleware());
app.use("/webhooks", webhookRouter);
app.use(express.json());

app.use(function (_req: Request, res: Response, next: NextFunction) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500);

  res.json({
    message: error.message || "Something went wrong!",
    stack: error.stack,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}!`);
});


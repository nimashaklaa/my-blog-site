import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response, NextFunction } from "express";
import connectDB from "./lib/connectDB.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import { uploadAuth } from "./controllers/post.controller.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app: Express = express();

if (!process.env.CLIENT_URL) {
  throw new Error("CLIENT_URL environment variable is not set");
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY environment variable is not set. Please add it to your .env file.");
}

// Note: CLERK_PUBLISHABLE_KEY is required by clerkMiddleware() for token verification
// It's used to validate the token's audience and ensure it was issued for the correct application
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error("CLERK_PUBLISHABLE_KEY environment variable is not set. Please add it to your .env file. This is required by Clerk's middleware for token verification.");
}

// Validate publishable key format (should start with pk_test_ or pk_live_)
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY.trim();
if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
  throw new Error(
    `CLERK_PUBLISHABLE_KEY has invalid format. It should start with "pk_test_" or "pk_live_". ` +
    `Current value starts with: "${publishableKey.substring(0, 10)}..." ` +
    `Make sure you're using the same publishable key as your frontend (VITE_CLERK_PUBLISHABLE_KEY).`
  );
}

app.use(cors({ origin: process.env.CLIENT_URL }));

// Webhook routes MUST come before express.json() and clerkMiddleware
// because they need raw body for Svix signature verification
app.use("/webhooks", webhookRouter);

app.use(express.json());

// Public routes (no authentication required)
app.get("/posts/upload-auth", uploadAuth);

// Clerk middleware for authenticated routes
// Pass keys explicitly to ensure proper formatting
app.use(clerkMiddleware({
  publishableKey: publishableKey,
  secretKey: process.env.CLERK_SECRET_KEY.trim(),
}));

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
  console.error("Unhandled error:", error);
  console.error("Error stack:", error.stack);
  
  res.status(500).json({
    error: error.message || "Something went wrong!",
    message: error.message || "Something went wrong!",
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}!`);
});


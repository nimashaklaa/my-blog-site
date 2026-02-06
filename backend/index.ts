import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response, NextFunction } from "express";
import connectDB from "./lib/connectDB.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import draftRouter from "./routes/draft.route.js";
import { uploadAuth } from "./controllers/post.controller.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app: Express = express();

if (!process.env.CLIENT_URL) {
  throw new Error("CLIENT_URL environment variable is not set");
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    "CLERK_SECRET_KEY environment variable is not set. Please add it to your .env file."
  );
}

// Note: CLERK_PUBLISHABLE_KEY is required by clerkMiddleware() for token verification
// It's used to validate the token's audience and ensure it was issued for the correct application
if (!process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    "CLERK_PUBLISHABLE_KEY environment variable is not set. Please add it to your .env file. This is required by Clerk's middleware for token verification."
  );
}

// Validate publishable key format (should start with pk_test_ or pk_live_)
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY.trim();
if (
  !publishableKey.startsWith("pk_test_") &&
  !publishableKey.startsWith("pk_live_")
) {
  throw new Error(
    `CLERK_PUBLISHABLE_KEY has invalid format. It should start with "pk_test_" or "pk_live_". ` +
      `Current value starts with: "${publishableKey.substring(0, 10)}..." ` +
      `Make sure you're using the same publishable key as your frontend (VITE_CLERK_PUBLISHABLE_KEY).`
  );
}

// Allow multiple origins so different Vite ports (5173, 5174, etc.) work.
// CLIENT_URL can be a single URL or comma-separated list (e.g. "http://localhost:5173,http://localhost:5174").
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((u) => u.trim())
  : [];

const corsOptions = {
  origin(
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (e.g. same-origin, Postman).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow any localhost origin so any Vite port works.
    if (
      process.env.NODE_ENV !== "production" &&
      (origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:"))
    ) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Prevent duplicate Access-Control-Allow-Origin (e.g. from Clerk adding "null").
// Keep only the first valid value so the browser sees a single header.
app.use((_req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  const originalAppend = res.append.bind(res);

  res.setHeader = function (
    name: string,
    value: string | number | readonly string[]
  ) {
    const headerName = String(name).toLowerCase();

    if (headerName === "access-control-allow-origin") {
      const existing = res.getHeader("Access-Control-Allow-Origin");

      // If we already have a valid origin set, skip any further attempts
      if (existing && existing !== "null") {
        return res;
      }

      // Clean the value - remove "null" and keep only valid origins
      let cleanValue: string | undefined;
      if (Array.isArray(value)) {
        cleanValue = value.find((v) => v && v !== "null" && v !== "undefined");
      } else if (typeof value === "string") {
        // Handle comma-separated values like "http://localhost:5173, null"
        const parts = value.split(",").map((v) => v.trim());
        cleanValue = parts.find((v) => v && v !== "null" && v !== "undefined");
      } else {
        cleanValue = String(value);
      }

      // Skip if no valid value
      if (!cleanValue || cleanValue === "null" || cleanValue === "undefined") {
        return res;
      }

      return originalSetHeader(name, cleanValue);
    }

    return originalSetHeader(
      name,
      value as string | number | readonly string[]
    );
  };

  // Also intercept append() to prevent adding "null" to CORS header
  res.append = function (field: string, val?: string | string[]) {
    if (String(field).toLowerCase() === "access-control-allow-origin") {
      const existing = res.getHeader("Access-Control-Allow-Origin");
      // If valid origin already set, don't append anything
      if (existing && existing !== "null") {
        return res;
      }
      // If trying to append "null", skip it
      if (
        val === "null" ||
        (Array.isArray(val) && val.every((v) => v === "null"))
      ) {
        return res;
      }
    }
    return originalAppend(field, val);
  };

  next();
});

// Webhook routes MUST come before express.json() and clerkMiddleware
// because they need raw body for Svix signature verification
app.use("/webhooks", webhookRouter);

app.use(express.json());

// Public routes (no authentication required)
app.get("/posts/upload-auth", uploadAuth);

// Clerk middleware for authenticated routes
// Pass keys explicitly to ensure proper formatting
app.use(
  clerkMiddleware({
    publishableKey: publishableKey,
    secretKey: process.env.CLERK_SECRET_KEY.trim(),
  })
);

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);
app.use("/drafts", draftRouter);

// Debug: Log all registered routes
console.log("Registered routes:");
console.log("  GET    /posts");
console.log("  POST   /posts");
console.log("  PATCH  /posts/feature");
console.log("  PATCH  /posts/clap/:id");
console.log("  DELETE /posts/:id");
console.log("  GET    /posts/:slug");
console.log("  GET    /users/saved");
console.log("  PATCH  /users/save");

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

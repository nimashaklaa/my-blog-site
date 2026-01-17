import express, { Request, Response, NextFunction } from "express";
import {
  getPosts,
  getPost,
  createPost,
  deletePost,
  featurePost,
  toggleClap,
} from "../controllers/post.controller.js";
import increaseVisit from "../middlewares/increaseVisit.js";

const router = express.Router();

// Async error wrapper to ensure errors are caught
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error("Async handler caught error:", error);
      next(error);
    });
  };
};

// upload-auth is handled directly in index.ts as a public route
// IMPORTANT: Order matters! More specific routes must come before generic ones
router.get("/", asyncHandler(getPosts));
router.post("/", asyncHandler(createPost));
router.patch("/feature", asyncHandler(featurePost));
// Clap route - using /clap/:id pattern to avoid conflicts with /:slug
router.patch("/clap/:id", asyncHandler(toggleClap));
router.delete("/:id", asyncHandler(deletePost));
// Slug route must be last as it's a catch-all for GET requests
router.get("/:slug", increaseVisit, asyncHandler(getPost));

export default router;

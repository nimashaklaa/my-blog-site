import express, { Request, Response, NextFunction } from "express";
import {
  getPosts,
  getPost,
  createPost,
  deletePost,
  featurePost,
} from "../controllers/post.controller.js";
import increaseVisit from "../middlewares/increaseVisit.js";

const router = express.Router();

// Async error wrapper to ensure errors are caught
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error("Async handler caught error:", error);
      next(error);
    });
  };
};

// upload-auth is handled directly in index.ts as a public route
router.get("/", asyncHandler(getPosts));
router.get("/:slug", increaseVisit, asyncHandler(getPost));
router.post("/", asyncHandler(createPost));
router.delete("/:id", asyncHandler(deletePost));
router.patch("/feature", asyncHandler(featurePost));

export default router;


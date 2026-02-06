import express, { Request, Response, NextFunction } from "express";
import {
  getSeries,
  getSeriesById,
  getSeriesBySlug,
  createSeries,
  updateSeries,
  deleteSeries,
} from "../controllers/series.controller.js";

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

// IMPORTANT: Order matters! More specific routes must come before generic ones
router.get("/", asyncHandler(getSeries));
router.post("/", asyncHandler(createSeries));
router.put("/:id", asyncHandler(updateSeries));
router.delete("/:id", asyncHandler(deleteSeries));
// Get by id (must be before /:slug so "id" is not captured as slug)
router.get("/id/:id", asyncHandler(getSeriesById));
// Slug route must be last as it's a catch-all for GET requests
router.get("/:slug", asyncHandler(getSeriesBySlug));

export default router;

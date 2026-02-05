import express, { Request, Response, NextFunction } from "express";
import {
  getDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
} from "../controllers/draft.controller.js";

const router = express.Router();

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get("/", asyncHandler(getDrafts));
router.get("/:id", asyncHandler(getDraft));
router.post("/", asyncHandler(createDraft));
router.put("/:id", asyncHandler(updateDraft));
router.delete("/:id", asyncHandler(deleteDraft));

export default router;

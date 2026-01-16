import { Request, Response, NextFunction } from "express";
import Post from "../models/post.model.js";

const increaseVisit = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const slug = req.params.slug;

  await Post.findOneAndUpdate({ slug }, { $inc: { visit: 1 } });

  next();
};

export default increaseVisit;


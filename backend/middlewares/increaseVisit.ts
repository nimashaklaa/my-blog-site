import { Request, Response, NextFunction } from "express";
import Post from "../models/post.model";

const increaseVisit = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const slug = req.params.slug;

  await Post.findOneAndUpdate({ slug }, { $inc: { visit: 1 } });

  next();
};

export default increaseVisit;


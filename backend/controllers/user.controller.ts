import { Request, Response } from "express";
import User from "../models/user.model.js";

export const getUserSavedPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  res.status(200).json(user.savedPosts);
};

export const savePost = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const isSaved = user.savedPosts.some((p) => p === postId);

  if (!isSaved) {
    await User.findByIdAndUpdate(user._id, {
      $push: { savedPosts: postId },
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $pull: { savedPosts: postId },
    });
  }

  res.status(200).json(isSaved ? "Post unsaved" : "Post saved");
};

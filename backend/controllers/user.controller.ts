import { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";

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

  // Remove duplicates and filter valid ObjectIds
  const uniquePostIds = [...new Set(user.savedPosts)]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (uniquePostIds.length === 0) {
    res.status(200).json([]);
    return;
  }

  // Return populated posts instead of just IDs
  const posts = await Post.find({ _id: { $in: uniquePostIds } })
    .populate("user", "username img")
    .sort({ createdAt: -1 })
    .lean();

  // Filter out null posts and posts missing required fields
  const validPosts = posts.filter(
    (post) =>
      post != null &&
      post._id != null &&
      post.slug != null &&
      String(post.slug).trim() !== ""
  );

  // Clean up user's savedPosts if there are invalid entries
  const validPostIds = validPosts.map((p) => p._id.toString());
  if (validPostIds.length !== user.savedPosts.length) {
    await User.findByIdAndUpdate(user._id, {
      savedPosts: validPostIds,
    });
  }

  res.status(200).json(validPosts);
};

export const savePost = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  if (!postId || !Types.ObjectId.isValid(postId)) {
    res.status(400).json("Invalid post ID!");
    return;
  }

  // Verify the post exists
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json("Post not found!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const isSaved = user.savedPosts.some((p) => p === postId);

  if (!isSaved) {
    // Use $addToSet to prevent duplicates
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { savedPosts: postId },
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $pull: { savedPosts: postId },
    });
  }

  res.status(200).json(isSaved ? "Post unsaved" : "Post saved");
};

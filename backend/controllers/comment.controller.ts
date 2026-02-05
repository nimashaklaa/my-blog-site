import { Request, Response } from "express";
import Comment, { ReactionType } from "../models/comment.model.js";
import User from "../models/user.model.js";
import { getUserRole } from "../lib/getUserRole.js";

const REACTION_TYPES: ReactionType[] = ["like", "love", "laugh"];

function toReactionCounts(reactions: { user: unknown; type: string }[]) {
  const counts: Record<string, number> = { like: 0, love: 0, laugh: 0 };
  for (const r of reactions) {
    if (REACTION_TYPES.includes(r.type as ReactionType))
      counts[r.type] = (counts[r.type] ?? 0) + 1;
  }
  return counts;
}

function getMyReaction(
  reactions: { user: { toString: () => string }; type: string }[],
  currentUserId: string | null
): string | null {
  if (!currentUserId) return null;
  const r = reactions.find((x) => x.user?.toString() === currentUserId);
  return r?.type ?? null;
}

export const getPostComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate("user", "username img")
    .sort({ createdAt: -1 })
    .lean();

  const clerkUserId = req.auth?.userId ?? null;
  let currentUserMongoId: string | null = null;
  if (clerkUserId) {
    const user = await User.findOne({ clerkUserId }).select("_id").lean();
    currentUserMongoId = user?._id?.toString() ?? null;
  }

  const payload = comments.map((c) => {
    const reactionCounts = toReactionCounts(c.reactions ?? []);
    const myReaction = getMyReaction(c.reactions ?? [], currentUserMongoId);
    const { reactions, ...rest } = c;
    return { ...rest, reactionCounts, myReaction };
  });

  res.json(payload);
};

export const addComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const postId = req.params.postId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const { desc, parentComment } = req.body;

  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (!parent) {
      res.status(404).json("Parent comment not found!");
      return;
    }
    if (parent.parentComment) {
      res
        .status(400)
        .json("Cannot reply to a reply — only one level of nesting allowed");
      return;
    }
  }

  const newComment = new Comment({
    desc,
    parentComment: parentComment || null,
    user: user._id,
    post: postId,
  });

  const savedComment = await newComment.save();

  res.status(201).json(savedComment);
};

export const deleteComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const id = req.params.id;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const role = await getUserRole(clerkUserId);

  if (role === "admin") {
    await Comment.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ parentComment: id });
    res.status(200).json("Comment has been deleted");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: id,
    user: user._id,
  });

  if (!deletedComment) {
    res.status(403).json("You can delete only your comment!");
    return;
  }

  await Comment.deleteMany({ parentComment: id });

  res.status(200).json("Comment deleted");
};

export const reactToComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const commentId = req.params.id;
  const { type } = req.body as { type?: string };

  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  if (!type || !REACTION_TYPES.includes(type as ReactionType)) {
    res
      .status(400)
      .json({ error: "Invalid reaction type. Use: like, love, laugh" });
    return;
  }

  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404).json({ error: "Comment not found!" });
    return;
  }

  const reactions = comment.reactions ?? [];
  const existingIndex = reactions.findIndex(
    (r) => r.user.toString() === user._id.toString()
  );

  if (existingIndex >= 0) {
    if (reactions[existingIndex].type === type) {
      comment.reactions.splice(existingIndex, 1);
    } else {
      comment.reactions[existingIndex].type = type as ReactionType;
    }
  } else {
    comment.reactions.push({ user: user._id, type: type as ReactionType });
  }

  await comment.save();

  const reactionCounts = toReactionCounts(comment.reactions);
  const myReaction = getMyReaction(comment.reactions, user._id.toString());

  res.status(200).json({
    reactionCounts,
    myReaction,
  });
};

import { Request, Response } from "express";
import Draft from "../models/draft.model.js";
import User from "../models/user.model.js";
import { getUserRole } from "../lib/getUserRole.js";

export const getDrafts = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  const role = await getUserRole(clerkUserId);
  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can access drafts!" });
    return;
  }
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }
  const drafts = await Draft.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .lean();
  res.status(200).json(drafts);
};

export const getDraft = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  const role = await getUserRole(clerkUserId);
  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can access drafts!" });
    return;
  }
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }
  const draft = await Draft.findOne({
    _id: req.params.id,
    user: user._id,
  }).lean();
  if (!draft) {
    res.status(404).json({ error: "Draft not found!" });
    return;
  }
  res.status(200).json(draft);
};

export const createDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  const role = await getUserRole(clerkUserId);
  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can create drafts!" });
    return;
  }
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }
  const draft = await Draft.create({
    user: user._id,
    title: req.body.title ?? "",
    category: req.body.category ?? "general",
    desc: req.body.desc ?? "",
    content: req.body.content ?? "",
    img: req.body.img ?? "",
  });
  res.status(201).json(draft);
};

export const updateDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  const role = await getUserRole(clerkUserId);
  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can update drafts!" });
    return;
  }
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }
  const draft = await Draft.findOneAndUpdate(
    { _id: req.params.id, user: user._id },
    {
      title: req.body.title ?? "",
      category: req.body.category ?? "general",
      desc: req.body.desc ?? "",
      content: req.body.content ?? "",
      img: req.body.img ?? "",
    },
    { new: true }
  );
  if (!draft) {
    res.status(404).json({ error: "Draft not found!" });
    return;
  }
  res.status(200).json(draft);
};

export const deleteDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated!" });
    return;
  }
  const role = await getUserRole(clerkUserId);
  if (role !== "admin") {
    res.status(403).json({ error: "Only admins can delete drafts!" });
    return;
  }
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: "User not found!" });
    return;
  }
  const deleted = await Draft.findOneAndDelete({
    _id: req.params.id,
    user: user._id,
  });
  if (!deleted) {
    res.status(404).json({ error: "Draft not found!" });
    return;
  }
  res.status(200).json({ message: "Draft deleted" });
};

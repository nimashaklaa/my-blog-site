import { Request, Response } from "express";
import { Types, FilterQuery, SortOrder } from "mongoose";
import Series, { ISeries } from "../models/series.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { getUserRole } from "../lib/getUserRole.js";

interface SeriesQuery {
  page?: string;
  limit?: string;
  cat?: string;
  tag?: string;
  search?: string;
  sort?: string;
}

const MAX_TAGS = 5;

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((t) => String(t).trim()).filter(Boolean))].slice(
    0,
    MAX_TAGS
  );
}

export const getSeries = async (
  req: Request<
    Record<string, string | string[]>,
    unknown,
    unknown,
    SeriesQuery
  >,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "10");

  const query: FilterQuery<ISeries> = {};

  const cat = req.query.cat;
  const tag = req.query.tag;
  const searchQuery = req.query.search;
  const sortQuery = req.query.sort;

  if (cat) {
    query.category = cat;
  }

  if (tag) {
    query.tags = tag;
  }

  if (searchQuery) {
    query.name = { $regex: searchQuery, $options: "i" };
  }

  let sortObj: Record<string, SortOrder> = { createdAt: -1 };

  if (sortQuery) {
    switch (sortQuery) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      default:
        break;
    }
  }

  const series = await Series.find(query)
    .populate("user", "username img")
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  // Add post count to each series
  const seriesWithCount = series.map((s) => {
    const seriesObj = s.toObject();
    return {
      ...seriesObj,
      postCount: s.posts.length,
    };
  });

  const totalSeries = await Series.countDocuments(query);
  const hasMore = page * limit < totalSeries;
  const totalPages = Math.ceil(totalSeries / limit);

  res.status(200).json({
    series: seriesWithCount,
    hasMore,
    totalSeries,
    totalPages,
    currentPage: page,
  });
};

export const getSeriesById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const series = await Series.findById(id)
    .populate("user", "username img")
    .populate({
      path: "posts.post",
      select: "title slug desc img category tags createdAt visit",
      populate: {
        path: "user",
        select: "username img",
      },
    });

  if (!series) {
    res.status(404).json("Series not found!");
    return;
  }

  const seriesObj = series.toObject();
  const response = {
    ...seriesObj,
    postCount: series.posts.length,
  };

  res.status(200).json(response);
};

export const getSeriesBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  const series = await Series.findOne({ slug: req.params.slug })
    .populate("user", "username img")
    .populate({
      path: "posts.post",
      select: "title slug desc img category tags createdAt visit",
      populate: {
        path: "user",
        select: "username img",
      },
    });

  if (!series) {
    res.status(404).json("Series not found!");
    return;
  }

  const seriesObj = series.toObject();
  const response = {
    ...seriesObj,
    postCount: series.posts.length,
  };

  res.status(200).json(response);
};

export const createSeries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      res.status(401).json("Not authenticated!");
      return;
    }

    // Check if user is admin - only admins can create series
    const role = await getUserRole(clerkUserId);

    if (role !== "admin") {
      res.status(403).json("Only admins can create series!");
      return;
    }

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      res.status(404).json("User not found!");
      return;
    }

    // Validate required fields
    if (
      !req.body.name ||
      typeof req.body.name !== "string" ||
      req.body.name.trim() === ""
    ) {
      res
        .status(400)
        .json({ error: "Name is required and must be a non-empty string" });
      return;
    }

    // Generate slug from name
    let slug = req.body.name.trim().replace(/ /g, "-").toLowerCase();
    // Remove special characters except hyphens
    slug = slug.replace(/[^a-z0-9-]/g, "");
    // Remove multiple consecutive hyphens
    slug = slug.replace(/-+/g, "-");
    // Remove leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, "");

    // Ensure slug is not empty
    if (!slug) {
      slug = "series";
    }

    // Check for existing series with the same slug
    let existingSeries = await Series.findOne({ slug });
    let counter = 2;

    while (existingSeries) {
      slug = `${slug}-${counter}`;
      existingSeries = await Series.findOne({ slug });
      counter++;
    }

    // Process posts array if provided
    const posts = Array.isArray(req.body.posts)
      ? req.body.posts.map((p: { post: string; order: number }) => ({
          post: new Types.ObjectId(p.post),
          order: p.order,
        }))
      : [];

    const newSeries = new Series({
      user: user._id,
      slug,
      name: req.body.name.trim(),
      category: req.body.category || "general",
      tags: normalizeTags(req.body.tags),
      desc: req.body.desc?.trim() || "",
      img: req.body.img || "",
      posts,
    });

    const series = await newSeries.save();

    // Update posts to reference this series
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.post);
      await Post.updateMany(
        { _id: { $in: postIds } },
        { $set: { series: series._id } }
      );
    }

    res.status(200).json(series);
  } catch (error: unknown) {
    console.error("Error creating series:", error);

    // Handle Mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError" &&
      "errors" in error &&
      typeof error.errors === "object" &&
      error.errors !== null
    ) {
      const errMap = error.errors as Record<string, { message?: string }>;
      const errors = Object.values(errMap).map(
        (err) => err.message || "Validation error"
      );
      res.status(400).json({ error: "Validation error", details: errors });
      return;
    }

    // Handle duplicate key errors
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(400).json({ error: "A series with this slug already exists" });
      return;
    }

    // Generic error
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to create series";

    res.status(500).json({
      error: errorMessage,
      message: errorMessage,
    });
  }
};

export const updateSeries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clerkUserId = req.auth?.userId;
    const seriesId = req.params.id;

    if (!clerkUserId) {
      res.status(401).json("Not authenticated!");
      return;
    }

    const role = await getUserRole(clerkUserId);
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      res.status(404).json("User not found!");
      return;
    }

    const series = await Series.findById(seriesId);

    if (!series) {
      res.status(404).json("Series not found!");
      return;
    }

    // Only the creator or an admin can edit
    const userId = user._id as Types.ObjectId;
    if (role !== "admin" && series.user.toString() !== userId.toString()) {
      res.status(403).json("You can only edit your own series!");
      return;
    }

    if (
      !req.body.name ||
      typeof req.body.name !== "string" ||
      req.body.name.trim() === ""
    ) {
      res
        .status(400)
        .json({ error: "Name is required and must be a non-empty string" });
      return;
    }

    // Get old posts to compare
    const oldPostIds = series.posts.map((p) => p.post.toString());

    series.name = req.body.name.trim();
    series.category = req.body.category || "general";
    series.tags = normalizeTags(req.body.tags);
    series.desc = req.body.desc?.trim() || "";
    series.img = req.body.img || "";

    // Update posts array if provided
    if (Array.isArray(req.body.posts)) {
      series.posts = req.body.posts.map(
        (p: { post: string; order: number }) => ({
          post: new Types.ObjectId(p.post),
          order: p.order,
        })
      );
    }

    const updatedSeries = await series.save();

    // Update post references
    const newPostIds = updatedSeries.posts.map((p) => p.post.toString());

    // Remove series reference from posts no longer in series
    const removedPostIds = oldPostIds.filter((id) => !newPostIds.includes(id));
    if (removedPostIds.length > 0) {
      await Post.updateMany(
        { _id: { $in: removedPostIds } },
        { $unset: { series: "" } }
      );
    }

    // Add series reference to new posts
    const addedPostIds = newPostIds.filter((id) => !oldPostIds.includes(id));
    if (addedPostIds.length > 0) {
      await Post.updateMany(
        { _id: { $in: addedPostIds } },
        { $set: { series: updatedSeries._id } }
      );
    }

    res.status(200).json(updatedSeries);
  } catch (error: unknown) {
    console.error("Error updating series:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to update series";

    res.status(500).json({
      error: errorMessage,
      message: errorMessage,
    });
  }
};

export const deleteSeries = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const role = await getUserRole(clerkUserId);

  if (role === "admin") {
    const series = await Series.findById(req.params.id);
    if (series) {
      // Remove series reference from all posts
      const postIds = series.posts.map((p) => p.post);
      await Post.updateMany(
        { _id: { $in: postIds } },
        { $unset: { series: "" } }
      );
    }
    await Series.findByIdAndDelete(req.params.id);
    res.status(200).json("Series has been deleted");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const series = await Series.findOne({
    _id: req.params.id,
    user: user._id,
  });

  if (!series) {
    res.status(403).json("You can delete only your series!");
    return;
  }

  // Remove series reference from all posts
  const postIds = series.posts.map((p) => p.post);
  await Post.updateMany({ _id: { $in: postIds } }, { $unset: { series: "" } });

  await Series.findByIdAndDelete(req.params.id);
  res.status(200).json("Series has been deleted");
};

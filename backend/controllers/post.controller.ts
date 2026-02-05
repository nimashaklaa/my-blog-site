import { Request, Response } from "express";
import ImageKit from "imagekit";
import { Types, FilterQuery, SortOrder } from "mongoose";
import Post, { IPost } from "../models/post.model.js";
import User from "../models/user.model.js";
import { getUserRole } from "../lib/getUserRole.js";

interface PostQuery {
  page?: string;
  limit?: string;
  cat?: string;
  author?: string;
  search?: string;
  sort?: string;
  featured?: string;
}

export const getPosts = async (
  req: Request<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    PostQuery
  >,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "2");

  const query: FilterQuery<IPost> = {};

  console.log(req.query);

  const cat = req.query.cat;
  const author = req.query.author;
  const searchQuery = req.query.search;
  const sortQuery = req.query.sort;
  const featured = req.query.featured;

  if (cat) {
    query.category = cat;
  }

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: "i" };
  }

  if (author) {
    const user = await User.findOne({ username: author }).select("_id");

    if (!user) {
      res.status(404).json("No post found!");
      return;
    }

    query.user = user._id;
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
      case "popular":
        sortObj = { visit: -1 };
        break;
      case "trending":
        sortObj = { visit: -1 };
        query.createdAt = {
          $gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        break;
    }
  }

  if (featured) {
    query.isFeatured = true;
  }

  const posts = await Post.find(query)
    .populate("user", "username")
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  const totalPosts = await Post.countDocuments();
  const hasMore = page * limit < totalPosts;

  res.status(200).json({ posts, hasMore });
};

export const getPost = async (req: Request, res: Response): Promise<void> => {
  const post = await Post.findOne({ slug: req.params.slug }).populate(
    "user",
    "username img"
  );

  if (!post) {
    res.status(404).json("Post not found!");
    return;
  }

  const postData = post.toObject();
  const clapsAsStrings = post.claps.map((clapId) => clapId.toString());

  let hasClapped = false;
  const clerkUserId = req.auth?.userId;
  if (clerkUserId) {
    const user = await User.findOne({ clerkUserId });
    if (user && user._id) {
      const userId = user._id as Types.ObjectId;
      hasClapped = post.claps.some(
        (clapUserId) => clapUserId.toString() === userId.toString()
      );
    }
  }

  // Create properly typed response object
  const response = {
    ...postData,
    claps: clapsAsStrings,
    clapCount: clapsAsStrings.length,
    hasClapped,
  };

  res.status(200).json(response);
};

export const createPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("createPost called");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Auth object:", req.auth);

    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      console.log("No clerkUserId found");
      res.status(401).json("Not authenticated!");
      return;
    }

    // Check if user is admin - only admins can create posts
    const role = await getUserRole(clerkUserId);

    if (role !== "admin") {
      res.status(403).json("Only admins can create posts!");
      return;
    }

    console.log("clerkUserId:", clerkUserId);

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      res.status(404).json("User not found!");
      return;
    }

    // Validate required fields
    if (
      !req.body.title ||
      typeof req.body.title !== "string" ||
      req.body.title.trim() === ""
    ) {
      res
        .status(400)
        .json({ error: "Title is required and must be a non-empty string" });
      return;
    }

    if (
      !req.body.content ||
      typeof req.body.content !== "string" ||
      req.body.content.trim() === ""
    ) {
      res
        .status(400)
        .json({ error: "Content is required and must be a non-empty string" });
      return;
    }

    // Generate slug from title
    let slug = req.body.title.trim().replace(/ /g, "-").toLowerCase();
    // Remove special characters except hyphens
    slug = slug.replace(/[^a-z0-9-]/g, "");
    // Remove multiple consecutive hyphens
    slug = slug.replace(/-+/g, "-");
    // Remove leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, "");

    // Ensure slug is not empty
    if (!slug) {
      slug = "post";
    }

    // Check for existing posts with the same slug
    let existingPost = await Post.findOne({ slug });
    let counter = 2;

    while (existingPost) {
      slug = `${slug}-${counter}`;
      existingPost = await Post.findOne({ slug });
      counter++;
    }

    const newPost = new Post({
      user: user._id,
      slug,
      title: req.body.title.trim(),
      category: req.body.category || "general",
      desc: req.body.desc?.trim() || "",
      content: req.body.content.trim(),
      img: req.body.img || "",
    });

    const post = await newPost.save();
    res.status(200).json(post);
  } catch (error: unknown) {
    console.error("Error creating post:", error);

    // Handle Mongoose validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError" &&
      "errors" in error &&
      typeof error.errors === "object"
    ) {
      const errors = Object.values(error.errors).map(
        (err: { message?: string }) => err.message || "Validation error"
      );
      res.status(400).json({ error: "Validation error", details: errors });
      return;
    }

    // Handle duplicate key errors (e.g., duplicate slug)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(400).json({ error: "A post with this slug already exists" });
      return;
    }

    // Generic error
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to create post";
    const errorStack =
      error instanceof Error && process.env.NODE_ENV === "development"
        ? error.stack
        : undefined;

    console.error("Full error details:", {
      error,
      message: errorMessage,
      stack: errorStack,
    });
    res.status(500).json({
      error: errorMessage,
      message: errorMessage,
      details: errorStack,
    });
  }
};

export const deletePost = async (
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
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json("Post has been deleted");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const deletedPost = await Post.findOneAndDelete({
    _id: req.params.id,
    user: user._id,
  });

  if (!deletedPost) {
    res.status(403).json("You can delete only your posts!");
    return;
  }

  res.status(200).json("Post has been deleted");
};

export const featurePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const role = await getUserRole(clerkUserId);

  if (role !== "admin") {
    res.status(403).json("You cannot feature posts!");
    return;
  }

  const post = await Post.findById(postId);

  if (!post) {
    res.status(404).json("Post not found!");
    return;
  }

  const isFeatured = post.isFeatured;

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      isFeatured: !isFeatured,
    },
    { new: true }
  );

  res.status(200).json(updatedPost);
};

export const toggleClap = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("toggleClap called - Route hit!");
  console.log("Request params:", req.params);
  console.log("Request method:", req.method);
  console.log("Request path:", req.path);

  const clerkUserId = req.auth?.userId;
  const postId = req.params.id;

  console.log("Post ID:", postId);
  console.log("Clerk User ID:", clerkUserId);

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  const post = await Post.findById(postId);

  if (!post) {
    res.status(404).json("Post not found!");
    return;
  }

  const userId = user._id as Types.ObjectId;
  const clapIndex = post.claps.findIndex(
    (clapUserId) => clapUserId.toString() === userId.toString()
  );

  if (clapIndex === -1) {
    // Add clap
    post.claps.push(userId);
  } else {
    // Remove clap
    post.claps.splice(clapIndex, 1);
  }

  const updatedPost = await post.save();
  res
    .status(200)
    .json({ claps: updatedPost.claps, clapCount: updatedPost.claps.length });
};

// Lazy-load ImageKit only when needed
const getImageKit = (): ImageKit => {
  const urlEndpoint = process.env.IK_URL_ENDPOINT;
  const publicKey = process.env.IK_PUBLIC_KEY;
  const privateKey = process.env.IK_PRIVATE_KEY;

  if (!urlEndpoint || !publicKey || !privateKey) {
    throw new Error(
      "ImageKit is not configured. Please set IK_URL_ENDPOINT, IK_PUBLIC_KEY, and IK_PRIVATE_KEY environment variables."
    );
  }

  return new ImageKit({
    urlEndpoint,
    publicKey,
    privateKey,
  });
};

export const uploadAuth = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const imagekit = getImageKit();
    const result = imagekit.getAuthenticationParameters();
    res.json(result);
  } catch (error: unknown) {
    console.error("ImageKit upload auth error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "ImageKit configuration error";
    res.status(500).json({
      error: errorMessage,
      message: errorMessage,
    });
  }
};

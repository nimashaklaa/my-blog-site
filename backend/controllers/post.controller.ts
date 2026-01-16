import { Request, Response } from "express";
import ImageKit from "imagekit";
import Post from "../models/post.model";
import User from "../models/user.model";

interface PostQuery {
  page?: string;
  limit?: string;
  cat?: string;
  author?: string;
  search?: string;
  sort?: string;
  featured?: string;
}

export const getPosts = async (req: Request<{}, {}, {}, PostQuery>, res: Response): Promise<void> => {
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "2");

  const query: any = {};

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

  let sortObj: any = { createdAt: -1 };

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
  res.status(200).json(post);
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;

  console.log(req.headers);

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const user = await User.findOne({ clerkUserId });

  if (!user) {
    res.status(404).json("User not found!");
    return;
  }

  let slug = req.body.title.replace(/ /g, "-").toLowerCase();

  let existingPost = await Post.findOne({ slug });

  let counter = 2;

  while (existingPost) {
    slug = `${slug}-${counter}`;
    existingPost = await Post.findOne({ slug });
    counter++;
  }

  const newPost = new Post({ user: user._id, slug, ...req.body });

  const post = await newPost.save();
  res.status(200).json(post);
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const role = req.auth?.sessionClaims?.metadata?.role || "user";

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

export const featurePost = async (req: Request, res: Response): Promise<void> => {
  const clerkUserId = req.auth?.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    res.status(401).json("Not authenticated!");
    return;
  }

  const role = req.auth?.sessionClaims?.metadata?.role || "user";

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

const imagekit = new ImageKit({
  urlEndpoint: process.env.IK_URL_ENDPOINT!,
  publicKey: process.env.IK_PUBLIC_KEY!,
  privateKey: process.env.IK_PRIVATE_KEY!,
});

export const uploadAuth = async (_req: Request, res: Response): Promise<void> => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
};


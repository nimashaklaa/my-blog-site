import { Request, Response } from "express";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { Webhook } from "svix";

interface ClerkEvent {
  type: string;
  data: {
    id: string;
    username?: string;
    email_addresses: Array<{ email_address: string }>;
    profile_image_url?: string;
    image_url?: string;
  };
}

export const clerkWebHook = async (req: Request, res: Response): Promise<void> => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Webhook secret needed!");
  }

  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkEvent | undefined;
  
  try {
    evt = wh.verify(payload, headers as Record<string, string>) as ClerkEvent;
  } catch (err) {
    res.status(400).json({
      message: "Webhook verification failed!",
    });
    return;
  }

  // console.log(evt.data);

  if (evt.type === "user.created") {
    console.log("Webhook received: user.created for", evt.data.id);
    const newUser = new User({
      clerkUserId: evt.data.id,
      username: evt.data.username || evt.data.email_addresses[0].email_address,
      email: evt.data.email_addresses[0].email_address,
      img: evt.data.image_url || evt.data.profile_image_url,
    });

    await newUser.save();
    console.log("User saved to database:", newUser.email);
  }

  if (evt.type === "user.deleted") {
    const deletedUser = await User.findOneAndDelete({
      clerkUserId: evt.data.id,
    });

    if (deletedUser) {
      await Post.deleteMany({ user: deletedUser._id });
      await Comment.deleteMany({ user: deletedUser._id });
    }
  }

  res.status(200).json({
    message: "Webhook received",
  });
};


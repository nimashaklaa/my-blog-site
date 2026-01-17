import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  clerkUserId: string;
  username: string;
  email: string;
  img?: string;
  savedPosts: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    img: {
      type: String,
    },
    savedPosts: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default model<IUser>("User", userSchema);

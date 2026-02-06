import { Schema, model, Document, Types } from "mongoose";

export type ReactionType =
  | "like"
  | "love"
  | "laugh"
  | "celebrate"
  | "care"
  | "insightful";

export interface IReaction {
  user: Types.ObjectId;
  type: ReactionType;
}

export interface IComment extends Document {
  user: Types.ObjectId;
  post: Types.ObjectId;
  desc: string;
  parentComment?: Types.ObjectId | null;
  reactions: IReaction[];
  createdAt?: Date;
  updatedAt?: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: ["like", "love", "laugh", "celebrate", "care", "insightful"],
    },
  },
  { _id: false }
);

const commentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default model<IComment>("Comment", commentSchema);

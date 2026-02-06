import { Schema, model, Document, Types } from "mongoose";

export interface IPost extends Document {
  user: Types.ObjectId;
  img?: string;
  title: string;
  slug: string;
  desc?: string;
  category: string;
  tags: string[];
  content: string;
  isFeatured: boolean;
  visit: number;
  claps: Types.ObjectId[]; // Array of user IDs who clapped
  createdAt?: Date;
  updatedAt?: Date;
}

const postSchema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    img: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    desc: {
      type: String,
    },
    category: {
      type: String,
      default: "general",
    },
    tags: {
      type: [String],
      default: [],
    },
    content: {
      type: String,
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    visit: {
      type: Number,
      default: 0,
    },
    claps: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true }
);

export default model<IPost>("Post", postSchema);

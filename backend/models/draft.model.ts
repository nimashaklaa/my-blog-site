import { Schema, model, Document, Types } from "mongoose";

export interface IDraft extends Document {
  user: Types.ObjectId;
  title: string;
  category: string;
  desc?: string;
  content: string;
  img?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const draftSchema = new Schema<IDraft>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "general",
    },
    desc: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    img: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default model<IDraft>("Draft", draftSchema);

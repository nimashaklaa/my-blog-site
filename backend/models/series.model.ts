import { Schema, model, Document, Types } from "mongoose";

export interface ISeries extends Document {
  user: Types.ObjectId;
  name: string;
  slug: string;
  desc?: string;
  img?: string;
  category: string;
  tags: string[];
  posts: Array<{
    post: Types.ObjectId;
    order: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const seriesSchema = new Schema<ISeries>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    desc: {
      type: String,
    },
    img: {
      type: String,
    },
    category: {
      type: String,
      default: "general",
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 5;
        },
        message: "A series can have at most 5 tags",
      },
    },
    posts: [
      {
        post: {
          type: Schema.Types.ObjectId,
          ref: "Post",
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        _id: false, // Disable _id for subdocuments
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries
seriesSchema.index({ slug: 1 });
seriesSchema.index({ category: 1 });
seriesSchema.index({ tags: 1 });
seriesSchema.index({ user: 1 });

export default model<ISeries>("Series", seriesSchema);

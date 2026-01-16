import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO) {
      throw new Error("MONGO environment variable is not set");
    }
    await mongoose.connect(process.env.MONGO);
    console.log("MongoDB is connected");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

export default connectDB;


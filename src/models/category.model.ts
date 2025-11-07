import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  price: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);

import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  user_id: string; // Internal unique identifier
  name: string;
  email?: string;
  password: string;
  role: "Admin" | "Employee" | "Accountant";
  company_id: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    user_id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          if (["Admin", "Accountant"].includes(this.role)) {
            return !!value;
          }
          return true; // optional for Employee
        },
        message: "Email is required for Admin or Accountant",
      },
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Employee", "Accountant"],
      default: "Employee",
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// 🔒 Pre-save hook to hash password & generate user_id
userSchema.pre("save", async function (next) {
  // Hash password if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Auto-generate user_id if missing
  if (!this.user_id) {
    const prefix = this.role === "Employee" ? "EMP" : "USR";
    const randomNum = Math.floor(Math.random() * 10000);
    this.user_id = `${prefix}-${randomNum.toString().padStart(4, "0")}`;
  }

  next();
});

// 🔑 Method to compare password during login
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);

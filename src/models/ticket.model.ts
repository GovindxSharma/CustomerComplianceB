import mongoose, { Document, Schema, Types } from "mongoose";

// export interface ITicketComment {
//   user: mongoose.Schema.Types.ObjectId;
//   message: string;
//   timestamp: Date;
// }

// export interface ITicket extends Document {
//   company_id: mongoose.Schema.Types.ObjectId;
//   title: string;
//   description?: string;
//   priority: "Low" | "Medium" | "High" | "Urgent";
//   status: "Open" | "In Progress" | "Resolved" | "Closed";
//   raisedBy: mongoose.Schema.Types.ObjectId;
//   assignedTo?: mongoose.Schema.Types.ObjectId;
//   relatedClient?: mongoose.Schema.Types.ObjectId;
//   comments?: ITicketComment[];
//   isResolvedBy?: mongoose.Schema.Types.ObjectId;
//   resolvedAt?: Date;
//   createdAt?: Date;
//   updatedAt?: Date;
// }

export interface IUserLean {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  role?: string;
}

export interface ITicketComment {
  user: Types.ObjectId | IUserLean;
  message: string;
  timestamp: Date;
}

export interface ITicket extends Document {
  company_id: Types.ObjectId;

  title: string;
  description?: string;

  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";

  raisedBy: Types.ObjectId | IUserLean;
  assignedTo?: Types.ObjectId | IUserLean;
  relatedClient?: Types.ObjectId;

  comments?: ITicketComment[];

  isResolvedBy?: Types.ObjectId | IUserLean;
  resolvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const ticketCommentSchema = new Schema<ITicketComment>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Low",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    relatedClient: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    comments: [ticketCommentSchema],
    isResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);

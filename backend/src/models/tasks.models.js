import mongoose, { Schema } from "mongoose";

const TasksSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    asignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Task=mongoose.model("Task",TasksSchema)
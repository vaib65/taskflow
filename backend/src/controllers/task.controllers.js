import mongoose from "mongoose";
import { Task } from "../models/tasks.models.js";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

{/*createTask controller */}
const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, status, assignee, dueDate } = req.body;

  const { projectId } = req.params;

  const userId = req.user?._id;

  if (!title) {
    throw new ApiError(400, "Task title is required");
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new ApiError(
      403,
      "You are not allowed to create tasks in this project"
    );
  }

  if (assignee) {
    if (!mongoose.Types.ObjectId.isValid(assignee)) {
      throw new ApiError(400, "Invalid assignee id");
    }

    const isAssigneeMember = project.members.some(
      (memberId) => memberId.toString() === assignee.toString()
    );

    if (!isAssigneeMember) {
      throw new ApiError(400, "Assignee must be a project member");
    }
  }

  const task = await Task.create({
    title,
    description,
    priority,
    status,
    project: projectId,
    assignee: assignee || null,
    createdBy: userId,
    dueDate,
  });

  const populatedTask = await Task.findById(task._id)
    .populate("assignee", "username email")
    .populate("createdBy", "username email");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedTask, "Task created successfully"));
});

{
  /*getTasksByProject controller */
}
const getTasksByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );
  if (!isMember) {
    throw new ApiError(
      403,
      "You are not allowed to view tasks of this project"
    );
  }

  const tasks = await Task.find({ project: projectId })
    .sort({ createdAt: -1 })
    .populate("assignee", "username email")
    .populate("createdBy", "username email");

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

{
  /*updateTask controller */
}
const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const userId = req.user?._id;
  const { title, description, status, priority, assignee, dueDate } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    throw new ApiError(400, "Invalid id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "Not authorized to update tasks in this project");
  }

  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");

  if (assignee) {
    if (!mongoose.Types.ObjectId.isValid(assignee)) {
      throw new ApiError(400, "Invalid assignee id");
    }

    const isAssigneeMember = project.members.some(
      (memberId) => memberId.toString() === assignee.toString()
    );

    if (!isAssigneeMember) {
      throw new ApiError(400, "Assignee must be project member");
    }
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (assignee !== undefined) task.assignee = assignee;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();

 const updatedTask = await Task.findById(task._id)
   .populate("assignee", "username email")
   .populate("createdBy", "username email");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

{
  /*deleteTask controller */
}
const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const userId = req.user?._id;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    throw new ApiError(400, "Invalid id");
  }

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "Not authorized to delete tasks in this project");
  }

  const task = await Task.findOneAndDelete({ _id: taskId, project: projectId });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
});

export { createTask, getTasksByProject, updateTask, deleteTask };

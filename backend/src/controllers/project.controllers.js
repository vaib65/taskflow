import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

import { asyncHandler } from "../utils/async-handler.js";

const createProject = asyncHandler(async (req, res) => {
  const { project_name, description } = req.body;
  if (!project_name) {
    throw new ApiError(400, "Project name is required");
  }

  const ownerId = req.user?._id;
  if (!ownerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const project = await Project.create({
    project_name,
    description,
    owner: ownerId,
    members: [ownerId],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const getMyProjects = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  const myProjects = await Project.find({ members: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "username email")
    .populate("members", "username email");

  return res
    .status(200)
    .json(new ApiResponse(200, myProjects, "Project fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId)
    .populate("owner", "username email")
    .populate("members", "username email");
  
  if (!project) {
    throw new ApiError(404,"Project not found")
  }

  const isMember = project.members.some((member) => member._id.toString() == userId.toString());

  if (!isMember) {
     throw new ApiError(403, "You do not have access to this project");
  }

   return res
     .status(200)
     .json(new ApiResponse(200, project, "Project fetched successfully"));
});

export { createProject, getMyProjects, getProjectById };

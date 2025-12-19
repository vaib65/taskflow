import { Router } from "express";
import { createProject, getMyProjects, getProjectById } from "../controllers/project.controllers.js"
import { authMiddleware } from "../middlewares/auth.middlewares.js";

const projectRouter = Router();

projectRouter.use(authMiddleware);

projectRouter.post("/", createProject);
projectRouter.get("/", getMyProjects);
projectRouter.get("/:id", getProjectById);

export default projectRouter;
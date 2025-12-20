import { Router } from "express"
import { authMiddleware } from "../middlewares/auth.middlewares.js"
import { createTask, deleteTask, getTasksByProject, updateTask } from "../controllers/task.controllers";

const taskRouter = Router();

taskRouter.use(authMiddleware);

taskRouter.post("/projects/:projectId/tasks",createTask)
taskRouter.get("/projects/:projectId/tasks",getTasksByProject)
taskRouter.patch("/projects/:projectId/tasks/:taskId",updateTask)
taskRouter.delete("/projects/:projectId/tasks/:taskId", deleteTask)

export default taskRouter;
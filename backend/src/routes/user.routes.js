import {Router} from "express"
import { authMiddleware } from "../middlewares/auth.middlewares.js"
import { refreshToken,registerUser, loginUser, getCurrentUser,logoutUser } from "../controllers/user.controllers.js"

const userRouter = Router();

userRouter.post("/register",registerUser)
userRouter.post("/login", loginUser);
userRouter.get("/me", authMiddleware, getCurrentUser);

// refresh and logout
userRouter.post("/refresh", refreshToken);
userRouter.post("/logout", logoutUser);

export default userRouter;
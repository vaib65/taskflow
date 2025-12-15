import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const tokenFromCookie = req.cookies?.accessToken;

    const token = tokenFromHeader || tokenFromCookie;
    if (!token) {
      throw new ApiError(401, "Unauthorized: no token provided");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new ApiError(401, "Access token expired"));
      }
      return next(new ApiError(401, "Invalid access token"));
    }

    if (!payload || !payload.id) {
      return next(new ApiError(401, "Invalid token payload"));
    }

    // find user and exclude sensitive fields
    const user = await User.findById(payload.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return next(new ApiError(401, "Unauthorized: user not found"));
    }

    // attach user to request
    req.user = user;
    return next();
  } catch (err) {
      return next(err);
  }
};

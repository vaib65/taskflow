import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const parseExpiryToMs = (expiry) => {
  if (!expiry) {
    return undefined;
  }

  if (/^\d+$/.test(expiry)) {
    return Number(expiry);
  }

  const m = expiry.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!m) {
    return undefined;
  }

  const n = Number(m[1]);
  const u = m[2];

  switch (u) {
    case "ms":
      return n;
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "user not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // persist refresh token so we can validate/rotate later
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("generateAccessAndRefreshToken error:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating access token"
    );
  }
};

const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenFromCookie = req.cookies?.refreshToken;

  if (!refreshTokenFromCookie) {
    throw new ApiError(401, "No refresh token provided");
  }

  let payload;
  try {
    payload = jwt.verify(
      refreshTokenFromCookie,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token expired");
    }
    throw new ApiError(401, "Invalid refresh token");
  }

  // find user and verify refresh token matches stored value
  if (!payload || !payload.id) {
    throw new ApiError(401, "Invalid refresh token payload");
  }

  // find user and verify refresh token matches stored value
  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(404, "User not found");

  // If stored refreshToken is missing or doesn't match, reject
  if (!user.refreshToken || user.refreshToken !== refreshTokenFromCookie) {
    // Possible stolen token or user logged out — reject
    throw new ApiError(401, "Refresh token mismatch");
  }

  // Rotate tokens: generate new access and new refresh token, persist refresh token
  const accessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  // cookie options (align expiry with envs)
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptionsAccess = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: parseExpiryToMs(process.env.ACCESS_TOKEN_EXPIRY || "15m"),
  };
  const cookieOptionsRefresh = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: parseExpiryToMs(process.env.REFRESH_TOKEN_EXPIRY || "7d"),
  };

  // set rotated cookies
  res
    .cookie("accessToken", accessToken, cookieOptionsAccess)
    .cookie("refreshToken", newRefreshToken, cookieOptionsRefresh)
    .status(200)
    .json(new ApiResponse(200, { accessToken }, "Token refreshed"));
});

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new ApiError(400, "username , email , password are required");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(409, "User with that email already exists");
  }

  const user = await User.create({
    username,
    email,
    password,
  });

  // generate tokens and save refreshToken on user
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong registering user");
  }

  // cookie options
  const isProd = process.env.NODE_ENV === "production";
   const cookieOptionsAccess = {
     httpOnly: true,
     secure: isProd,
     sameSite: isProd ? "None" : "Lax",
     maxAge: parseExpiryToMs(process.env.ACCESS_TOKEN_EXPIRY || "15m"),
   };
   const cookieOptionsRefresh = {
     httpOnly: true,
     secure: isProd,
     sameSite: isProd ? "None" : "Lax",
     maxAge: parseExpiryToMs(process.env.REFRESH_TOKEN_EXPIRY || "7d"),
   };

  // set cookies (access + refresh)
  return res
    .cookie("accessToken", accessToken, cookieOptionsAccess)
    .cookie("refreshToken", refreshToken, cookieOptionsRefresh)
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        "User registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "email and password is required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const isProd = process.env.NODE_ENV === "production";
   const cookieOptionsAccess = {
     httpOnly: true,
     secure: isProd,
     sameSite: isProd ? "None" : "Lax",
     maxAge: parseExpiryToMs(process.env.ACCESS_TOKEN_EXPIRY || "15m"),
   };
   const cookieOptionsRefresh = {
     httpOnly: true,
     secure: isProd,
     sameSite: isProd ? "None" : "Lax",
     maxAge: parseExpiryToMs(process.env.REFRESH_TOKEN_EXPIRY || "7d"),
   };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptionsAccess)
    .cookie("refreshToken", refreshToken, cookieOptionsRefresh)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser },
        "User logged in successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  // req.user is already sanitized by middleware
  return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "User fetched"));
});


const logoutUser = asyncHandler(async (req, res) => {
  const refreshTokenFromCookie = req.cookies?.refreshToken;
  
  if (refreshTokenFromCookie) {
    try {
      const payload = jwt.verify(refreshTokenFromCookie, process.env.REFRESH_TOKEN_SECRET)
      
      if (payload && payload.id) {
        const user = await User.findById(payload.id);
        if (user) {
          user.refreshToken = undefined;
          await user.save({validateBeforeSave:false})
        }
      }
    } catch (e) {
      //ignore
    }
  }

  //clear cookies on Client
  const isProd = process.env.NODE_ENV === "production";
  const clearOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  };

  res
    .clearCookie("accessToken", clearOpts)
    .clearCookie("refreshToken", clearOpts)
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
})
export { refreshToken,registerUser, loginUser, getCurrentUser,logoutUser };

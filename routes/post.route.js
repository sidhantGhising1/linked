import { Router } from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getFeedPosts,
  createPost,
  deletePost,
  getPostById,
  createComment,
} from "../controllers/post.controller.js";

const router = Router();

router.get("/", protectRoute, getFeedPosts);
router.post("/create", protectRoute, createPost);
router.delete("/delete/:id", protectRoute, deletePost);
router.get("/:id", protectRoute, getPostById);
router.post("/:id/comment", protectRoute, createComment);

export default router;

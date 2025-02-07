import { Router } from "express";
import {
  signUp,
  logIn,
  logOut,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/logout", logOut);

router.get("/me", protectRoute, getCurrentUser);

export default router;

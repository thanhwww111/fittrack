import { Router } from "express";
import * as foodController from "../controllers/food.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { createFoodSchema, updateFoodSchema } from "../schemas/food.schema";

const router = Router();

router.use(authenticate);

router.get("/", foodController.listFoods);
// Đặt trước /:id để "recent" không bị hiểu là id
router.get("/recent", foodController.listRecentFoods);
router.get("/favorites", foodController.listFavoriteFoods);
router.get("/:id", foodController.getFood);
router.post("/", validateBody(createFoodSchema), foodController.createFood);
router.put("/:id", validateBody(updateFoodSchema), foodController.updateFood);
router.delete("/:id", foodController.deleteFood);
router.put("/:id/favorite", foodController.addFavoriteFood);
router.delete("/:id/favorite", foodController.removeFavoriteFood);

export default router;

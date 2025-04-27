const express = require("express");
const { addFavouritesItem,deleteFavouritesItem,getFavouritesItem } = require("../favouriteControllers");
const router = express.Router();
router.post("/addItemOnFav", addFavouritesItem);
router.get("/getFavItems",getFavouritesItem)
router.delete("/deleteFavItem",deleteFavouritesItem)
module.exports = router;

const express = require("express");
const router = express.Router();
const { createProduct, getProducts, getproduct, deleteProduct, updateProduct } = require("../controllers/productController");
const protect = require("../middleWare/authMiddleware");
const { upload } = require("../utils/fileUpload");




router.post("/",protect,upload.single("image"),createProduct);
router.patch("/:id",protect,upload.single("image"),updateProduct);
router.get("/",protect,getProducts);
router.get("/:id",protect,getproduct);
router.delete("/:id",protect,deleteProduct);






module.exports = router;

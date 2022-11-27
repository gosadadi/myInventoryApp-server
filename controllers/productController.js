const asyncHandler = require("express-async-handler");
const Product = require("../models/productsModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const cloudinary = require("cloudinary").v2;


// =======create product=========
const createProduct = asyncHandler (async (req, res) =>{ 
    const {name, sku, category, quantity,price, description} = req.body

    // ========validation=====
    if(!name || !category || !quantity || !price || !description){
        res.status(400)
        throw new Error("Please fill in all fileds")
    }
    // ===handle image upload=======
    let fileData = {}
    if(req.file){
    // ===save image to cloudinary=====
    let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {folder: "inventoryApp", resource_type: "image"})
        } catch (error) {
            res.status(500)
            throw new Error("Image could not be uploaded")
        }
        fileData = {
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.file.mimetype,
            fileSize:fileSizeFormatter(req.file.size, 2)
        };
    }
    // =======create product======
    const product = await Product.create({
        user: req.user.id,
        name,
        sku,
        category,
        quantity,
        price,
        description,
        image: fileData
    })
    res.status(201).json(product);
});
// =====get all products=======
const getProducts = asyncHandler( async (req, res) =>{
    const products = await Product.find({user: req.user.id}).sort("-createdAt")
    res.status(200).json(products)
});
// ====get single product=====
const getproduct = asyncHandler(async (req, res) =>{
    const product = await Product.findById(req.params.id);
    // ======if product does not exist=====
    if(!product){
        res.status(404)
        throw new Error("Product is not found");
    }
    // ======match product to user=====
    if  (product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error("User is not authorized");
    }
    res.status(200).json(product)
});
// =====delete product=====
const deleteProduct = asyncHandler (async (req, res) =>{
    const product = await Product.findById(req.params.id);
    // ======if product does not exist=====
    if(!product){
        res.status(404)
        throw new Error("Product is not found");
    }
    // ======match product to user=====
    if  (product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error("User is not authorized");
    }
    await product.remove()
    res.status(200).json({message: "product deleted successfully"})
})

// ======update product======

const updateProduct = asyncHandler(async (req, res)=>{

    const {name, sku, category, quantity,price, description} = req.body
    const {id} =req.params
    const product = await Product.findById(id)
    // =====if product does not exist=====
    if(!product){
        res.status(404)
        throw new Error("Product is not found");
        }
    // ======match product to user=====
    if  (product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error("User is not authorized");
    }
        // ===handle image upload=======
        let fileData = {}
        if(req.file){
        // ===save image to cloudinary=====
        let uploadedFile;
            try {
                uploadedFile = await cloudinary.uploader.upload(req.file.path, {folder: "inventoryApp", resource_type: "image"})
            } catch (error) {
                res.status(500)
                throw new Error("Image could not be uploaded")
            }
            fileData = {
                fileName: req.file.originalname,
                filePath: uploadedFile.secure_url,
                fileType: req.file.mimetype,
                fileSize:fileSizeFormatter(req.file.size, 2)
            };
        }
        // =======update product======
        const updatedProduct = await Product.findByIdAndUpdate(
            {_id:id},
            {
                name,
                category,
                quantity,
                price,
                description,
                image:Object.keys(fileData).length ===0 ? product?.image: fileData 
            },
            {
                new : true,
                runValidators: true
            });
        res.status(201).json(updatedProduct);
    });

module.exports = {
    createProduct,
    getProducts,
    getproduct,
    deleteProduct,
    updateProduct
}
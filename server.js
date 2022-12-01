const dotenv=require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors=require('cors');
const express=require("express");
const mongoose=require("mongoose");
const bodyParser = require("body-parser");
const userRoute=require("./routes/userRoute");
const contactRoute=require("./routes/contactRoute");
const errorHandler = require("./middleWare/errorMiddleWare");
const app=express();
const productRoute=require("./routes/productRoute");
const path = require("path");

// =======middleware===========
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cors({
    origin: ["http://localhost:3000", "https://inventory-app.vercel.app","https://inventory-app-delta-livid.vercel.app"],
    credentials: true
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======route middleware======
app.use("/api/users", userRoute)
app.use("/api/products", productRoute)
app.use("/api/contactus", contactRoute)
// ======error Middleware
app.use(errorHandler);
const PORT = process.env.PORT || 8000
// =====connect to db and start server=====
mongoose
    .connect(process.env.MONGO_URI)
    .then(()=>{
        app.listen(PORT,()=>{
            console.log(`Server is fired up on port ${PORT}`)
        });
    })
    .catch((err)=>{
        console.log(err)
    })











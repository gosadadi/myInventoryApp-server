const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");


const generateToken = (id) => {  
    return jwt.sign({id},process.env.JWT_SECRET, {expiresIn: "1d"})
};

// =====register user=======

const registerUser = asyncHandler( async (req, res) => {
    const {name, email, password} = req.body
    //=====validation====
    if(!name || !email || !password){
        res.status(400)
        throw new Error("Please fill in all required fields")
    }
    if (password.length < 6){
        res.status(400)
        throw new Error("Password must be at least 6 characters ")
    }
    // =====check if user already exist in db====
    const userExists = await User.findOne({email})
    if (userExists) {
        res.status(400)
        throw new Error("Invalid password or email")
    }
    // ======create user==========
    const user = await User.create({
        name,
        email,
        password 
    });
    // ====generate a toke=====
    const token = generateToken(user._id);

    // =====send HTTP-only cookie======
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400),
        sameSite: "none", 
        secure: true
    });
    if (user) {
        const {_id, 
            name, 
            email, 
            photo,
            phone, 
            bio,
            } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio,token
        });
    } else{
        res.status(400)
        throw new Error("Invalid user data")
    }

});
// =======login user=======
const loginUser= asyncHandler(  async (req, res)=> {
    const {email, password} = req.body
    // ===validate request====
    if(!email || !password){
        res.status(400)
        throw new Error("Please add email and password");
    }
    // =====check if user exist====

    const user = await User.findOne({email})
    if(!user){
        res.status(400)
        throw new Error("User not found, please signup");
    }
    // =====check if password correct====

    const passwordIsCorrect = await bcrypt.compare(password, user.password)
    // ====generate a toke=====
    const token = generateToken(user._id);

    // =====send HTTP-only cookie======
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400),
        sameSite: "none", 
        secure: true
    });
    if (user && passwordIsCorrect) {
        const {_id, name, email,photo,phone, bio} = user
        res.status(200).json({
            _id, 
            name, 
            email, 
            photo, 
            phone, 
            bio,
            token
        });
    } else{
        res.status(400)
        throw new Error("Invalid email or password");
    }
}); 

// =======logout======

const logoutUser =  asyncHandler(async (re,res)=>{
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0),
        sameSite: "none", 
        secure: true
    });
    return res.status(200).json({message: "Logout success!"})
});

// ====get user profile======
const getUser = asyncHandler( async (req,res) =>{
    const user = await User.findById(req.user._id)
    if (user) {
        const {_id, name, email, photo,phone, bio} = user;
        res.status(200).json({_id, name, email, photo, phone, bio});
    } else{
        res.status(400)
        throw new Error("user not found")
    }
    
});
// ======login status========
const loginStatus = asyncHandler(async (req, res) =>{
    const token = req.cookies.token;
    if(!token){
        return res.json(false)
    }
      // ======verify token========
    const verified =jwt.verify(token, process.env.JWT_SECRET)
    if(verified){
        return res.json(true);
    }
    res.json(false)
});
// =====update user=============

const updateUser = asyncHandler(async (req, res) =>{
    const user = await User.findById(req.user._id)

    if(user){
        const { name, email, photo,phone, bio} = user;
        user.email = email;
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;
        user.photo = req.body.photo || photo;

        const updatedUser = await user.save();
        res.status(200).json({
            name:updatedUser.name, 
            email:updatedUser.email, 
            photo:updatedUser.photo, 
            phone:updatedUser.phone, 
            bio:updatedUser.bio
        })

    } else {
        res.status(4040)
        throw new Error("User is not found");
    }
});

// =====change password====

const changePassword =asyncHandler(async (req, res)=>{
    const user = await User.findById(req.user._id);

    const {oldPassword, password} = req.body
    // ======validate=====
    if(!user){
        res.status(400);
        throw new Error("user not found, please signup")
    }

    if(!oldPassword || !password){
        res.status(400);
        throw new Error("Please add old and new password")
    }

    // =====match old password match====
    const passwordIsCorrect = await  bcrypt.compare(oldPassword, user.password)
    // =====save new password====
    if(user && passwordIsCorrect) {
        user.password = password;
        await user.save()
        res.status(200).send("Password change successful")
    }
    else{
        res.status(400);
        throw new Error("old password is incorrect");
    }
});
// =====forgot password======
const forgotPassword = asyncHandler( async(req, res) =>{
    const { email}= req.body
    const user = await User.findOne({email})
    if(!user){
        res.status(404)
        throw new Error("User does not exist")
    }
    // ========delete token if already exists=====
    let token = await Token.findOne({userId: user._id})
    if(token){
        await token.deleteOne()
    }
    // =====create reset token=====
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    console.log(resetToken);
    // =====hash token======
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    // ======save  token to db=====
    await new Token({
        userId:user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60*1000)
    }).save()
    // =======construct reset URL======
    const resetUrl = `${process.env.FRONTEND_URL}/
        resetpassword/${resetToken}`
    // ======reset email=======
    const message = `<h2>Hello ${user.name}</h2>
                    <p>Please use the url below to reset your password</p>
                    <p>This reset link is valid for only 30 minutes</p>
                    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
                    <p>Regards.....</p>
                    <p>Inventory team</p>
                    
                    `;
    const subject = "password reset request";
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER
    try {
        await sendEmail(subject,message,send_to, sent_from)
        res.status(200).json({success: true, message: "Reset email Sent"})
    } catch (error) {
        res.status(500)
        throw new Error("Email not sent, please try again")
    }
});
// =========reset password======
const resetpassword = asyncHandler(async(req, res) =>{
    const {password} = req.body
    const {resetToken} = req.params
    // =====hash token , then compare to Token in the data base======
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    // ======find token in db====
    const userToken = await Token.findOne({
        token: hashedToken,
        expiresAt: {$gt: Date.now()}
    })
    if(!userToken) {
        res.status(400);
        throw new Error("Invalid or Expired Token");
    }
    // =====find user======
    const user = await User.findOne({_id: userToken.userId})
    user.password = password
    await user.save()
    res.status(200).json({
        message: "Password Reset successful please login"
    })
});
module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetpassword
};
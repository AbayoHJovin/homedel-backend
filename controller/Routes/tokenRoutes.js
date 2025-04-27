const express=require("express")
const { refreshToken, protectedRoute } = require("../tokenControllers")
const router=express.Router()
router.post("/refresh_token",refreshToken)
router.post("/protected",protectedRoute)
module.exports=router
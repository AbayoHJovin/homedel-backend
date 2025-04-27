const express=require("express")
const { handleSubscription } = require("../mail/subscription")
const router=express.Router()
router.post("/addSubscription",handleSubscription)
module.exports=router
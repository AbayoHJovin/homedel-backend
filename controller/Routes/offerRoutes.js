const express=require("express")
const { addOffer, getOffer, approveOffer, declineOffer } = require("../offerControllers")
const router=express.Router()
router.post("/addOffer",addOffer)
router.get("/getOffer",getOffer)
router.patch("/updateOrder",approveOffer)
router.delete("/removeOrder",declineOffer)
module.exports=router
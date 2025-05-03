const express=require("express")
const { addOffer, getOffer, declineOffer, changeOrderStatus } = require("../offerControllers")
const router=express.Router()
router.post("/addOffer",addOffer)
router.get("/getOffer",getOffer)
router.patch("/updateOrder",changeOrderStatus)
router.delete("/removeOrder",declineOffer)
module.exports=router
const userModel = require('../model/userModel');
const cartModel = require('../model/cartModel');
const orderModel = require("../model/orderModel")
const validator = require("../utils/validator");



/**********************************************CREATE ORDER API*******************************************/



const createOrder = async  (req, res) => {
    try {
        let userId = req.params.userId;
        if (!(validator.isValidObjectId(userId))) {
            return res.status(400).send({ status: false, message: "Provide a valid userId" });
        }


        let cartBody = req.body;
        let { cartId, cancellable, status } = cartBody;

        if (!validator.isValidRequest(cartBody)) {
            return res.status(400).send({ status: false, message: "Please provide body" });
        }

        if (!(validator.isValidObjectId(cartId))) {
            return res.status(400).send({ status: false, message: "Provide a valid cartId" });
        }

        if(cancellable){
            if(cancellable!==true && cancellable!==false){
                return res.status(400).send({ status: false, message: "Please provide valid cancellable status" });
            }

        }


        if (status) {
            if (status !== 'pending') {
                return res.status(400).send({ status: false, message: "status must be Pending when ordering" })
            }
        }

        let findUser = await userModel.findOne({ _id: userId });

        if (!findUser)
            return res.status(404).send({ status: false, message: "User Id not found" })


        let checkCart = await cartModel.findOne({ _id: cartId })

        if (!checkCart) {
            return res.status(404).send({ status: false, message: "Cart doesn't exist" })
        }

        if (!checkCart.items.length) {
            return res.status(400).send({ status: false, message: "Please add some product in cart to make an order" });
        }

        let order = {
            userId: userId,
            items: checkCart.items,
            totalPrice: checkCart.totalPrice,
            totalItems: checkCart.totalItems,
            totalQuantity: checkCart.totalItems,
            cancellable,
            status
        }

        let createOrder = await orderModel.create(order)
        if (status == 'pending' || createOrder.status == 'pending') {
            await cartModel.findOneAndUpdate({ _id: cartId, userId: userId }, {
                $set: {
                    items: [],
                    totalPrice: 0,
                    totalItems: 0,
                },
            })
        };
        return res.status(201).send({ status: true, message: "Order placed successfully.", data: createOrder });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}





/**********************************************UPDATE CART API*******************************************/



const updateOrder = async (req, res) => {
    try {
        let userId = req.params.userId;
        const { orderId, status } = req.body;


        if (!validator.isValidRequest(req.body)) {
            return res.status(400).send({ status: false, message: "Please provide body" });
        }

        
        if (!(validator.isValidObjectId(userId))) {
            return res.status(400).send({ status: false, message: "Provide a valid userId" });
        }

        if (!(validator.isValidObjectId(orderId))) {
            return res.status(400).send({ status: false, message: "Provide a valid orderId" });
        }

        if (!validator.validStatus(status)) {
            return res.status(400).send({ status: false, message: "Status can be completed or cancelled only" });
        }

        if (status == 'pending') {
            return res.status(400).send({ status: false, message: "status can not be pending during updation" })
        }


        let findOrder = await orderModel.findOne({ _id: orderId, isDeleted:false,userId: userId })
        if (!findOrder) {
            return res.status(404).send({ status: false, message: "Order id does not exist for this UserId" })
        }

        if (status == 'completed' && (findOrder.status == 'completed' || findOrder.status == 'cancelled')) {
            return res.status(400).send({ status: false, message: `Order status can not be changed after ${order.status}` })
        }

        if (status == 'cancelled' && (findOrder.status == 'completed' || findOrder.status == 'cancelled')) {
            return res.status(400).send({ status: false, message: `Order status can not be changed after ${order.status}` })
        }

        if (status == 'completed' && findOrder.status == 'pending') {
            const orderCompleted = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: 'completed' } }, { new: true })
            return res.status(200).send({ status: true, message: "Order is completed", data: orderCompleted })
        }

        if(status=="cancelled" && findOrder.cancellable !== true){
                return res.status(200).send({ status: false, message: "Order can not be cancelled" })
            }
            
        if (status == 'cancelled' && findOrder.status == 'pending') {
            const orderCancelled = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: 'cancelled' } }, { new: true })
            return res.status(200).send({ status: false, message: "Order is cancelled", data: orderCancelled })
        }

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { createOrder, updateOrder }
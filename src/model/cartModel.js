const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

const cartSchema = new mongoose.Schema({
    userId: {type: ObjectId, ref: 'User', required: "User Id is required", unique: true },

    items: [{
        productId: { type: ObjectId, required: true, ref:'Product' },
        quantity: { type: Number, required: true, minLen: 1 },
        _id: false
    }],

    totalPrice: {type: Number, required: "totalPrice is required"},
    
    totalItems: {type: Number, required: "totalItems is required"}
}, 
{ timestamps: true })

module.exports = mongoose.model('Cart', cartSchema)
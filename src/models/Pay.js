import mongoose from 'mongoose'

const PaySchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    funnel: { type: String },
    step: { type: String },
    service: { type: String },
    stepService: { type: String },
    typeService: { type: String },
    typePrice: { type: String },
    plan: { type: String },
    price: { type: Number },
    state: { type: String },
    method: { type: String }
}, {
    timestamps: true
})

const Pay = mongoose.models.Pay || mongoose.model('Pay', PaySchema)

export default Pay
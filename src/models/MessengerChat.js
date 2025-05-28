import mongoose from 'mongoose'

const MessengerMessageSchema = mongoose.Schema({
    messengerId: { type: String, required: true },
    message: { type: String },
    response: { type: String },
    agent: { type: Boolean, required: true },
    view: { type: Boolean },
    ready: { type: Boolean }
}, {
    timestamps: true
})

const MessengerMessage = mongoose.models.MessengerMessage || mongoose.model('MessengerMessage', MessengerMessageSchema)

export default MessengerMessage
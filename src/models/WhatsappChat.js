import mongoose from 'mongoose'

const WhatsappMessageSchema = mongoose.Schema({
    phone: { type: Number, required: true },
    message: { type: String },
    response: { type: String },
    agent: { type: Boolean, required: true },
    view: { type: Boolean },
    ready: { type: Boolean }
}, {
    timestamps: true
})

const WhatsappMessage = mongoose.models.WhatsappMessage || mongoose.model('WhatsappMessage', WhatsappMessageSchema)

export default WhatsappMessage
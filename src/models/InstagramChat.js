import mongoose from 'mongoose'

const InstagramMessageSchema = mongoose.Schema({
    instagramId: { type: String, required: true },
    message: { type: String },
    response: { type: String },
    agent: { type: Boolean, required: true },
    view: { type: Boolean },
    ready: { type: Boolean }
}, {
    timestamps: true
})

const InstagramMessage = mongoose.models.InstagramMessage || mongoose.model('InstagramMessage', InstagramMessageSchema)

export default InstagramMessage
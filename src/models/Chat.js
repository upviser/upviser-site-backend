import mongoose from 'mongoose'

const ChatSchema = mongoose.Schema({
    senderId: { type: String, required: true },
    message: { type: String },
    response: { type: String },
    adminView: { type: Boolean },
    userView: { type: Boolean },
    agent: { type: Boolean },
    ready: { type: Boolean }
}, {
    timestamps: true
})

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatSchema)

export default ChatMessage
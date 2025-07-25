import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    email: { type: String },
    api: { type: String },
    idPhone: { type: String },
    idPage: { type: String },
    idInstagram: { type: String },
    instagramState: { type: String },
    zoomState: { type: String } 
}, {
    timestamps: true
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

export default User
import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    email: { type: String },
    api: { type: String },
    idNumber: { type: String },
    idPage: { type: String },
    idInstagram: { type: String },
    zoomState: { type: String } 
}, {
    timestamps: true
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

export default User
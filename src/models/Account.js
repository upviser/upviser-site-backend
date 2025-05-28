import mongoose from 'mongoose'

const AccountSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: Number },
    password: { type: String, required: true, select: false },
    cart: { type: Array }
}, {
    timestamps: true
})

const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema)

export default Account
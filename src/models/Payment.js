import mongoose from 'mongoose'

const PaymentSchema = new mongoose.Schema({
    transbank: { active: { type: Boolean }, commerceCode: { type: String }, apiKey: { type: String } },
    mercadoPago: { active: { type: Boolean }, accessToken: { type: String }, publicKey: { type: String } }
}, {
    timestamps: true
})

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)

export default Payment
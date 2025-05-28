import mongoose from 'mongoose'

const ChilexpressSchema = new mongoose.Schema({
    active: { type: Boolean },
    coberturaKey: { type: String },
    cotizadorKey: { type: String }
}, {
    timestamps: true
})

const Chilexpress = mongoose.models.Chilexpress || mongoose.model('Chilexpress', ChilexpressSchema)

export default Chilexpress
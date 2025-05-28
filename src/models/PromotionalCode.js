import mongoose from 'mongoose'

const PromotionalCodeSchema = new mongoose.Schema({
  promotionalCode: { type: String, required: true, unique: true },
  discountType: { type: String, required: true },
  value: { type: Number, required: true },
  minimumAmount: { type: Number },
  state: { type: Boolean, required: true }
})

const PromotionalCode = mongoose.models.PromotionalCode || mongoose.model('PromotionalCode', PromotionalCodeSchema)

export default PromotionalCode
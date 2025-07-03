import mongoose from 'mongoose'

const SellSchema = mongoose.Schema({
  buyOrder: { type: String, required: true, unique: true },
  email: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  firstName: { type: String, require: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  number: { type: Number, required: true, trim: true },
  details: { type: String, trim: true },
  phone: { type: Number, trim: true },
  coupon: { type: String, trim: true },
  cart: { type: Array, required: true },
  shipping: { type: Number, required: true, trim: true, },
  state: { type: String, required: true },
  pay: { type: String },
  total: { type: Number, required: true },
  shippingMethod: { type: String, required: true },
  shippingState: { type: String, required: true },
  shippingCode: { type: String },
  shippingLabel: { type: String },
  subscription: { type: Boolean }
}, {
  timestamps: true
})

const Sell = mongoose.models.Sell || mongoose.model('Sell', SellSchema)

export default Sell
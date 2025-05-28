import mongoose from 'mongoose'

const AddCartSchema = mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  category: { type: String, required: true }
}, {
  timestamps: true
})

const AddCart = mongoose.models.AddCart || mongoose.model('AddCart', AddCartSchema)

export default AddCart
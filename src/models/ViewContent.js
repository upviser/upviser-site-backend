import mongoose from 'mongoose'

const ViewContentSchema = mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }
}, {
  timestamps: true
})

const ViewContent = mongoose.models.ViewContent || mongoose.model('ViewContent', ViewContentSchema)

export default ViewContent
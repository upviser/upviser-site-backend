import mongoose from 'mongoose'

const TagSchema = mongoose.Schema({
  tag: { type: String, required: true }
}, {
  timestamps: true
})

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema)

export default Tag
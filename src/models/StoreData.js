import mongoose from 'mongoose'

const StoreDataSchema = mongoose.Schema({
  name: { type: String, required: true },
  nameContact: { type: String },
  email: { type: String, required: true },
  phone: { type: Number },
  logo: { type: String },
  logoWhite: { type: String },
  instagram: { type: String },
  facebook: { type: String },
  tiktok: { type: String },
  whatsapp: { type: String },
  locations: [{
    commercial: { type: Boolean },
    address: { type: String },
    details: { type: String },
    city: { type: String },
    region: { type: String },
    mapsLink: { type: String },
    countyCoverageCode: { type: String },
    streetName: { type: String },
    streetNumber: { type: String }
  }],
  schedule: {
    monday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    tuesday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    wednesday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    thursday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    friday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    saturday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
    sunday: { state: { type: Boolean, required: true }, open: { type: String }, close: { type: String } },
  }
}, {
  timestamps: true
})

const StoreData = mongoose.models.StoreData || mongoose.model('StoreData', StoreDataSchema)

export default StoreData
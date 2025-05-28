import mongoose from 'mongoose'

const funnelSchema = new mongoose.Schema({
  funnel: { type: String },
  step: { type: String }
}, {
  timestamps: true
})

const serviceSchema = new mongoose.Schema({
  service: { type: String },
  step: { type: String },
  plan: { type: String },
  price: { type: Number },
  payStatus: { type: String }
}, {
  timestamps: true
})

const formSchema = new mongoose.Schema({
  form: { type: String }
}, {
  timestamps: true
})

const meetingSchema = new mongoose.Schema({
  meeting: { type: String }
}, {
  timestamps: true
})

const emailSchema = new mongoose.Schema({
  id: { type: String },
  automatizationId: { type: String },
  subject: { type: String },
  opened: { type: Boolean },
  clicked: { type: Boolean }
}, {
  timestamps: true
})

const ClientSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: Number },
  tags: [{ type: String }],
  funnels: [funnelSchema],
  services: [serviceSchema],
  forms: [formSchema],
  meetings: [meetingSchema],
  tags: [{ type: String }],
  emails: [emailSchema],
  data: [{ name: { type: String }, value: { type: String } }],
  address: { type: String },
  details: { type: String },
  city: { type: String },
  region: { type: String },
  products: [{ product: { type: String } }]
}, {
  timestamps: true
})

const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema)

export default Client
import mongoose from 'mongoose'

const MeetingSchema = new mongoose.Schema({
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    phone: { type: Number },
    meeting: { type: String, required: true },
    date: { type: Date, required: true },
    url: { type: String },
    data: [{ name: { type: String }, value: { type: String } }],
    service: { type: String },
    stepService: { type: String },
    funnel: { type: String },
    step: { type: String },
    calendar: { type: String },
    type: { type: String },
    address: { type: String },
    details: { type: String },
    city: { type: String },
    region: { type: String },
    price: { type: Number }
}, {
    timestamps: true
})

const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema)

export default Meeting
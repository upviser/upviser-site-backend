import mongoose from 'mongoose'

const CallSchema = new mongoose.Schema({
    type: [{ type: String }],
    nameMeeting: { type: String, required: true, unique: true },
    title: { type: String },
    duration: { type: String },
    intervals: { type: String },
    description: { type: String },
    price: { type: Number },
    labels: [{ type: { type: String }, text: { type: String }, data: { type: String }, datas: [{ type: String }] }],
    buttonText: { type: String },
    tags: [{ type: String }],
    action: { type: String },
    message: { type: String },
    redirect: { type: String },
    calendar: { type: String },
    address: { type: String },
    details: { type: String },
    city: { type: String },
    region: { type: String }
}, {
    timestamps: true
})

const Call = mongoose.models.Call || mongoose.model('Call', CallSchema)

export default Call
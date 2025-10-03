import mongoose from 'mongoose'

const AutomatizationsSchema = new mongoose.Schema({ 
    affair: { type: String, required: true }, 
    title: { type: String, required: true }, 
    paragraph: { type: String, required: true }, 
    buttonText: { type: String }, 
    url: { type: String }, 
    date: { type: Date }, 
    number: { type: Number }, 
    time: { type: String }, 
    condition: [{ type: String }] 
})

const AutomatizationSchema = new mongoose.Schema({
    startType: { type: String, required: true },
    startValue: { type: String },
    name: { type: String, required: true },
    automatization: [AutomatizationsSchema],
    text: { type: String },
    replyPromt: { type: String },
    message: { type: String }
}, {
    timestamps: true
})

const Automatization = mongoose.models.Automatization || mongoose.model('Automatization', AutomatizationSchema)

export default Automatization
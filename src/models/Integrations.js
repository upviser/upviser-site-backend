import mongoose from 'mongoose'

const IntegrationsSchema = new mongoose.Schema({
    idPhone: { type: String },
    whatsappToken: { type: String },
    idPage: { type: String },
    idInstagram: { type: String },
    userAccessToken: { type: String },
    messengerToken: { type: String },
    instagramToken: { type: String },
    apiToken: { type: String },
    apiPixelId: { type: String },
    googleAnalytics: { type: String }
}, {
    timestamps: true
})

const Integrations = mongoose.models.Integrations || mongoose.model('Integrations', IntegrationsSchema)

export default Integrations
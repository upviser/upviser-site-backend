import mongoose from 'mongoose'

const stepSchema = new mongoose.Schema({
    step: { type: String },
    slug: { type: String },
    metaTitle: { type: String },
    metaDescription: { type: String },
    image: { type: String },
    design: [{ content: { type: String }, meetings: [{ type: String }], meeting: { type: String }, form: { type: String }, service: { service: { type: String }, plan: { type: String } }, services: [{ service: { type: String }, url: { type: String } }], info: { banner: [{ title: { type: String }, description: { type: String }, button: { type: String }, buttonLink: { type: String }, image: { type: String }, type: { type: String } }], title: { type: String }, subTitle: { type: String }, description: { type: String }, image: { type: String }, titleForm: { type: String }, button: { type: String }, buttonLink: { type: String }, subTitle2: { type: String }, description2: { type: String }, button2: { type: String }, buttonLink2: { type: String }, subTitle3: { type: String }, description3: { type: String }, button3: { type: String }, buttonLink3: { type: String }, subTitle4: { type: String }, descriptionView: { type: Boolean }, video: { type: String }, typeBackground: { type: String }, background: { type: String }, textColor: { type: String }, faq: [{ question: { type: String }, response: { type: String } }], blocks: [{ title: { type: String }, description: { type: String }, buttonText: { type: String }, buttonLink: { type: String }, image: { type: String } }], reviews: [{ review: { type: String }, stars: { type: String }, name: { type: String } }], form: [{ type: { type: String }, text: { type: String }, name: { type: String }, data: { type: String }, datas: [{ type: String }] }] } }]
}, {
    timestamps: true
})

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    steps: [stepSchema],
    typeService: { type: String },
    typePrice: { type: String, required: true },
    typePay: { type: String},
    price: { type: Number }, 
    anualPrice: { type: Number },
    firstStep: { type: { type: String }, slug: { type: String } },
    plans: { functionalities: [{ type: String }], plans: [{ recommended: { type: Boolean }, name: { type: String }, description: { type: String }, price: { type: Number }, anualPrice: { type: Number }, characteristics: [{ type: String }], functionalities: [{ name: { type: String }, value: { type: String } }] }] },
    tags: [{ type: String }]
}, {
    timestamps: true
})

const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema)

export default Service
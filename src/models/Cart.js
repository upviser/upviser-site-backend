import mongoose from 'mongoose'

const VariationSchema = new mongoose.Schema({
  variation: { type: String },
  subVariation: { type: String },
  subVariation2: { type: String },
  stock: { type: Number },
  image: { type: String },
  sku: { type: String }
})

const ProductSchema = new mongoose.Schema({
  name: { type: String },
  image: { type: String },
  price: { type: Number },
  beforePrice: { type: Number },
  variation: VariationSchema,
  slug: { type: String },
  quantity: { type: Number },
  stock: { type: Number },
  category: { category: { type: String }, slug: { type: String } },
  quantityOffers: [{ quantity: { type: Number }, descount: { type: Number } }],
  sku: { type: String }
}, {
  timestamps: true
})

const CartSchema = new mongoose.Schema({
  phone: { type: Number },
  instagramId: { type: String },
  messengerId: { type: String },
  cart: ProductSchema
})

const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema)

export default Cart
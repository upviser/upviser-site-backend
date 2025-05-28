import Product from '../models/Product.js'

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find()
        .lean()
        return res.send(products)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createProduct = async (req, res) => {
    try {
        const data = req.body
        const nuevoProducto = new Product(data)
        await nuevoProducto.save()
        return res.json(nuevoProducto)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const updateProduct = async (req, res) => {
    try {
        const updateProducto = await Product.findByIdAndUpdate(req.params.id, req.body, {new: true})
        return res.send(updateProducto)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const productRemoved = await Product.findByIdAndDelete(req.params.id)
        if (!productRemoved) return res.sendStatus(404)
        return res.sendStatus(204)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getProductBySlug = async (req, res) => {
    const product = await Product.findOne({slug: req.params.id}).lean()
  
    if ( !product ) {
      return null
    }
  
    return res.send(product)
}

export const updateStockProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('stock variations')
        const stock = product.stock - req.body.stock
        if (stock < 0) {
            return res.sendStatus(403)
        }
        if (req.body.variation) {
            product.variations.variations.map(async (variation) => {
                if (variation.subVariation) {
                    if (variation.variation === req.body.variation.variation && variation.subVariation === req.body.variation.subVariation) {
                        variation.stock = variation.stock - req.body.stock
                        if (variation.stock < 0) {
                            return res.sendStatus(403)
                        }
                        const updatedProduct = await Product.findByIdAndUpdate(product._id, { stock: stock, variations: product.variations }, { new: true })
                        return res.send(updatedProduct)
                    }
                } else {
                    if (variation.variation === req.body.variation.variation) {
                        variation.stock = variation.stock - req.body.stock
                        if (variation.stock < 0) {
                            return res.sendStatus(403)
                        }
                        const updatedProduct = await Product.findByIdAndUpdate(product._id, { stock: stock, variations: product.variations }, { new: true })
                        return res.send(updatedProduct)
                    }
                }
            })
            const updatedProduct = await Product.findByIdAndUpdate(product._id, { stock: stock, variations: product.variations }, { new: true })
            return res.send(updatedProduct)
        } else {
            const updatedProduct = await Product.findByIdAndUpdate(product._id, { stock: stock }, { new: true })
            return res.send(updatedProduct)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getProductByCategory = async (req, res) => {
    try {
        const products = await Product.find({ 'category.category': req.params.id }).lean()
        return res.send(products)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getProductData = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('-_id stock price beforePrice variations').lean()
        return res.send(product)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
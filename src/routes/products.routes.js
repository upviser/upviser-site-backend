import {Router} from 'express'
import {getProducts, createProduct, updateProduct, deleteProduct, getProductBySlug, getProductByCategory, updateStockProduct, getProductData} from '../controllers/products.controllers.js'
import Product from '../models/Product.js'

const router = Router()

router.get('/products', getProducts)

router.post('/products', createProduct)

router.put('/products/:id', updateProduct)

router.delete('/products/:id', deleteProduct)

router.get('/products/:id', getProductBySlug)

router.put('/product/:id', updateStockProduct)

router.get('/products-category/:id', getProductByCategory)

router.get('/product-data/:id', getProductData)

export default router
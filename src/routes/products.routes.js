import {Router} from 'express'
import {getProducts, createProduct, updateProduct, deleteProduct, getProductBySlug, getProductByCategory, updateStockProduct, getProductData, createReview} from '../controllers/products.controllers.js'

const router = Router()

router.get('/products', getProducts)

router.post('/products', createProduct)

router.put('/products/:id', updateProduct)

router.delete('/products/:id', deleteProduct)

router.get('/products/:id', getProductBySlug)

router.put('/product/:id', updateStockProduct)

router.get('/products-category/:id', getProductByCategory)

router.get('/product-data/:id', getProductData)

router.post('/review/:id', createReview)

export default router
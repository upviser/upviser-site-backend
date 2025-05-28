import { Router } from 'express'
import { createDescriptionProduct, createSeoProduct, createDescriptionCategory, createSeoCategory, createImageProduct } from '../controllers/ai.controllers.js'

const router = Router()

router.post('/description-product', createDescriptionProduct)

router.post('/product-seo', createSeoProduct)

router.post('/description-category', createDescriptionCategory)

router.post('/category-seo', createSeoCategory)

router.post('/image-product', createImageProduct)

export default router
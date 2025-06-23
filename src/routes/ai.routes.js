import { Router } from 'express'
import { createDescriptionProduct, createSeoProduct, createDescriptionCategory, createSeoCategory, createImageProduct, createImage, createText, createVideo } from '../controllers/ai.controllers.js'

const router = Router()

router.post('/description-product', createDescriptionProduct)

router.post('/product-seo', createSeoProduct)

router.post('/description-category', createDescriptionCategory)

router.post('/category-seo', createSeoCategory)

router.post('/image-product', createImageProduct)

router.post('/text-ia', createText)

router.post('/image-ia', createImage)

router.post('/video-ia', createVideo)

export default router
import {Router} from 'express'
import { getCategories, createCategory, getCategoryBySlug, getCategoryByCategory, deleteCategory, updateCategory } from '../controllers/categories.controllers.js'

const router = Router()

router.get('/categories', getCategories)

router.post('/categories', createCategory)

router.get('/categories/:id', getCategoryBySlug)

router.get('/category/:id', getCategoryByCategory)

router.delete('/categories/:id', deleteCategory)

router.put('/categories/:id', updateCategory)

export default router
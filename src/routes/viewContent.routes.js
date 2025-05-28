import {Router} from 'express'
import {createViewContent, getViewContent} from '../controllers/viewContent.controllers.js'

const router = Router()

router.post('/view-content', createViewContent)

router.get('/view-content', getViewContent)

export default router
import { Router } from 'express'
import { createForm, getForm, getForms, editForm, deteleFotm } from '../controllers/forms.controllers.js'

const router = Router()

router.post('/form', createForm)

router.get('/form/:id', getForm)

router.get('/forms', getForms)

router.put('/form/:id', editForm)

router.delete('/form/:id', deteleFotm)

export default router
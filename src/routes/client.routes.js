import {Router} from 'express'
import { createClient, getClients, updateClient, updateClientEmail, getClient, getClientByEmail, deleteClient, emailProduct, createAccount, editAccountData, getAccountData } from '../controllers/client.controllers.js'

const router = Router()

router.post('/clients', createClient)

router.get('/clients', getClients)

router.put('/clients/:id', updateClient)

router.put('/client/:id', updateClientEmail)

router.get('/clients/:id', getClient)

router.get('/client-email/:id', getClientByEmail)

router.delete('/client/:id', deleteClient)

router.post('/email-product', emailProduct)

router.post('/register', createAccount)

router.get('/account/:id', getAccountData)

router.put('/account/:id', editAccountData)

export default router
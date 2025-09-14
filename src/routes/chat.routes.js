import {Router} from 'express'
import { responseMessage, getMessages, createMessage, getIds, viewAdminMessage, viewUserMessage, changeTag, createTag, getChatTags } from '../controllers/chat.controllers.js'

const router = Router()

router.post('/chat', responseMessage)

router.get('/chat', getIds)

router.get('/chat/:id', getMessages)

router.post('/chat/create', createMessage)

router.put('/chat/:id', viewAdminMessage)

router.put('/chat-user/:id', viewUserMessage)

router.put('/chat-tag/:id', changeTag)

router.get('/chat-tags', getChatTags)

router.post('/chat-tag', createTag)

export default router
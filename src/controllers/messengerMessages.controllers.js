import MessengerMessage from '../models/MessengerChat.js'
import axios from 'axios'
import Integration from '../models/Integrations.js'

export const getMessengerIds = async (req, res) => {
    try {
        MessengerMessage.aggregate([
            {
                $sort: { messengerId: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$messengerId',
                    lastDocument: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: { newRoot: '$lastDocument' }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $project: {
                    _id: 0,
                    messengerId: 1,
                    agent: 1,
                    view: 1,
                    createdAt: 1
                }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            return res.send(result)
        })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMessagesMessenger = async (req, res) => {
    try {
        const messages = await MessengerMessage.find({messengerId: req.params.id}).lean()
        res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createMessage = async (req, res) => {
    try {
        const integration = await Integration.findOne().lean()
        if (integration.messengerToken && integration.messengerToken !== '') {
            await axios.post(`https://graph.facebook.com/v21.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                "recipient": {
                    "id": req.body.messengerId
                },
                "messaging_type": "RESPONSE",
                "message": {
                    "text": req.body.response
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            const newMessage = new MessengerMessage({messengerId: req.body.messengerId, response: req.body.response, agent: req.body.agent, view: req.body.view})
            await newMessage.save()
            return res.sendStatus(200)
        } else {
            return res.json({ message: 'No existe un token de app para Messenger' })
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewMessage = async (req, res) => {
    try {
        const messages = await MessengerMessage.find({messengerId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.view = true
        const saveMessage = await MessengerMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
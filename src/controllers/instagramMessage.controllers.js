import InstagramMessage from '../models/InstagramChat.js'
import axios from 'axios'
import Integration from '../models/Integrations.js'

export const getInstagramIds = async (req, res) => {
    try {
        InstagramMessage.aggregate([
            {
                $sort: { instagramId: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$instagramId',
                    lastDocument: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: { newRoot: '$lastDocument' }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            const filtered = result.map(({instagramId, view, createdAt}) => ({instagramId, view, createdAt}))
            return res.send(filtered)
        })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMessagesInstagram = async (req, res) => {
    try {
        const messages = await InstagramMessage.find({instagramId: req.params.id}).lean()
        res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createMessage = async (req, res) => {
    try {
        const integration = await Integration.findOne().lean()
        if (integration.messengerToken && integration.messengerToken !== '') {
            await axios.post(`https://graph.facebook.com/v16.0/${integration.idInstagram}/messages?access_token=${process.env.MESSENGER_TOKEN}`, {
                "recipient": {
                    "id": req.body.instagramId
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
            const newMessage = new InstagramMessage({instagramId: req.body.instagramId, response: req.body.response, agent: req.body.agent, view: req.body.view})
            await newMessage.save()
            return res.sendStatus(200)
        } else {
            return res.json({ message: 'No existe un token de app para Instagram' })
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewMessage = async (req, res) => {
    try {
        const messages = await InstagramMessage.find({instagramId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.view = true
        const saveMessage = await InstagramMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
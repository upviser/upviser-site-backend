import MessengerMessage from '../models/MessengerChat.js'
import axios from 'axios'
import Integration from '../models/Integrations.js'
import ShopLogin from '../models/ShopLogin.js'

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
                    createdAt: 1,
                    tag: 1
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

export const MessengerToken = async (req, res) => {
  const { userToken } = req.body;
  if (!userToken) return res.status(400).json({ error: 'No se recibió token.' });

  try {
    // 1. Intercambio a token largo
    const longUser = (await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        fb_exchange_token: userToken
      }
    })).data;
    const longLivedUserToken = longUser.access_token;

    // 2. Obtener página y token
    const pagesRes = await axios.get('https://graph.facebook.com/v20.0/me/accounts', {
      params: { access_token: longLivedUserToken }
    });
    const page = pagesRes.data.data[0];
    if (!page) return res.status(400).json({ error: 'No hay páginas disponibles.' });

    const longLivedPageToken = page.access_token;
    const pageId = page.id;

    await axios.post(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: longLivedPageToken,
        subscribed_fields: 'messages,messaging_postbacks'
      }
    });

    // 4. Guardar en BD
    const integrations = await Integration.findOne().lean();
    if (integrations) {
        await Integration.findByIdAndUpdate(integrations._id, {
            messengerToken: longLivedPageToken,
            idPage: pageId,
            userAccessToken: longLivedUserToken
        });
    } else {
        const newIntegration = new Integration({
            messengerToken: longLivedPageToken,
            idPage: pageId,
            userAccessToken: longLivedUserToken
        })
        await newIntegration.save()
    }

    res.status(200).json({ success: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export const DisconnectFacebook = async (req, res) => {
    try {
        const integrations = await Integration.findOne().lean()
        await axios.delete('https://graph.facebook.com/me/permissions', {
            params: { access_token: integrations.userAccessToken }
        });

        await Integration.findOneAndUpdate({ messengerToken: '', idPage: '', userAccessToken: '' })
        return res.json({ success: 'OK' })
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}
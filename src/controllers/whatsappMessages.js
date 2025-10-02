import WhatsappChat from '../models/WhatsappChat.js'
import axios from "axios"
import Integration from '../models/Integrations.js'
import ShopLogin from '../models/ShopLogin.js'
import User from '../models/User.js'

export const getPhones = async (req, res) => {
    try {
        WhatsappChat.aggregate([
            {
                $sort: { phone: 1, createdAt: -1 } // ordenamos por phone y luego por fecha descendente
            },
            {
                $group: {
                    _id: '$phone',
                    lastMessage: { $first: '$$ROOT' } // el más reciente por phone
                }
            },
            {
                $replaceRoot: { newRoot: '$lastMessage' }
            },
            {
                $sort: { createdAt: -1 } // ordenamos todos los últimos mensajes por fecha
            },
            {
                $project: {
                    _id: 0,
                    phone: 1,
                    agent: 1,
                    view: 1,
                    createdAt: 1,
                    tag: 1,
                    message: 1
                }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404);
            }
            return res.send(result);
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getMessagesPhone = async (req, res) => {
    try {
        const messages = await WhatsappChat.find({phone: req.params.id}).lean()
        res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const newMessage = async (req, res) => {
    try {
        const integration = await Integration.findOne().lean()
        if (integration.whatsappToken && integration.whatsappToken !== '') {
            await axios.post(`https://graph.facebook.com/v21.0/${integration.idPhone}/messages`, {
                "messaging_product": "whatsapp",
                "to": req.body.phone,
                "type": "text",
                "text": {"body": req.body.response}
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${integration.whatsappToken}`
                }
            })
            const ultMessage = await WhatsappChat.findOne({ phone: req.body.phone }).sort({ createdAt: -1 })
            const newMessage = new WhatsappChat({phone: req.body.phone, response: req.body.response, agent: req.body.agent, view: true, tag: ultMessage.tag})
            await newMessage.save()
            return res.send(newMessage)
        } else {
            return res.json({ message: 'No existe un token de app para Whatsapp' })
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewMessage = async (req, res) => {
    try {
        const messages = await WhatsappChat.find({phone: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.view = true
        const saveMessage = await WhatsappChat.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const changeTag = async (req, res) => {
    try {
        const messages = await WhatsappChat.find({phone: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.tag = req.body.tag
        const saveMessage = await WhatsappChat.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const whatsappToken = async (req, res) => {
  try {
    const { code, phone_number_id, waba_id } = req.body

    const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        code,
      },
    });

    const { access_token } = tokenRes.data;

    const longLivedRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
        params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FB_APP_ID,
            client_secret: process.env.FB_APP_SECRET,
            fb_exchange_token: access_token, // token corto recién obtenido
        }
    });

    const longLivedToken = longLivedRes.data.access_token;

    await axios.post(`https://graph.facebook.com/v20.0/${waba_id}/subscribed_apps`, null, {
      params: { access_token: longLivedToken },
    });

    const user = await User.findOne({ idPhone: phone_number_id }).lean()

    if (user) {
        await axios.post(`${user.api}/integrations`, { whatsappToken: longLivedToken, idPhone: phone_number_id, waba: waba_id })
        await axios.post(`${process.env.API_URL}/user`, { api: user.api, idPhone: phone_number_id })
    } else {
        const integrations = await Integration.findOne().lean();
        await Integration.findByIdAndUpdate(integrations._id, {
            whatsappToken: longLivedToken,
            idPhone: phone_number_id,
            waba: waba_id
        }, { new: true });
    }

    res.status(200).json({ success: 'OK' });
  } catch (error) {
    console.error(error.response.data);
    res.status(500).json({ message: error.message });
  }
};

export const createTemplate = async (req, res) => {
    try {
        const integrations = await Integration.findOne().lean()
        const response = await axios.post(`https://graph.facebook.com/v20.0/${integrations.waba}/message_templates`, {
            "name": req.body.name.toLowerCase().replaceAll(' ', '_'),
            "language": "es",
            "category": req.body.category,
            "components": req.body.components
        }, {
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${integrations.whatsappToken}`
            }
        })
        return res.json({ success: 'OK' })
    } catch (error){
        console.log(error.message)
        return res.status(500).json({ message: error.message });
    }
}

export const getTemplates = async (req, res) => {
  try {
    const integrations = await Integration.findOne().lean();
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${integrations.waba}/message_templates`,
      {
        headers: { Authorization: `Bearer ${integrations.whatsappToken}` }
      }
    );
    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export const deleteTemplate = async (req, res) => {
  try {
    const integrations = await Integration.findOne().lean();
    const response = await axios.delete(
      `https://graph.facebook.com/v20.0/${integrations.waba}/message_templates?name=${req.params.name}`,
      {
        headers: { Authorization: `Bearer ${integrations.whatsappToken}` },
      }
    );
    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.response?.data?.error || error.message });
  }
}

export const editTemplate = async (req, res) => {
    try {
        const integrations = await Integration.findOne().lean();
        const response = await axios.post(`https://graph.facebook.com/v20.0/${req.body.id}`, req.body, {
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${integrations.whatsappToken}`
            }
        })
        return res.json(response.data)
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const DisconnectWhatsapp = async (req, res) => {
    try {
        const integrations = await Integration.findOne().lean()
        await axios.delete(`https://graph.facebook.com/v20.0/${integrations.waba}/subscribed_apps`, {
            params: { access_token: integrations.whatsappToken }
        });
        await Integration.findOneAndUpdate({ whatsappToken: '', idPhone: '', waba: '' })
        return res.json({ success: 'OK' })
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}
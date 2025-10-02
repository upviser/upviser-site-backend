import ChatMessage from '../models/Chat.js'
import OpenAI from "openai"
import Product from '../models/Product.js'
import Service from '../models/Service.js'
import StoreData from '../models/StoreData.js'
import Call from '../models/Call.js'
import Funnel from '../models/Funnel.js'
import Politics from '../models/Politics.js'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import ShopLogin from '../models/ShopLogin.js'
import { io } from '../index.js'
import ChatTag from '../models/ChatTag.js'

export const responseMessage = async (req, res) => {
    try {
        const shopLogin = await ShopLogin.findOne({ type: 'Administrador' })
        const message = req.body.message
        const senderId = req.body.senderId
        const messages = await ChatMessage.find({ senderId: senderId }).select('-senderId -_id -adminView -userView -agent').sort({ createdAt: -1 }).limit(2).lean();
        if (!messages.length) {
            await ShopLogin.findByIdAndUpdate(shopLogin._id, { conversationsAI: shopLogin.conversationsAI - 1 })
        }
        if (!req.body.agent || shopLogin.conversationsAI < 1) {
            const newMessage = new ChatMessage({ senderId: senderId, message: message, agent: false, adminView: false, userView: true, tag: messages[0].tag })
            await newMessage.save()
            const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje del chat', url: '/mensajes', view: false })
            await notification.save()
            io.emit('newNotification')
            return res.send(newMessage)
        } else {
            await ShopLogin.findByIdAndUpdate(shopLogin._id, { conversationsAI: shopLogin.conversationsAI - 1 })
            const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
            let products
            const context = messages.flatMap(ult => {
                const userMessage = ult.message ? [{"role": "user", "content": [{"type": "text", "text": ult.message}]}] : [];
                const assistantMessage = ult.response ? [{"role": "assistant", "content": [{"type": "text", "text": ult.response}]}] : [];
                return [...userMessage, ...assistantMessage];
            });
            const conversation = messages.flatMap(ult => {
                const userMessage = ult.message ? [{"role": "user", "content": ult.message}] : [];
                const assistantMessage = ult.response ? [{"role": "assistant", "content": ult.response}] : [];
                return [...userMessage, ...assistantMessage];
            });
            const TypeSchema = z.object({
                intentions: z.array(z.string())
            })
            const type = await openai.responses.parse({
                model: "gpt-4o-mini",
                input: [
                    {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra de productos, intención de compra de servicios, necesidad de alguien de soporte."},
                    ...conversation,
                    {"role": "user", "content": message}
                ],
                text: {
                    format: zodTextFormat(TypeSchema, "type"),
                },
            });
            let information = ''
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento', agent: false, adminView: false, userView: true, tag: 'Transferido'})
                await newMessage.save()
                const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje del chat', url: '/mensajes', view: false })
                await notification.save()
                io.emit('newNotification')
                return res.send(newMessage)
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos')) {
                products = await Product.find().lean()
                const nameCategories = products.map(product => {
                    return {
                        name: product.name,
                        category: product.category
                    }
                })
                const productsFilter = await openai.responses.parse({
                    model: "gpt-4o-mini",
                    input: [
                        {"role": "system", "content": `El usuario busca productos. Aquí tienes el catálogo resumido: ${JSON.stringify(nameCategories)}. Devuelve los name de maximo 3 productos que podrían encajar mejor con la intención del usuario`},
                        ...conversation,
                        {"role": "user", "content": message}
                    ],
                    text: {
                        format: zodTextFormat(
                            z.object({ names: z.array(z.string()) }),
                            "names"
                        )
                    }
                });
                const simplifiedProducts = products.filter(product => productsFilter.output_parsed.names.includes(product.name)).map(product => {
                    const variations = Array.isArray(product.variations?.variations) 
                        ? product.variations.variations.map(v => ({
                            variation: v.variation,
                            subVariation: v.subVariation,
                            subVariation2: v.subVariation2,
                            stock: v.stock,
                        })) 
                        : [];
                    return {
                        name: product.name,
                        description: product.description?.slice(0, 100),
                        price: product.price,
                        beforePrice: product.beforePrice,
                        stock: product.stock,
                        slug: product.slug,
                        variations,
                        category: product.category
                    }
                })
                information = `${information}. ${JSON.stringify(simplifiedProducts)}. Si el usuario esta buscando un producto o le quieres recomendar un producto pon <a href="/tienda/(slug de la categoria)/(slug del producto)">(nombre del producto)</a> para que pueda ver fotos y más detalles del producto, y siempre muestra todas las variantes del producto.`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('envios')) {
                const politics = await Politics.find().lean()
                information = `${information}. ${JSON.stringify(politics[0].shipping)}`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('horarios') || JSON.stringify(type.output_parsed).toLowerCase().includes('ubicación') || JSON.stringify(type.output_parsed).toLowerCase().includes('saludo')) {
                const storeData = await StoreData.find().lean()
                information = `${information}. ${JSON.stringify(storeData[0])}`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('garantia') || JSON.stringify(type.output_parsed).toLowerCase().includes('devoluciones')) {
                const politics = await Politics.find().lean()
                information = `${information}. ${JSON.stringify(politics[0].devolutions)}`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('metodos de pago')) {
                const politics = await Politics.find().lean()
                information = `${information}. ${JSON.stringify(politics[0].pay)}`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('servicios')) {
                const services = await Service.find().lean();
                const nameDescriptions = services.map(service => {
                    return {
                        name: service.name,
                        category: service.description.slice(0, 50)
                    }
                })
                const servicesFilter = await openai.responses.parse({
                    model: "gpt-4o-mini",
                    input: [
                        {"role": "system", "content": `El usuario busca información sobre servicios que ofrecemos. Aquí tienes los servicios resumido: ${JSON.stringify(nameDescriptions)}. Devuelve los name de maximo 3 servicios que podrían encajar mejor con la intención del usuario`},
                        ...conversation,
                        {"role": "user", "content": message}
                    ],
                    text: {
                        format: zodTextFormat(
                            z.object({ names: z.array(z.string()) }),
                            "names"
                        )
                    }
                });
                const simplifiedServices = services.filter(service => servicesFilter.output_parsed.names.includes(service.name)).map(service => {
                    return {
                        name: service.name,
                        description: service.description.slice(0, 100),
                        steps: service.steps,
                        typeService: service.typeService,
                        typePrice: service.typePrice,
                        typePay: service.typePay,
                        plans: service.plans
                    }
                })
                information = `${information}. Información de servicios: ${JSON.stringify(simplifiedServices)}.`;
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                const nameDescriptions = calls.map(call => {
                    return {
                        nameMeeting: call.nameMeeting,
                        description: call.description.slice(0, 50)
                    }
                })
                const callsFilter = await openai.responses.parse({
                    model: "gpt-4o-mini",
                    input: [
                        {"role": "system", "content": `El usuario busca agendar. Aquí tienes los agendamientos resumido: ${JSON.stringify(nameDescriptions)}. Devuelve los nameMeeting de maximo 3 agendamientos que podrían encajar mejor con la intención del usuario`},
                        ...conversation,
                        {"role": "user", "content": message}
                    ],
                    text: {
                        format: zodTextFormat(
                            z.object({ namemeetings: z.array(z.string()) }),
                            "nameMeetings"
                        )
                    }
                });
                const simplifiedCalls = calls.filter(call => callsFilter.output_parsed.nameMeetings.includes(call.nameMeeting)).map(call => {
                    return {
                        type: call.type,
                        nameMeeting: call.nameMeeting,
                        title: call.title,
                        duration: call.duration,
                        description: call.description.slice(0, 100)
                    }
                })
                information = `${information}. ${JSON.stringify(simplifiedCalls)}. Si el usuario quiere agendar una llamada identifica la llamada más adecuada y pon su enlace de esta forma: <a href="/llamadas/Nombre%20de%20la%20llamada">Nombre de la llamada</a> utilizando el call.nameMeeting`
            }
            if (JSON.stringify(type.output_parsed).toLowerCase().includes('intención de compra de productos')) {
                const cartMinimal = req.body.cart.length ? req.body.cart.map(product => ({
                    name: product.name,
                    variations: {
                        variation: product.variation?.variation || '',
                        subVariation: product.variation?.subVariation || '',
                        subVariation2: product.variation?.subVariation2 || ''
                    },
                    quantity: product.quantity
                })) : ''
                const CartSchema = z.object({
                    cart: z.array(z.object({
                        name: z.string(),
                        variation: z.object({
                            variation: z.string(),
                            subVariation: z.string(),
                            subVariation2: z.string()
                        }),
                        quantity: z.string()
                    })),
                    message: z.string()
                });
                const act = await openai.responses.parse({
                    model: "gpt-4o-mini",
                    input: [
                        {"role": "system", "content": `Tienes que actualizar el carrito del usuario y generar un mensaje de atención al cliente. 

Carrito actual: ${JSON.stringify(cartMinimal)}.  
Información de productos: ${information}.  

Devuelve 2 cosas en JSON:
1. "cart": el carrito actualizado (name, variation, quantity).  
2. "message": un texto natural para enviar al usuario.  
- Sigue preguntando qué más desea hasta que diga todo lo que quiere comprar.  
- Si ya está listo para pagar, comparte este enlace: <a href="/finalizar-compra">Finalizar compra</a>
- Responde de manera breve y clara`},
                        ...conversation,
                        {"role": "user", "content": message}
                    ],
                    text: {
                        format: zodTextFormat(CartSchema, "cart"),
                    },
                });
                const enrichedCart = act.output_parsed.cart.map(item => {
                    const product = products.find(p => p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
                    if (!product) return null
                    let matchedVariation = null
                    if (product.variations?.variations?.length) {
                        matchedVariation = product.variations?.variations?.find(v => {
                            const variationMatch = v.variation === item.variation?.variation;
                            const subVariationMatch =
                                !item.variation?.subVariation || item.variation?.subVariation === ""
                                ? true
                                : v.subVariation === item.variation.subVariation;

                            const subVariation2Match =
                                !item.variation?.subVariation2 || item.variation?.subVariation2 === ""
                                ? true
                                : v.subVariation2 === item.variation.subVariation2;
                            return variationMatch && subVariationMatch && subVariation2Match;
                        });
                    }
                    return {
                        name: product.name,
                        image: matchedVariation?.image || product.images?.[0] || null,
                        price: matchedVariation?.price || product.price,
                        beforePrice: matchedVariation?.beforePrice || product.beforePrice,
                        variation: {
                            ...item.variation,
                            stock: matchedVariation?.stock ?? product.stock,
                            image: matchedVariation?.image || null,
                            sku: matchedVariation?.sku || ''
                        },
                        slug: product.slug,
                        quantity: item.quantity,
                        stock: matchedVariation?.stock ?? product.stock,
                        category: product.category,
                        quantityOffers: product.quantityOffers,
                        sku: matchedVariation?.sku || '',
                        dimentions: product.dimentions || ''
                    };
                }).filter(Boolean);
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: act.output_parsed.message, agent: false, adminView: false, userView: true, tag: 'Productos'})
                const newMessageSave = await newMessage.save()
                return res.send({ ...newMessageSave.toObject(), cart: enrichedCart })
            }
            if (information !== '') {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente del sitio web en donde debes responder las preguntas de los usuarios unicamente con la siguiente información: ${information}.`}]},
                        ...context,
                        {"role": "user", "content": [{"type": "text", "text": message}]}
                    ],
                    response_format: {"type": "text"},
                    temperature: 1,
                    max_completion_tokens: 200,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                    store: false
                });
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: response.choices[0].message.content, agent: true, adminView: false, userView: true, tag: 'Agente IA'})
                await newMessage.save()
                return res.send(newMessage)
            } else {
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar', agent: false, adminView: false, userView: true, tag: 'Agente IA'})
                await newMessage.save()
                return res.send(newMessage)
            }
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getIds = async (req, res) => {
    try {
        ChatMessage.aggregate([
            {
                $sort: { senderId: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$senderId',
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
                    senderId: 1,
                    agent: 1,
                    view: 1,
                    createdAt: 1,
                    tag: 1,
                    message: 1
                }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            return res.send(result)
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const getMessages = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id}).lean()
        return res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createMessage = async (req, res) => {
    try {
        const newMessage = new ChatMessage(req.body)
        await newMessage.save()
        return res.send(newMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewAdminMessage = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.adminView = true
        const saveMessage = await ChatMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewUserMessage = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.userView = true
        const saveMessage = await ChatMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const changeTag = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.tag = req.body.tag
        const saveMessage = await ChatMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getChatTags = async (req, res) => {
    try {
        const tags = await ChatTag.find().lean()
        return res.json(tags)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createTag = async (req, res) => {
    try {
        const newTag = new ChatTag(req.body)
        const newTagSave = await newTag.save()
        return res.json(newTagSave)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
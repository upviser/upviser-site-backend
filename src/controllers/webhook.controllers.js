import OpenAI from "openai"
import Product from '../models/Product.js'
import axios from "axios"
import MessengerMessage from "../models/MessengerChat.js"
import WhatsappMessage from '../models/WhatsappChat.js'
import InstagramMessage from '../models/InstagramChat.js'
import { io } from '../index.js'
import Politics from '../models/Politics.js'
import StoreData from '../models/StoreData.js'
import Call from '../models/Call.js'
import Funnel from '../models/Funnel.js'
import Service from '../models/Service.js'
import Cart from '../models/Cart.js'
import Integration from '../models/Integrations.js'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import ShopLogin from '../models/ShopLogin.js'
import User from "../models/User.js"
import Notification from "../models/Notification.js"
import qs from 'qs';
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export const createWebhook = async (req, res) => {
    const storeData = await StoreData.findOne().lean()
    if (req.query['hub.verify_token'] === `${storeData.name}_token`) {
        res.send(req.query['hub.challenge'])
    } else {
        res.send('No tienes permisos')
    }
}

export const getMessage = async (req, res) => {
    try {
        const integration = await Integration.findOne().lean()
        const shopLogin = await ShopLogin.findOne({ type: 'Administrador' })
        console.log(req.body.entry[0])
        console.log(req.body.entry[0]?.changes)
        if (req.body?.entry && req.body.entry[0]?.changes && req.body.entry[0].changes[0]?.value?.messages && 
            req.body.entry[0].changes[0].value.messages[0]?.text && req.body.entry[0].changes[0].value.messages[0].text.body) {
            if (req.body.entry[0].changes[0].value.metadata.phone_number_id === integration.idPhone) {
                const message = req.body.entry[0].changes[0].value.messages[0].text.body
                const number = req.body.entry[0].changes[0].value.messages[0].from
                if (integration.whatsappToken && integration.whatsappToken !== '') {
                    const messages = await WhatsappMessage.find({phone: number}).select('-phone -_id').sort({ createdAt: -1 }).limit(2).lean()
                    if (!messages.length) {
                        await ShopLogin.findByIdAndUpdate(shopLogin._id, { conversationsAI: shopLogin.conversationsAI - 1 })
                    }
                    if ((messages && messages.length && messages[0].agent) || shopLogin.conversationsAI < 1) {
                        const newMessage = new WhatsappMessage({phone: number, message: message, agent: true, view: false, tag: messages[0].tag})
                        await newMessage.save()
                        io.emit('whatsapp', newMessage)
                        const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Whatsapp', url: '/mensajes', view: false })
                        await notification.save()
                        io.emit('newNotification')
                        return res.sendStatus(200)
                    } else {
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
                                {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra de productos, necesidad de alguien de soporte. *Si tiene la intención de hablar con alguien diferenciar bien si es que quiere una reunion por zoom o física que serian los agendamientos, o lo que busca es chatear con alguien de soporte, nunca agregar ambos."},
                                ...conversation,
                                {"role": "user", "content": message}
                            ],
                            text: {
                                format: zodTextFormat(TypeSchema, "type"),
                            },
                        });
                        let information = ''
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos') || JSON.stringify(type.output_parsed).toLowerCase().includes('servicios')) {
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
                                    {"role": "system", "content": `El usuario busca productos. Aquí tienes el catálogo resumido: ${JSON.stringify(nameCategories).replaceAll('"', '')}. Devuelve los name de maximo 3 productos que podrían encajar mejor con la intención del usuario`},
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
                            const simplifiedProducts = products.filter(product => productsFilter.output_parsed.names?.includes(product.name)).map(product => {
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
                            const services = await Service.find().lean();
                            const nameDescriptions = services.map(service => {
                                return {
                                    name: service.name,
                                    category: service.description.slice(0, 30)
                                }
                            })
                            const servicesFilter = await openai.responses.parse({
                                model: "gpt-4o-mini",
                                input: [
                                    {"role": "system", "content": `El usuario busca información sobre servicios que ofrecemos. Aquí tienes los servicios resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los name de maximo 3 servicios que podrían encajar mejor segun el historial y el ultimo mensaje. *Unicamente en la respuesta pueden ir los name de los servicios, no puede ir ningun otro dato. *si en el historial de conversación se ha hablado de algun servicio agrega su name tambien.`},
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
                            const simplifiedServices = services.filter(service => servicesFilter.output_parsed.names?.includes(service.name)).map(service => {
                                return {
                                    name: service.name,
                                    description: service.description.slice(0, 100),
                                    steps: service.steps,
                                    typeService: service.typeService,
                                    typePrice: service.typePrice,
                                    typePay: service.typePay,
                                    plans: service.plans?.plans?.map(p => ({
                                        name: p.name,
                                        description: p.description,
                                        price: p.price,
                                        anualPrice: p.anualPrice,
                                        characteristics: p.characteristics,
                                        functionalities: p.functionalities?.map(f => ({
                                            name: f.name,
                                            value: f.value
                                        }))
                                    }))
                                }
                            })
                            information = `${information}. ${simplifiedProducts.length ? `Información de productos: ${JSON.stringify(simplifiedProducts).replaceAll('"', '')}. Si el usuario esta buscando un producto o le quieres recomendar un producto pon ${process.env.WEB_URL}/tienda/(slug de la categoria)/(slug del producto) para que pueda ver fotos y más detalles del producto, y siempre muestra todas las variantes del producto.` : ''} ${simplifiedServices.length ? `Información de servicios: ${JSON.stringify(simplifiedServices).replaceAll('"', '')}.` : ''}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('envios')) {
                            const politics = await Politics.find().lean()
                            information = `${information}. ${JSON.stringify(politics[0].shipping).replaceAll('"', '')}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('horarios') || JSON.stringify(type.output_parsed).toLowerCase().includes('ubicación') || JSON.stringify(type.output_parsed).toLowerCase().includes('saludo')) {
                            const storeData = await StoreData.find().lean()
                            information = `${information}. ${JSON.stringify(storeData[0]).replaceAll('"', '')}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('garantia') || JSON.stringify(type.output_parsed).toLowerCase().includes('devoluciones')) {
                            const politics = await Politics.find().lean()
                            information = `${information}. ${JSON.stringify(politics[0].devolutions).replaceAll('"', '')}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('metodos de pago')) {
                            const politics = await Politics.find().lean()
                            information = `${information}. ${JSON.stringify(politics[0].pay).replaceAll('"', '')}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                            const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                            const nameDescriptions = calls.map(call => {
                                return {
                                    nameMeeting: call.nameMeeting,
                                    description: call.description.slice(0, 30)
                                }
                            })
                            const callsFilter = await openai.responses.parse({
                                model: "gpt-4o-mini",
                                input: [
                                    {"role": "system", "content": `El usuario busca agendar. Aquí tienes los agendamientos resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los nameMeeting de maximo 3 agendamientos que podrían encajar mejor con la intención del usuario`},
                                    ...conversation,
                                    {"role": "user", "content": message}
                                ],
                                text: {
                                    format: zodTextFormat(
                                        z.object({ nameMeetings: z.array(z.string()) }),
                                        "nameMeetings"
                                    )
                                }
                            });
                            const simplifiedCalls = calls.filter(call => callsFilter.output_parsed.nameMeetings?.includes(call.nameMeeting)).map(call => {
                                return {
                                    type: call.type,
                                    nameMeeting: call.nameMeeting,
                                    title: call.title,
                                    duration: call.duration,
                                    description: call.description.slice(0, 100)
                                }
                            })
                            information = `${information}. ${simplifiedCalls.length ? `${JSON.stringify(simplifiedCalls).replaceAll('"', '')}. Si el usuario quiere agendar una llamada identifica la llamada más adecuada y pon su link de esta forma: ${process.env.WEB_URL}/llamadas/Nombre%20de%20la%20llamada utilizando el call.nameMeeting.` : ''}`
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('intención de compra de productos')) {
                            let cart
                            cart = await Cart.findOne({ phone: number }).lean()
                            if (!cart) {
                                const newCart = new Cart({ cart: [], phone: number })
                                cart = await newCart.save()
                            }
                            const cartMinimal = cart.cart.length ? cart.cart.map(product => ({
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
        
    Carrito actual: ${JSON.stringify(cartMinimal).replaceAll('"', '')}.  
    Información de productos: ${information}.  

    Devuelve 2 cosas en JSON:
    1. "cart": el carrito actualizado (name, variation, quantity).  
    2. "message": un texto natural para enviar al usuario.  
    - Sigue preguntando qué más desea hasta que diga todo lo que quiere comprar.  
    - Si ya está listo para pagar, comparte este enlace: ${process.env.WEB_URL}/finalizar-compra?phone=${number}
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
                            await Cart.findOneAndUpdate({ phone: number }, { cart: enrichedCart })
                            await axios.post(`https://graph.facebook.com/v22.0/${integration.idPhone}/messages`, {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": act.output_parsed.message}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            })
                            const newMessage = new WhatsappMessage({phone: number, message: message, response: act.output_parsed.message, agent: false, view: false, tag: 'Productos'})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                        }
                        if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                            const response = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, se detecto la intención de hablar con alguien de soporte por ende se esta transfieriendo con alguien de soporte, genera una respuesta dejando saber esto al usuario utilizando la siguiente información: ${information}.`}]},
                                    ...context,
                                    {"role": "user", "content": [{"type": "text", "text": message}]}
                                ],
                                response_format: {"type": "text"},
                                temperature: 1,
                                max_completion_tokens: 1048,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                                store: false
                            });
                            await axios.post(`https://graph.facebook.com/v22.0/${integration.idPhone}/messages`, {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": response.choices[0].message.content}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            })
                            const newMessage = new WhatsappMessage({ phone: number, message: message, response: response.choices[0].message.content, agent: true, view: false, tag: 'Transferido' })
                            await newMessage.save()
                            io.emit('whatsapp', newMessage)
                            const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Whatsapp', url: '/mensajes', view: false })
                            await notification.save()
                            io.emit('newNotification')
                            return res.sendStatus(200)
                        }
                        if (information.length > 20) {
                            const response = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente en donde debes responder las preguntas de los usuarios unicamente con la siguiente información: ${information}. *No te hagas pasar por una persona, siempre deja claro que eres un agente con inteligencia artificial. *Responde de manera breve y clara.`}]},
                                    ...context,
                                    {"role": "user", "content": [{"type": "text", "text": message}]}
                                ],
                                response_format: {"type": "text"},
                                temperature: 1,
                                max_completion_tokens: 1048,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                                store: false
                            });
                            await axios.post(`https://graph.facebook.com/v22.0/${integration.idPhone}/messages`, {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": response.choices[0].message.content}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            }).catch((error) => console.log(error))
                            const newMessage = new WhatsappMessage({phone: number, message: message, response: response.choices[0].message.content, agent: false, view: false, tag: 'Agente IA'})
                            await newMessage.save()
                            return res.send(newMessage)
                        } else {
                            await axios.post(`https://graph.facebook.com/v22.0/${integration.idPhone}/messages`, {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte'}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            })
                            const newMessage = new WhatsappMessage({phone: number, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte', agent: true, view: false, tag: 'Agente IA'})
                            await newMessage.save()
                            return res.send(newMessage)
                        }
                    }
                } else {
                    return res.json({ message: 'Error: No existe el token de la app para Whatsapp' })
                }
            } else {
                const user = await User.findOne({ idPhone: req.body.entry[0].changes[0].value.metadata.phone_number_id }).lean()
                if (user) {
                    await axios.post(`${user.api}/webhook`, req.body)
                    return res.json({ success: 'OK' })
                } else {
                    return res.json({ message: 'Error: No existe cliente con este id.' })
                }
            }
        } else if (req.body?.entry && req.body.entry[0]?.messaging && req.body.entry[0].messaging[0]?.message?.text) {
            if (req.body.entry[0].id === integration.idPage || req.body.entry[0].id === integration.idInstagram) {
                if (req.body.entry[0].messaging[0].recipient.id === integration.idPage) {
                    const message = req.body.entry[0].messaging[0].message.text
                    const sender = req.body.entry[0].messaging[0].sender.id
                    if (integration.messengerToken) {
                        const messages = await MessengerMessage.find({messengerId: sender}).select('-messengerId -_id').sort({ createdAt: -1 }).limit(2).lean()
                        if (!messages.length) {
                            await ShopLogin.findByIdAndUpdate(shopLogin._id, { conversationsAI: shopLogin.conversationsAI - 1 })
                        }
                        if ((messages && messages.length && messages[0].agent) || shopLogin.conversationsAI < 1) {
                            const newMessage = new MessengerMessage({messengerId: sender, message: message, agent: true, view: false, tag: messages[0].tag})
                            await newMessage.save()
                            io.emit('messenger', newMessage)
                            const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Messenger', url: '/mensajes', view: false })
                            await notification.save()
                            io.emit('newNotification')
                            return res.sendStatus(200)
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
                                    {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra de productos, necesidad de alguien de soporte. *Si tiene la intención de hablar con alguien diferenciar bien si es que quiere una reunion por zoom o física que serian los agendamientos, o lo que busca es chatear con alguien de soporte, nunca agregar ambos."},
                                    ...conversation,
                                    {"role": "user", "content": message}
                                ],
                                text: {
                                    format: zodTextFormat(TypeSchema, "type"),
                                },
                            })
                            let information = ''
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos') || JSON.stringify(type.output_parsed).toLowerCase().includes('servicios')) {
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
                                        {"role": "system", "content": `El usuario busca productos. Aquí tienes el catálogo resumido: ${JSON.stringify(nameCategories).replaceAll('"', '')}. Devuelve los name de maximo 3 productos que podrían encajar mejor con la intención del usuario`},
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
                                const simplifiedProducts = products.filter(product => productsFilter.output_parsed.names?.includes(product.name)).map(product => {
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
                                const services = await Service.find().lean();
                                const nameDescriptions = services.map(service => {
                                    return {
                                        name: service.name,
                                        category: service.description.slice(0, 30)
                                    }
                                })
                                const servicesFilter = await openai.responses.parse({
                                    model: "gpt-4o-mini",
                                    input: [
                                        {"role": "system", "content": `El usuario busca información sobre servicios que ofrecemos. Aquí tienes los servicios resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los name de maximo 3 servicios que podrían encajar mejor segun el historial y el ultimo mensaje. *Unicamente en la respuesta pueden ir los name de los servicios, no puede ir ningun otro dato. *si en el historial de conversación se ha hablado de algun servicio agrega su name tambien.`},
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
                                const simplifiedServices = services.filter(service => servicesFilter.output_parsed.names?.includes(service.name)).map(service => {
                                    return {
                                        name: service.name,
                                        description: service.description.slice(0, 100),
                                        steps: service.steps,
                                        typeService: service.typeService,
                                        typePrice: service.typePrice,
                                        typePay: service.typePay,
                                        plans: service.plans?.plans?.map(p => ({
                                            name: p.name,
                                            description: p.description,
                                            price: p.price,
                                            anualPrice: p.anualPrice,
                                            characteristics: p.characteristics,
                                            functionalities: p.functionalities?.map(f => ({
                                                name: f.name,
                                                value: f.value
                                            }))
                                        }))
                                    }
                                })
                                information = `${information}. ${simplifiedProducts.length ? `Información de productos: ${JSON.stringify(simplifiedProducts).replaceAll('"', '')}. Si el usuario esta buscando un producto o le quieres recomendar un producto pon ${process.env.WEB_URL}/tienda/(slug de la categoria)/(slug del producto) para que pueda ver fotos y más detalles del producto, y siempre muestra todas las variantes del producto.` : ''} ${simplifiedServices.length ? `Información de servicios: ${JSON.stringify(simplifiedServices).replaceAll('"', '')}.` : ''}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('envios')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].shipping).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('horarios') || JSON.stringify(type.output_parsed).toLowerCase().includes('ubicación') || JSON.stringify(type.output_parsed).toLowerCase().includes('saludo')) {
                                const storeData = await StoreData.find().lean()
                                information = `${information}. ${JSON.stringify(storeData[0]).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('garantia') || JSON.stringify(type.output_parsed).toLowerCase().includes('devoluciones')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].devolutions).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('metodos de pago')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].pay).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                                const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                                const nameDescriptions = calls.map(call => {
                                    return {
                                        nameMeeting: call.nameMeeting,
                                        description: call.description.slice(0, 30)
                                    }
                                })
                                const callsFilter = await openai.responses.parse({
                                    model: "gpt-4o-mini",
                                    input: [
                                        {"role": "system", "content": `El usuario busca agendar. Aquí tienes los agendamientos resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los nameMeeting de maximo 3 agendamientos que podrían encajar mejor con la intención del usuario`},
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
                                const simplifiedCalls = calls.filter(call => callsFilter.output_parsed.nameMeetings?.includes(call.nameMeeting)).map(call => {
                                    return {
                                        type: call.type,
                                        nameMeeting: call.nameMeeting,
                                        title: call.title,
                                        duration: call.duration,
                                        description: call.description.slice(0, 100)
                                    }
                                })
                                information = `${information}. ${JSON.stringify(simplifiedCalls).replaceAll('"', '')}. Si el usuario quiere agendar una llamada identifica la llamada más adecuada y pon su link de esta forma: ${process.env.WEB_URL}/llamadas/Nombre%20de%20la%20llamada utilizando el call.nameMeeting`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('intención de compra de productos')) {
                                let cart
                                cart = await Cart.findOne({ messengerId: sender }).lean()
                                if (!cart) {
                                    const newCart = new Cart({ cart: [], messengerId: sender })
                                    cart = await newCart.save()
                                }
                                const cartMinimal = cart.cart.length ? cart.cart.map(product => ({
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
            
        Carrito actual: ${JSON.stringify(cartMinimal).replaceAll('"', '')}.  
        Información de productos: ${information}.  

        Devuelve 2 cosas en JSON:
        1. "cart": el carrito actualizado (name, variation, quantity).  
        2. "message": un texto natural para enviar al usuario.  
        - Sigue preguntando qué más desea hasta que diga todo lo que quiere comprar.  
        - Si ya está listo para pagar, comparte este enlace: ${process.env.WEB_URL}/finalizar-compra?messengerId=${sender}
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
                                await Cart.findOneAndUpdate({ messengerId: sender }, { cart: enrichedCart })
                                await axios.post(`https://graph.facebook.com/v21.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "messaging_type": "RESPONSE",
                                    "message": {
                                        "text": act.output_parsed.message
                                    }
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new MessengerMessage({messengerId: sender, message: message, response: act.output_parsed.message, agent: false, view: false, tag: 'Productos'})
                                const newMessageSave = await newMessage.save()
                                return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                                const response = await openai.chat.completions.create({
                                    model: "gpt-4o-mini",
                                    messages: [
                                        {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, se detecto la intención de hablar con alguien de soporte por ende se esta transfieriendo con alguien de soporte, genera una respuesta dejando saber esto al usuario utilizando la siguiente información: ${information}.`}]},
                                        ...context,
                                        {"role": "user", "content": [{"type": "text", "text": message}]}
                                    ],
                                    response_format: {"type": "text"},
                                    temperature: 1,
                                    max_completion_tokens: 1048,
                                    top_p: 1,
                                    frequency_penalty: 0,
                                    presence_penalty: 0,
                                    store: false
                                });
                                await axios.post(`https://graph.facebook.com/v21.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "messaging_type": "RESPONSE",
                                    "message": {
                                        "text": response.choices[0].message.content
                                    }
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new MessengerMessage({messengerId: sender, message: message, response: response.choices[0].message.content, agent: true, view: false, tag: 'Transferido' })
                                await newMessage.save()
                                io.emit('messenger', newMessage)
                                const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Messenger', url: '/mensajes', view: false })
                                await notification.save()
                                io.emit('newNotification')
                                return res.send(newMessage)
                            }
                            if (information.length > 20) {
                                const response = await openai.chat.completions.create({
                                    model: "gpt-4o-mini",
                                    messages: [
                                        {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente en donde debes responder las preguntas de los usuarios unicamente con la siguiente información: ${information}. *No te hagas pasar por una persona, siempre deja claro que eres un agente con inteligencia artificial. *Responde de manera breve y clara.`}]},
                                        ...context,
                                        {"role": "user", "content": [{"type": "text", "text": message}]}
                                    ],
                                    response_format: {"type": "text"},
                                    temperature: 1,
                                    max_completion_tokens: 1048,
                                    top_p: 1,
                                    frequency_penalty: 0,
                                    presence_penalty: 0,
                                    store: false
                                });
                                await axios.post(`https://graph.facebook.com/v21.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "messaging_type": "RESPONSE",
                                    "message": {
                                        "text": response.choices[0].message.content
                                    }
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new MessengerMessage({messengerId: sender, message: message, response: response.choices[0].message.content, agent: false, view: false, tag: 'Agente IA'})
                                await newMessage.save()
                                return res.send(newMessage)
                            } else {
                                await axios.post(`https://graph.facebook.com/v21.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "messaging_type": "RESPONSE",
                                    "message": {
                                        "text": 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte'
                                    }
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new MessengerMessage({messengerId: sender, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte', agent: true, view: false, tag: 'Transferido'})
                                await newMessage.save()
                                return res.send(newMessage)
                            }
                        }
                    } else {
                        return res.json({ message: 'Error: No existe el token de la app para Messenger' })
                    }
                } else if (req.body.entry[0].messaging[0].recipient.id === integration.idInstagram) {
                    const message = req.body.entry[0].messaging[0].message.text
                    const sender = req.body.entry[0].messaging[0].sender.id
                    if (integration.instagramToken) {
                        const messages = await InstagramMessage.find({instagramId: sender}).select('-instagramId -_id').sort({ createdAt: -1 }).limit(2).lean()
                        if (!messages.length) {
                            await ShopLogin.findByIdAndUpdate(shopLogin._id, { conversationsAI: shopLogin.conversationsAI - 1 })
                        }
                        if ((messages && messages.length && messages[0].agent) || shopLogin.conversationsAI < 1) {
                            const newMessage = new InstagramMessage({instagramId: sender, message: message, agent: true, view: false, tag: messages[0].tag})
                            await newMessage.save()
                            io.emit('instagram', newMessage)
                            const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Instagram', url: '/mensajes', view: false })
                            await notification.save()
                            io.emit('newNotification')
                            return res.sendStatus(200)
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
                                    {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra de productos, necesidad de alguien de soporte. *Si tiene la intención de hablar con alguien diferenciar bien si es que quiere una reunion por zoom o física que serian los agendamientos, o lo que busca es chatear con alguien de soporte, nunca agregar ambos."},
                                    ...conversation,
                                    {"role": "user", "content": message}
                                ],
                                text: {
                                    format: zodTextFormat(TypeSchema, "type"),
                                },
                            });
                            let information = ''
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos') || JSON.stringify(type.output_parsed).toLowerCase().includes('servicios')) {
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
                                        {"role": "system", "content": `El usuario busca productos. Aquí tienes el catálogo resumido: ${JSON.stringify(nameCategories).replaceAll('"', '')}. Devuelve los name de maximo 3 productos que podrían encajar mejor con la intención del usuario`},
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
                                const simplifiedProducts = products.filter(product => productsFilter.output_parsed.names?.includes(product.name)).map(product => {
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
                                const services = await Service.find().lean();
                                const nameDescriptions = services.map(service => {
                                    return {
                                        name: service.name,
                                        category: service.description.slice(0, 30)
                                    }
                                })
                                const servicesFilter = await openai.responses.parse({
                                    model: "gpt-4o-mini",
                                    input: [
                                        {"role": "system", "content": `El usuario busca información sobre servicios que ofrecemos. Aquí tienes los servicios resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los name de maximo 3 servicios que podrían encajar mejor segun el historial y el ultimo mensaje. *Unicamente en la respuesta pueden ir los name de los servicios, no puede ir ningun otro dato. *si en el historial de conversación se ha hablado de algun servicio agrega su name tambien.`},
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
                                const simplifiedServices = services.filter(service => servicesFilter.output_parsed.names?.includes(service.name)).map(service => {
                                    return {
                                        name: service.name,
                                        description: service.description.slice(0, 100),
                                        steps: service.steps,
                                        typeService: service.typeService,
                                        typePrice: service.typePrice,
                                        typePay: service.typePay,
                                        plans: service.plans?.plans?.map(p => ({
                                            name: p.name,
                                            description: p.description,
                                            price: p.price,
                                            anualPrice: p.anualPrice,
                                            characteristics: p.characteristics,
                                            functionalities: p.functionalities?.map(f => ({
                                                name: f.name,
                                                value: f.value
                                            }))
                                        }))
                                    }
                                })
                                information = `${information}. ${simplifiedProducts.length ? `Información de productos: ${JSON.stringify(simplifiedProducts).replaceAll('"', '')}. Si el usuario esta buscando un producto o le quieres recomendar un producto pon ${process.env.WEB_URL}/tienda/(slug de la categoria)/(slug del producto) para que pueda ver fotos y más detalles del producto, y siempre muestra todas las variantes del producto.` : ''} ${simplifiedServices.length ? `Información de servicios: ${JSON.stringify(simplifiedServices).replaceAll('"', '')}.` : ''}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('envios')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].shipping).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('horarios') || JSON.stringify(type.output_parsed).toLowerCase().includes('ubicación') || JSON.stringify(type.output_parsed).toLowerCase().includes('saludo')) {
                                const storeData = await StoreData.find().lean()
                                information = `${information}. ${JSON.stringify(storeData[0]).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('garantia') || JSON.stringify(type.output_parsed).toLowerCase().includes('devoluciones')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].devolutions).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('metodos de pago')) {
                                const politics = await Politics.find().lean()
                                information = `${information}. ${JSON.stringify(politics[0].pay).replaceAll('"', '')}`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                                const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                                const nameDescriptions = calls.map(call => {
                                    return {
                                        nameMeeting: call.nameMeeting,
                                        description: call.description.slice(0, 30)
                                    }
                                })
                                const callsFilter = await openai.responses.parse({
                                    model: "gpt-4o-mini",
                                    input: [
                                        {"role": "system", "content": `El usuario busca agendar. Aquí tienes los agendamientos resumido: ${JSON.stringify(nameDescriptions).replaceAll('"', '')}. Devuelve los nameMeeting de maximo 3 agendamientos que podrían encajar mejor con la intención del usuario`},
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
                                const simplifiedCalls = calls.filter(call => callsFilter.output_parsed.nameMeetings?.includes(call.nameMeeting)).map(call => {
                                    return {
                                        type: call.type,
                                        nameMeeting: call.nameMeeting,
                                        title: call.title,
                                        duration: call.duration,
                                        description: call.description.slice(0, 100)
                                    }
                                })
                                information = `${information}. ${JSON.stringify(simplifiedCalls).replaceAll('"', '')}. Si el usuario quiere agendar una llamada identifica la llamada más adecuada y pon su link de esta forma: ${process.env.WEB_URL}/llamadas/Nombre%20de%20la%20llamada utilizando el call.nameMeeting`
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('intención de compra de productos')) {
                                let cart
                                cart = await Cart.findOne({ instagramId: sender }).lean()
                                if (!cart) {
                                    const newCart = new Cart({ cart: [], instagramId: sender })
                                    cart = await newCart.save()
                                }
                                const cartMinimal = cart.cart.length ? cart.cart.map(product => ({
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
            
        Carrito actual: ${JSON.stringify(cartMinimal).replaceAll('"', '')}.  
        Información de productos: ${information}.  

        Devuelve 2 cosas en JSON:
        1. "cart": el carrito actualizado (name, variation, quantity).  
        2. "message": un texto natural para enviar al usuario.  
        - Sigue preguntando qué más desea hasta que diga todo lo que quiere comprar.  
        - Si ya está listo para pagar, comparte este enlace: ${process.env.WEB_URL}/finalizar-compra?instagramId=${sender}
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
                                await Cart.findOneAndUpdate({ instagramId: sender }, { cart: enrichedCart })
                                await axios.post(`https://graph.facebook.com/v23.0/${integration.idInstagram}/messages`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "message": {
                                        "text": act.output_parsed.message
                                    }
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${integration.instagramToken}`,
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new InstagramMessage({instagramId: sender, message: message, response: act.output_parsed.message, agent: false, view: false, tag: 'Productos'})
                                const newMessageSave = await newMessage.save()
                                return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                            }
                            if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                                const response = await openai.chat.completions.create({
                                    model: "gpt-4o-mini",
                                    messages: [
                                        {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, se detecto la intención de hablar con alguien de soporte por ende se esta transfieriendo con alguien de soporte, genera una respuesta dejando saber esto al usuario utilizando la siguiente información: ${information}.`}]},
                                        ...context,
                                        {"role": "user", "content": [{"type": "text", "text": message}]}
                                    ],
                                    response_format: {"type": "text"},
                                    temperature: 1,
                                    max_completion_tokens: 1048,
                                    top_p: 1,
                                    frequency_penalty: 0,
                                    presence_penalty: 0,
                                    store: false
                                });
                                await axios.post(`https://graph.instagram.com/v23.0/${integration.idInstagram}/messages`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "message": {
                                        "text": response.choices[0].message.content
                                    }
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${integration.instagramToken}`,
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new InstagramMessage({instagramId: sender, message: message, response: response.choices[0].message.content, agent: true, view: false, tag: 'Transferido' })
                                await newMessage.save()
                                io.emit('instagram', newMessage)
                                const notification = new Notification({ title: 'Nuevo mensaje', description: 'Nuevo mensaje de Instagram', url: '/mensajes', view: false })
                                await notification.save()
                                io.emit('newNotification')
                                return res.send(newMessage)
                            }
                            if (information.length > 20) {
                                const response = await openai.chat.completions.create({
                                    model: "gpt-4o-mini",
                                    messages: [
                                        {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente en donde debes responder las preguntas de los usuarios unicamente con la siguiente información: ${information}. *No te hagas pasar por una persona, siempre deja claro que eres un agente con inteligencia artificial. *Responde de manera breve y clara.`}]},
                                        ...context,
                                        {"role": "user", "content": [{"type": "text", "text": message}]}
                                    ],
                                    response_format: {"type": "text"},
                                    temperature: 1,
                                    max_completion_tokens: 1048,
                                    top_p: 1,
                                    frequency_penalty: 0,
                                    presence_penalty: 0,
                                    store: false
                                });
                                await axios.post(`https://graph.instagram.com/v23.0/${integration.idInstagram}/messages`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "message": {
                                        "text": response.choices[0].message.content
                                    }
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${integration.instagramToken}`,
                                        'Content-Type': 'application/json'
                                    }
                                }).catch((error) => console.log(error.response.data))
                                const newMessage = new InstagramMessage({instagramId: sender, message: message, response: response.choices[0].message.content, agent: false, view: false, tag: 'Agente IA'})
                                await newMessage.save()
                                return res.send(newMessage)
                            } else {
                                await axios.post(`https://graph.instagram.com/v23.0/${integration.idInstagram}/messages`, {
                                    "recipient": {
                                        "id": sender
                                    },
                                    "message": {
                                        "text": 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte'
                                    }
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${integration.instagramToken}`,
                                        'Content-Type': 'application/json'
                                    }
                                })
                                const newMessage = new InstagramMessage({instagramId: sender, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, te estoy transfiriendo con alguien de soporte', agent: true, view: false, tag: 'Agente IA'})
                                await newMessage.save()
                                return res.send(newMessage)
                            }
                        }
                    } else {
                        return res.json({ message: 'Error: No existe el token de la app para Messenger' })
                    }
                }
            } else {
                const user = await User.findOne({
                    $or: [
                        { idPage: req.body.entry[0].id },
                        { idInstagram: req.body.entry[0].id }
                    ]
                }).lean();
                if (user) {
                    await axios.post(`${user.api}/webhook`, req.body)
                    return res.json({ success: 'OK' })
                } else {
                    return res.json({ message: 'Error: No existe cliente con este id.' })
                }
            }
        } else if (req.body?.entry && req.body.entry[0]?.changes[0]?.value?.text) {
            if (req.body.entry[0].id === integration.idInstagram) {
                const sender = req.body.entry[0].changes[0].value.from?.id
                const comment = req.body.entry[0].changes[0].value.text
                const id = req.body.entry[0].changes[0].value.id
                const comments = await Comment.find().lean()
                const commentAutomatization = comments.find(com => comment.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(com.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
                if (commentAutomatization) {
                    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
                    const response = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {"role": "system", "content": [{"type": "text", "text": `Estas respondiendo un comentario de Instagram de alguien que comento la palabra la cual activa una automatización, las instrucciones de la respuesta son: ${commentAutomatization.replyPromt}.`}]},
                            ...context,
                            {"role": "user", "content": [{"type": "text", "text": message}]}
                        ],
                        response_format: {"type": "text"},
                        temperature: 1,
                        max_completion_tokens: 1048,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                        store: false
                    });
                    await axios.post(`https://graph.instagram.com/v23.0/${id}/replies`, {
                        "message": response.choices[0].message.content
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    await axios.post(`https://graph.instagram.com/v23.0/${integration.idInstagram}/messages`, {
                        "recipient": {
                            "id": sender
                        },
                        "message": {
                            "text": commentAutomatization.message
                        }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${integration.instagramToken}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    const newMessage = new InstagramMessage({instagramId: sender, message: message, response: commentAutomatization.message, agent: false, view: false, tag: 'Agente IA'})
                    await newMessage.save()
                    return res.send(newMessage)
                }
            } else {
                const user = await User.findOne({
                    $or: [
                        { idPage: req.body.entry[0].id },
                        { idInstagram: req.body.entry[0].id }
                    ]
                }).lean();
                if (user) {
                    await axios.post(`${user.api}/webhook`, req.body)
                    return res.json({ success: 'OK' })
                } else {
                    return res.json({ message: 'Error: No existe cliente con este id.' })
                }
            }
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const callbackFacebook = async (req, res) => {
    try {
        const { code, state } = req.query;

        const response = await axios.post(
            'https://api.instagram.com/oauth/access_token', qs.stringify({
                client_id: process.env.IG_APP_ID,
                client_secret: process.env.IG_APP_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: process.env.FB_REDIRECT_URI,
                code,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token } = response.data;

        // Intercambiar el token de corta duración por uno de larga duración
        const longLivedTokenResponse = await axios.get(
            `https://graph.instagram.com/access_token`,
            {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: process.env.IG_APP_SECRET,
                    access_token,
                },
            }
        );

        const longLivedAccessToken = longLivedTokenResponse.data.access_token;

        // Obtener el ID de la cuenta de Instagram
        const accountResponse = await axios.get(
            `https://graph.instagram.com/v23.0/me`,
            {
                params: {
                    fields: 'user_id',
                    access_token: longLivedAccessToken,
                },
            }
        );

        const { user_id: instagramBusinessAccountId } = accountResponse.data;

        // Suscribirse al webhook de mensajes
        await axios.post(
            `https://graph.instagram.com/v23.0/${instagramBusinessAccountId}/subscribed_apps`,
            null,
            {
                params: {
                    subscribed_fields: 'messages',
                    access_token: longLivedAccessToken,
                },
            }
        );

        if (state) {
            const user = await User.findOne({ instagramState: state }).lean()
            if (user) {
                await axios.post(`${user.api}/integrations`, { instagramToken: longLivedAccessToken, idInstagram: instagramBusinessAccountId })
                await User.findByIdAndUpdate(user._id, { idInstagram: instagramBusinessAccountId })
                return res.redirect(`${user.admin}/instagram-oauth-success?status=ok`)
            }
        }

        const integrations = await Integration.findOne().lean();
        if (integrations) {
            await Integration.findByIdAndUpdate(integrations._id, {
                instagramToken: longLivedAccessToken,
                idInstagram: instagramBusinessAccountId
            });
        } else {
            const newIntegration = new Integration({
                instagramToken: longLivedAccessToken,
                idInstagram: instagramBusinessAccountId
            })
            await newIntegration.save()
        }
    
        return res.redirect(`${process.env.ADMIN_URL}/instagram-oauth-success?status=ok`)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

function parseSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split('.', 2);
  const sig = Buffer.from(encodedSig + '='.repeat((4 - encodedSig.length % 4) % 4), 'base64');
  const data = JSON.parse(Buffer.from(payload + '='.repeat((4 - payload.length % 4) % 4), 'base64').toString('utf8'));

  const expected = crypto.createHmac('sha256', process.env.FB_APP_SECRET)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expected)) {
    return null;
  }
  return data;
}

export const deleteData = async (req, res) => {
    try {
        const signedRequest = req.body.signed_request;
        const data = parseSignedRequest(signedRequest);
        if (!data || !data.user_id) {
            return res.status(400).send('Invalid request');
        }
        const userId = data.user_id;
        const integrations = await Integration.findOne({ $or: [{ idInstagram: userId }, { idPage: userId }, { idPhone: userId }] }).lean()
        if (integrations) {
            if (integrations.idInstagram === userId) {
                await Integration.findByIdAndUpdate(integrations._id, { idInstagram: '', instagramToken: '' })
            } else if (integrations.idPage === userId) {
                await Integration.findByIdAndUpdate(integrations._id, { idPage: '', messengerToken: '' })
            } else if (integrations.idPhone === userId) {
                await Integration.findByIdAndUpdate(integrations._id, { idPhone: '', whatsappToken: '' })
            }
        } else {
            const user = await User.findOne({
                $or: [
                    { idPage: userId },
                    { idInstagram: userId },
                    { idPhone: userId }
                ]
            }).lean();
            if (user) {
                if (user.idInstagram === userId) {
                    await axios.post(`${user.api}/integrations`, { idInstagram: '', instagramToken: '' })
                } else if (user.idPage === userId) {
                    await axios.post(`${user.api}/integrations`,  { idPage: '', messengerToken: '' })
                } else if (user.idPhone === userId) {
                    await axios.post(`${user.api}/integrations`,  { idPhone: '', whatsappToken: '' })
                }
            }
        }
        const confirmationCode = `del_${userId}_${Date.now()}`;
        const statusUrl = `${process.env.MY_PUBLIC_URL}/delete-status?code=${confirmationCode}`;
        res.status(200).json({
            url: statusUrl,
            confirmation_code: confirmationCode
        });
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deleteStatus = async (req, res) => {
    try {
        res.json({ status: 'deleted', message: 'Datos eliminados' });
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
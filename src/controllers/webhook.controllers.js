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
        if (req.body?.entry && req.body.entry[0]?.changes && req.body.entry[0].changes[0]?.value?.messages && 
            req.body.entry[0].changes[0].value.messages[0]?.text && req.body.entry[0].changes[0].value.messages[0].text.body) {  
            const message = req.body.entry[0].changes[0].value.messages[0].text.body
            const number = req.body.entry[0].changes[0].value.messages[0].from
            const integration = await Integration.findOne().lean()
            if (integration.whatsappToken && integration.whatsappToken !== '') {
                const messages = await WhatsappMessage.find({phone: number}).select('-phone -_id').sort({ createdAt: -1 }).limit(2).lean()
                if (messages && messages.length && messages[0].agent) {
                    const newMessage = new WhatsappMessage({phone: number, message: message, agent: true, view: false})
                    await newMessage.save()
                    io.emit('whatsapp', newMessage)
                    return res.sendStatus(200)
                } else {
                    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
                    let products
                    const context = messages.reverse().flatMap(ult => {
                        const userMessage = ult.message ? [{"role": "user", "content": [{"type": "text", "text": ult.message}]}] : [];
                        const assistantMessage = ult.response ? [{"role": "assistant", "content": [{"type": "text", "text": ult.response}]}] : [];
                        return [...userMessage, ...assistantMessage];
                    });
                    const conversation = messages.reverse().flatMap(ult => {
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
                            {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra, necesidad de alguien de soporte. Nota: *Solo incluye 'intención de compra' si el usuario expresa deseo de adquirir o añadir al carrito; en ese caso, también incluye 'productos'. *Si la intecion es servicios tambien incluir agendamientos."},
                            ...conversation,
                            {"role": "user", "content": message}
                        ],
                        text: {
                            format: zodTextFormat(TypeSchema, "type"),
                        },
                    });
                    let information = ''
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                        await axios.post('https://graph.facebook.com/v16.0/108940562202993/messages', {
                            "messaging_product": "whatsapp",
                            "to": number,
                            "type": "text",
                            "text": {"body": 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento'}
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                "Authorization": `Bearer ${integration.whatsappToken}`
                            }
                        })
                        const newMessage = new WhatsappMessage({ phone: number, message: message, response: 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento', agent: true, view: false })
                        await newMessage.save()
                        io.emit('whatsapp', newMessage)
                        return res.send(newMessage)
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos')) {
                        products = await Product.find().lean()
                        const simplifiedProducts = products.map(product => {
                            const variations = Array.isArray(product.variations?.variations) 
                                ? product.variations.variations.map(v => ({
                                    color: v.variation,
                                    talla: v.subVariation,
                                    stock: v.stock,
                                })) 
                                : [];
                            return {
                                name: product.name,
                                description: product.description?.slice(0, 200) + '...',
                                price: product.price,
                                beforePrice: product.beforePrice,
                                stock: product.stock,
                                slug: product.slug,
                                variations,
                                category: product.category
                            }
                        })
                        information = `${information}. ${JSON.stringify(simplifiedProducts)}. Si el usuario quiere comprar un producto pon <a href="/tienda/(slug de la categoria)/(slug del producto)">(nombre del producto)</a>"`
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
                        const serviceIds = services.map(service => service._id);
                        const funnels = await Funnel.find({ service: { $in: serviceIds } }).lean();
                        information = `${information}. ${JSON.stringify(services)}. En donde adicionalmente tienes la información de los embudos de ventas en donde en el dato service esta el _id del servicio relacionado. ${JSON.stringify(funnels)}`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                        const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                        information = `${information}. ${JSON.stringify(calls)}. Si el usuario quiere agendar una llamada pon <a href="/llamadas/Llamada%20de%20orientación">Llamada de orientación</a> en el caso que el nombre de la llamada sea "Llamada de orientación"`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('compra')) {
                        const cart = await Cart.findOne({ phone: number }).lean()
                        const CartSchema = z.object({
                            cart: z.array(z.object({
                                name: z.string(),
                                variation: z.object({
                                    variation: z.string(),
                                    subVariation: z.string(),
                                    subVariation2: z.string(),
                                }),
                                quantity: z.string()
                            })),
                            ready: z.boolean()
                        });
                        const act = await openai.responses.parse({
                            model: "gpt-4o-mini",
                            input: [
                                {"role": "system", "content": `Evalúa si el usuario ya agrego todos los productos que necesita en base a el modelo de carrito ${JSON.stringify(cart.cart)}, al historial de conversación y el último mensaje del usuario, si es asi establece 'ready' en true; de lo contrario, en false. Actualiza el modelo si el usuario agrego algun producto, quito alguno o modifico alguno, utilizando la información adicional disponible ${information}. Observaciones: *Si aun el usuario no especifica que no busca mas productos que ready quede en false.`},
                                ...conversation,
                                {"role": "user", "content": message}
                            ],
                            text: {
                                format: zodTextFormat(CartSchema, "cart"),
                            },
                        });
                        const enrichedCart = act.output_parsed.cart.map(item => {
                            const product = products.find(p => p.name === item.name);
                            if (!product) return null
                            let matchedVariation = null
                            if (product.variations?.variations?.length) {
                                matchedVariation = product.variations.variations.find(v => {
                                    const variationMatch = v.variation === item.variation?.variation;
                                    const subVariationMatch = v.subVariation === item.variation?.subVariation || v.subVariation === undefined;
                                    const subVariation2Match = v.subVariation2 === item.variation?.subVariation2 || v.subVariation2 === undefined;
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
                                sku: matchedVariation?.sku || ''
                            };
                        }).filter(Boolean);
                        await Cart.findOneAndUpdate({ phone: number }, { cart: enrichedCart })
                        if (act.output_parsed.ready) {
                            await axios.post('https://graph.facebook.com/v16.0/108940562202993/messages', {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            })
                            const newMessage = new WhatsappMessage({phone: number, message: message, response: `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`, agent: false, view: false, ready: true})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: true })
                        } else {
                            const get = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, el usuario esta en una etapa de compra, en base al historial de conversación, al ultimo mensaje del usuario y a la información de este modelo: ${JSON.stringify(act.output_parsed)}. Sigue preguntando que productos busca hasta que el usuario diga todo lo que necesita comprar, tambien te puedes apoyar en esta información para hacerlo: ${information}`}]},
                                    ...context,
                                    {"role": "user", "content": [{"type": "text", "text": message}]}
                                ],
                                response_format: {"type": "text"},
                                temperature: 1,
                                max_completion_tokens: 2048,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                                store: false
                            });
                            await axios.post('https://graph.facebook.com/v16.0/108940562202993/messages', {
                                "messaging_product": "whatsapp",
                                "to": number,
                                "type": "text",
                                "text": {"body": get.choices[0].message.content}
                            }, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    "Authorization": `Bearer ${integration.whatsappToken}`
                                }
                            })
                            const newMessage = new WhatsappMessage({phone: number, message: message, response: get.choices[0].message.content, agent: false, view: false})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                        }
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
                            max_completion_tokens: 2048,
                            top_p: 1,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            store: false
                        });
                        await axios.post('https://graph.facebook.com/v16.0/108940562202993/messages', {
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
                        const newMessage = new WhatsappMessage({phone: number, message: message, response: response.choices[0].message.content, agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    } else {
                        await axios.post('https://graph.facebook.com/v16.0/108940562202993/messages', {
                            "messaging_product": "whatsapp",
                            "to": number,
                            "type": "text",
                            "text": {"body": 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar'}
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                "Authorization": `Bearer ${integration.whatsappToken}`
                            }
                        })
                        const newMessage = new WhatsappMessage({phone: number, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar', agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    }
                }
            } else {
                return res.json({ message: 'Error: No existe el token de la app para Whatsapp' })
            }
        } else if (req.body?.entry && req.body.entry[0]?.messaging && req.body.entry[0].messaging[0]?.message?.text) {
            const message = req.body.entry[0].messaging[0].message.text
            const sender = req.body.entry[0].messaging[0].sender.id
            const integration = await Integration.findOne().lean()
            if (integration.messengerToken) {
                const messages = await MessengerMessage.find({messengerId: sender}).select('-messengerId -_id').sort({ createdAt: -1 }).limit(2).lean()
                if (messages && messages.length && messages[0].agent) {
                    const newMessage = new MessengerMessage({messengerId: sender, message: message, agent: true, view: false})
                    await newMessage.save()
                    io.emit('whatsapp', newMessage)
                    return res.sendStatus(200)
                } else {
                    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
                    let products
                    const context = messages.reverse().flatMap(ult => {
                        const userMessage = ult.message ? [{"role": "user", "content": [{"type": "text", "text": ult.message}]}] : [];
                        const assistantMessage = ult.response ? [{"role": "assistant", "content": [{"type": "text", "text": ult.response}]}] : [];
                        return [...userMessage, ...assistantMessage];
                    });
                    const conversation = messages.reverse().flatMap(ult => {
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
                            {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra, necesidad de alguien de soporte. Nota: *Solo incluye 'intención de compra' si el usuario expresa deseo de adquirir o añadir al carrito; en ese caso, también incluye 'productos'. *Si la intecion es servicios tambien incluir agendamientos."},
                            ...conversation,
                            {"role": "user", "content": message}
                        ],
                        text: {
                            format: zodTextFormat(TypeSchema, "type"),
                        },
                    });
                    let information = ''
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                        await axios.post(`https://graph.facebook.com/v16.0/${integration.idPage}/messages?access_token=${integration.messengerToken}`, {
                            "recipient": {
                                "id": sender
                            },
                            "messaging_type": "RESPONSE",
                            "message": {
                                "text": 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento'
                            }
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        const newMessage = new MessengerMessage({messengerId: sender, message: message, response: 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento', agent: true, view: false })
                        await newMessage.save()
                        io.emit('whatsapp', newMessage)
                        return res.send(newMessage)
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos')) {
                        products = await Product.find().lean()
                        const simplifiedProducts = products.map(product => {
                            const variations = Array.isArray(product.variations?.variations) 
                                ? product.variations.variations.map(v => ({
                                    color: v.variation,
                                    talla: v.subVariation,
                                    stock: v.stock,
                                })) 
                                : [];
                            return {
                                name: product.name,
                                description: product.description?.slice(0, 200) + '...',
                                price: product.price,
                                beforePrice: product.beforePrice,
                                stock: product.stock,
                                slug: product.slug,
                                variations,
                                category: product.category
                            }
                        })
                        information = `${information}. ${JSON.stringify(simplifiedProducts)}. Si el usuario quiere comprar un producto pon <a href="/tienda/(slug de la categoria)/(slug del producto)">(nombre del producto)</a>"`
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
                        const serviceIds = services.map(service => service._id);
                        const funnels = await Funnel.find({ service: { $in: serviceIds } }).lean();
                        information = `${information}. ${JSON.stringify(services)}. En donde adicionalmente tienes la información de los embudos de ventas en donde en el dato service esta el _id del servicio relacionado. ${JSON.stringify(funnels)}`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                        const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                        information = `${information}. ${JSON.stringify(calls)}. Si el usuario quiere agendar una llamada pon <a href="/llamadas/Llamada%20de%20orientación">Llamada de orientación</a> en el caso que el nombre de la llamada sea "Llamada de orientación"`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('compra')) {
                        const cart = await Cart.findOne({ phone: number }).lean()
                        const CartSchema = z.object({
                            cart: z.array(z.object({
                                name: z.string(),
                                variation: z.object({
                                    variation: z.string(),
                                    subVariation: z.string(),
                                    subVariation2: z.string(),
                                }),
                                quantity: z.string()
                            })),
                            ready: z.boolean()
                        });
                        const act = await openai.responses.parse({
                            model: "gpt-4o-mini",
                            input: [
                                {"role": "system", "content": `Evalúa si el usuario ya agrego todos los productos que necesita en base a el modelo de carrito ${JSON.stringify(cart.cart)}, al historial de conversación y el último mensaje del usuario, si es asi establece 'ready' en true; de lo contrario, en false. Actualiza el modelo si el usuario agrego algun producto, quito alguno o modifico alguno, utilizando la información adicional disponible ${information}. Observaciones: *Si aun el usuario no especifica que no busca mas productos que ready quede en false.`},
                                ...conversation,
                                {"role": "user", "content": message}
                            ],
                            text: {
                                format: zodTextFormat(CartSchema, "cart"),
                            },
                        });
                        const enrichedCart = act.output_parsed.cart.map(item => {
                            const product = products.find(p => p.name === item.name);
                            if (!product) return null
                            let matchedVariation = null
                            if (product.variations?.variations?.length) {
                                matchedVariation = product.variations.variations.find(v => {
                                    const variationMatch = v.variation === item.variation?.variation;
                                    const subVariationMatch = v.subVariation === item.variation?.subVariation || v.subVariation === undefined;
                                    const subVariation2Match = v.subVariation2 === item.variation?.subVariation2 || v.subVariation2 === undefined;
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
                                sku: matchedVariation?.sku || ''
                            };
                        }).filter(Boolean);
                        await Cart.findOneAndUpdate({ phone: number }, { cart: enrichedCart })
                        if (act.output_parsed.ready) {
                            await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                                "recipient": {
                                    "id": sender
                                },
                                "messaging_type": "RESPONSE",
                                "message": {
                                    "text": `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`
                                }
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            const newMessage = new MessengerMessage({messengerId: sender, message: message, response: `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`, agent: false, view: false, ready: true})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: true })
                        } else {
                            const get = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, el usuario esta en una etapa de compra, en base al historial de conversación, al ultimo mensaje del usuario y a la información de este modelo: ${JSON.stringify(act.output_parsed)}. Sigue preguntando que productos busca hasta que el usuario diga todo lo que necesita comprar, tambien te puedes apoyar en esta información para hacerlo: ${information}`}]},
                                    ...context,
                                    {"role": "user", "content": [{"type": "text", "text": message}]}
                                ],
                                response_format: {"type": "text"},
                                temperature: 1,
                                max_completion_tokens: 2048,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                                store: false
                            });
                            await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                                "recipient": {
                                    "id": sender
                                },
                                "messaging_type": "RESPONSE",
                                "message": {
                                    "text": get.choices[0].message.content
                                }
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            const newMessage = new MessengerMessage({messengerId: sender, message: message, response: get.choices[0].message.content, agent: false, view: false})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                        }
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
                            max_completion_tokens: 2048,
                            top_p: 1,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            store: false
                        });
                        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
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
                        const newMessage = new MessengerMessage({messengerId: sender, message: message, response: response.choices[0].message.content, agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    } else {
                        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                            "recipient": {
                                "id": sender
                            },
                            "messaging_type": "RESPONSE",
                            "message": {
                                "text": 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar'
                            }
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        const newMessage = new MessengerMessage({messengerId: sender, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar', agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    }
                }
            } else {
                return res.json({ message: 'Error: No existe el token de la app para Messenger' })
            }
        } else if (req.body?.entry && req.body.entry[0]?.messaging && req.body.entry[0].messaging[0]?.message?.text) {
            const message = req.body.entry[0].messaging[0].message.text
            const sender = req.body.entry[0].messaging[0].sender.id
            const integration = await Integration.findOne().lean()
            if (integration.messengerToken) {
                const messages = await InstagramMessage.find({instagramId: sender}).select('-instagramId -_id').sort({ createdAt: -1 }).limit(2).lean()
                if (messages && messages.length && messages[0].agent) {
                    const newMessage = new InstagramMessage({instagramId: sender, message: message, agent: true, view: false})
                    await newMessage.save()
                    io.emit('whatsapp', newMessage)
                    return res.sendStatus(200)
                } else {
                    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
                    let products
                    const context = messages.reverse().flatMap(ult => {
                        const userMessage = ult.message ? [{"role": "user", "content": [{"type": "text", "text": ult.message}]}] : [];
                        const assistantMessage = ult.response ? [{"role": "assistant", "content": [{"type": "text", "text": ult.response}]}] : [];
                        return [...userMessage, ...assistantMessage];
                    });
                    const conversation = messages.reverse().flatMap(ult => {
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
                            {"role": "system", "content": "Analiza el historial de conversación y el último mensaje del usuario. Devuelve las intenciones detectadas, intenciones: saludo, productos, envíos, horarios, ubicación, garantía, devoluciones, métodos de pago, servicios, agendamientos, intención de compra, necesidad de alguien de soporte. Nota: *Solo incluye 'intención de compra' si el usuario expresa deseo de adquirir o añadir al carrito; en ese caso, también incluye 'productos'. *Si la intecion es servicios tambien incluir agendamientos."},
                            ...conversation,
                            {"role": "user", "content": message}
                        ],
                        text: {
                            format: zodTextFormat(TypeSchema, "type"),
                        },
                    });
                    let information = ''
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('soporte')) {
                        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                            "recipient": {
                                "id": sender
                            },
                            "messaging_type": "RESPONSE",
                            "message": {
                                "text": 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento'
                            }
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        const newMessage = new InstagramMessage({instagramId: sender, message: message, response: 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento', agent: true, view: false })
                        await newMessage.save()
                        io.emit('whatsapp', newMessage)
                        return res.send(newMessage)
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('productos')) {
                        products = await Product.find().lean()
                        const simplifiedProducts = products.map(product => {
                            const variations = Array.isArray(product.variations?.variations) 
                                ? product.variations.variations.map(v => ({
                                    color: v.variation,
                                    talla: v.subVariation,
                                    stock: v.stock,
                                })) 
                                : [];
                            return {
                                name: product.name,
                                description: product.description?.slice(0, 200) + '...',
                                price: product.price,
                                beforePrice: product.beforePrice,
                                stock: product.stock,
                                slug: product.slug,
                                variations,
                                category: product.category
                            }
                        })
                        information = `${information}. ${JSON.stringify(simplifiedProducts)}. Si el usuario quiere comprar un producto pon <a href="/tienda/(slug de la categoria)/(slug del producto)">(nombre del producto)</a>"`
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
                        const serviceIds = services.map(service => service._id);
                        const funnels = await Funnel.find({ service: { $in: serviceIds } }).lean();
                        information = `${information}. ${JSON.stringify(services)}. En donde adicionalmente tienes la información de los embudos de ventas en donde en el dato service esta el _id del servicio relacionado. ${JSON.stringify(funnels)}`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('agendamientos')) {
                        const calls = await Call.find().select('-_id -labels -buttonText -tags -action -message').lean()
                        information = `${information}. ${JSON.stringify(calls)}. Si el usuario quiere agendar una llamada pon <a href="/llamadas/Llamada%20de%20orientación">Llamada de orientación</a> en el caso que el nombre de la llamada sea "Llamada de orientación"`
                    }
                    if (JSON.stringify(type.output_parsed).toLowerCase().includes('compra')) {
                        const cart = await Cart.findOne({ phone: number }).lean()
                        const CartSchema = z.object({
                            cart: z.array(z.object({
                                name: z.string(),
                                variation: z.object({
                                    variation: z.string(),
                                    subVariation: z.string(),
                                    subVariation2: z.string(),
                                }),
                                quantity: z.string()
                            })),
                            ready: z.boolean()
                        });
                        const act = await openai.responses.parse({
                            model: "gpt-4o-mini",
                            input: [
                                {"role": "system", "content": `Evalúa si el usuario ya agrego todos los productos que necesita en base a el modelo de carrito ${JSON.stringify(cart.cart)}, al historial de conversación y el último mensaje del usuario, si es asi establece 'ready' en true; de lo contrario, en false. Actualiza el modelo si el usuario agrego algun producto, quito alguno o modifico alguno, utilizando la información adicional disponible ${information}. Observaciones: *Si aun el usuario no especifica que no busca mas productos que ready quede en false.`},
                                ...conversation,
                                {"role": "user", "content": message}
                            ],
                            text: {
                                format: zodTextFormat(CartSchema, "cart"),
                            },
                        });
                        const enrichedCart = act.output_parsed.cart.map(item => {
                            const product = products.find(p => p.name === item.name);
                            if (!product) return null
                            let matchedVariation = null
                            if (product.variations?.variations?.length) {
                                matchedVariation = product.variations.variations.find(v => {
                                    const variationMatch = v.variation === item.variation?.variation;
                                    const subVariationMatch = v.subVariation === item.variation?.subVariation || v.subVariation === undefined;
                                    const subVariation2Match = v.subVariation2 === item.variation?.subVariation2 || v.subVariation2 === undefined;
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
                                sku: matchedVariation?.sku || ''
                            };
                        }).filter(Boolean);
                        await Cart.findOneAndUpdate({ phone: number }, { cart: enrichedCart })
                        if (act.output_parsed.ready) {
                            await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                                "recipient": {
                                    "id": sender
                                },
                                "messaging_type": "RESPONSE",
                                "message": {
                                    "text": `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`
                                }
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            const newMessage = new InstagramMessage({instagramId: sender, message: message, response: `Perfecto, para realizar tu compra toca en el siguiente enlace: https://${process.env.WEB_URL}/finalizar-compra`, agent: false, view: false, ready: true})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: true })
                        } else {
                            const get = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    {"role": "system", "content": [{"type": "text", "text": `Eres un agente para la atención al cliente, el usuario esta en una etapa de compra, en base al historial de conversación, al ultimo mensaje del usuario y a la información de este modelo: ${JSON.stringify(act.output_parsed)}. Sigue preguntando que productos busca hasta que el usuario diga todo lo que necesita comprar, tambien te puedes apoyar en esta información para hacerlo: ${information}`}]},
                                    ...context,
                                    {"role": "user", "content": [{"type": "text", "text": message}]}
                                ],
                                response_format: {"type": "text"},
                                temperature: 1,
                                max_completion_tokens: 2048,
                                top_p: 1,
                                frequency_penalty: 0,
                                presence_penalty: 0,
                                store: false
                            });
                            await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                                "recipient": {
                                    "id": sender
                                },
                                "messaging_type": "RESPONSE",
                                "message": {
                                    "text": get.choices[0].message.content
                                }
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            const newMessage = new InstagramMessage({instagramId: sender, message: message, response: get.choices[0].message.content, agent: false, view: false})
                            const newMessageSave = await newMessage.save()
                            return res.send({ ...newMessageSave.toObject(), cart: enrichedCart, ready: false })
                        }
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
                            max_completion_tokens: 2048,
                            top_p: 1,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            store: false
                        });
                        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
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
                        const newMessage = new InstagramMessage({instagramId: sender, message: message, response: response.choices[0].message.content, agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    } else {
                        await axios.post(`https://graph.facebook.com/v16.0/106714702292810/messages?access_token=${integration.messengerToken}`, {
                            "recipient": {
                                "id": sender
                            },
                            "messaging_type": "RESPONSE",
                            "message": {
                                "text": 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar'
                            }
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        const newMessage = new InstagramMessage({instagramId: sender, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar', agent: false, view: false})
                        await newMessage.save()
                        return res.send(newMessage)
                    }
                }
            } else {
                return res.json({ message: 'Error: No existe el token de la app para Messenger' })
            }
        } else {
            return res.sendStatus(200)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
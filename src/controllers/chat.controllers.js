import ChatMessage from '../models/Chat.js'
import OpenAI from "openai"
import Product from '../models/Product.js'
import Service from '../models/Service.js'
import StoreData from '../models/StoreData.js'
import Payment from '../models/Payment.js'
import Call from '../models/Call.js'
import Funnel from '../models/Funnel.js'
import Politics from '../models/Politics.js'
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const responseMessage = async (req, res) => {
    try {
        if (req.body.agent) {
            const message = req.body.message
            const senderId = req.body.senderId
            const messages = await ChatMessage.find({ senderId: senderId }).select('-senderId -_id -adminView -userView -agent').sort({ createdAt: -1 }).limit(2).lean();
            if (messages[0].agent) {
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
                    const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Perfecto, te estoy transfieriendo con alguien de soporte en este momento', agent: false, adminView: false, userView: true})
                    await newMessage.save()
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
                            {"role": "system", "content": `Evalúa si el usuario ya agrego todos los productos que necesita en base a el modelo de carrito ${JSON.stringify(req.body.cart)}, al historial de conversación y el último mensaje del usuario, si es asi establece 'ready' en true; de lo contrario, en false. Actualiza el modelo si el usuario agrego algun producto, quito alguno o modifico alguno, utilizando la información adicional disponible ${information}. Observaciones: *Si aun el usuario no especifica que no busca mas productos que ready quede en false.`},
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
                    if (act.output_parsed.ready) {
                        const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Perfecto, para realizar tu compra toca en el boton de finalizar compra y seras redirigido al checkout', agent: true, adminView: false, userView: true, ready: true})
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
                        const newMessage = new ChatMessage({senderId: senderId, message: message, response: get.choices[0].message.content, agent: true, adminView: false, userView: true})
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
                    const newMessage = new ChatMessage({senderId: senderId, message: message, response: response.choices[0].message.content, agent: true, adminView: false, userView: true})
                    await newMessage.save()
                    return res.send(newMessage)
                } else {
                    const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, si quieres te puedo transferir con alguien de soporte para que te pueda ayudar', agent: false, adminView: false, userView: true})
                    await newMessage.save()
                    return res.send(newMessage)
                }
            } else {
                const newMessage = new ChatMessage({senderId: senderId, message: message, agent: false, adminView: false, userView: true})
                await newMessage.save()
                return res.send(newMessage)
            }
        } else {
            const newMessage = new ChatMessage(req.body)
            await newMessage.save()
            return res.send(newMessage)
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
                $match: { agent: false }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            const filtered = result.map(({senderId, adminView, createdAt}) => ({senderId, adminView, createdAt}))
            return res.send(filtered)
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
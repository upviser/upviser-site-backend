import Automatization from '../models/Automatization.js'
import Client from '../models/Client.js'
import { sendEmailBrevo } from '../utils/sendEmailBrevo.js'
import { formatDateToCron } from '../utils/cronFormat.js'
import cron from 'node-cron'
import ClientData from '../models/ClientData.js'
import StoreData from '../models/StoreData.js'
import Task from '../models/Task.js'
import Style from '../models/Style.js'

export const createAutomatization = async (req, res) => {
    try {
        const { startType, startValue, automatization } = req.body
        const emails = []
        let previousDate = new Date()
        if (startType !== 'Comentario en post de Instagram') {
            for (const email of automatization) {
                const currentDate = new Date(previousDate)
                if (email.time === 'Días') {
                    currentDate.setDate(currentDate.getDate() + Number(email.number))
                } else if (email.time === 'Horas') {
                    currentDate.setHours(currentDate.getHours() + Number(email.number))
                } else if (email.time === 'Minutos') {
                    currentDate.setMinutes(currentDate.getMinutes() + Number(email.number))
                }
                email.date = currentDate
                emails.push(email)
                previousDate = currentDate
            }
            const newAutomatization = new Automatization({ ...req.body, automatization: emails })
            const newAutomatizationSave = await newAutomatization.save()
            res.json(newAutomatizationSave)
        } else {
            const newAutomatization = new Automatization({ startType, name: req.body.name, text: req.body.text, replyPromt: req.body.replyPromt, message: req.body.message })
            const newAutomatizationSave = await newAutomatization.save()
            res.json(newAutomatizationSave)
        }
        emails?.map(async (email) => {
            if (Number(email.number) === 0) {
                let subscribers = []
                if (startType === 'Formulario completado') {
                    subscribers = await Client.find({ 'forms.form': startValue }).lean()
                } else if (startType === 'Llamada agendada') {
                    subscribers = await Client.find({ 'meetings.meeting': startValue }).lean()
                } else if (startType === 'Ingreso a un servicio') {
                    subscribers = await Client.find({
                        services: {
                            $elemMatch: {
                                service: startValue,
                                step: { $exists: true, $ne: '' }
                            }
                        }
                    }).lean();
                } else if (startType === 'Añadido a una etapa de un embudo') {
                    subscribers = await Client.find({ 'funnels.step': startValue }).lean()
                } else if (startType === 'Añadido a una etapa de un servicio') {
                    subscribers = await Client.find({ 'services.step': startValue }).lean()
                } else if (startType === 'Tag añadido') {
                    subscribers = await Client.find({ tags: startValue }).lean()
                }
                const filteredSubscribers = subscribers.filter(subscriber => {
                    if (email.condition.length === 0) {
                        return !subscriber.tags.includes('desuscrito')
                    }
                    return email.condition.every(condition => 
                        !subscriber.tags.includes(condition) || !subscriber.tags.includes('desuscrito')
                    );
                });
                const clientData = await ClientData.find()
                const storeData = await StoreData.find()
                const style = await Style.findOne()
                sendEmailBrevo({ subscribers: filteredSubscribers, emailData: email, clientData: clientData, storeData: storeData[0], automatizationId: newAutomatizationSave._id, style: style })
            } else {
                let subscribers = []
                if (startType === 'Formulario completado') {
                    subscribers = await Client.find({ 'forms.form': startValue }).lean()
                } else if (startType === 'Llamada agendada') {
                    subscribers = await Client.find({ 'meetings.meeting': startValue }).lean()
                } else if (startType === 'Ingreso a un servicio') {
                    subscribers = await Client.find({
                        services: {
                            $elemMatch: {
                                service: startValue,
                                step: { $exists: true, $ne: '' }
                            }
                        }
                    }).lean();
                } else if (startType === 'Añadido a una etapa de un embudo') {
                    subscribers = await Client.find({ 'funnels.step': startValue }).lean()
                } else if (startType === 'Añadido a una etapa de un servicio') {
                    subscribers = await Client.find({ 'services.step': startValue }).lean()
                } else if (startType === 'Tag añadido') {
                    subscribers = await Client.find({ tags: startValue }).lean()
                }
                const dateCron = formatDateToCron(new Date(email.date))
                const newTask = new Task({ dateCron: dateCron, subscribers: subscribers.map(subscriber => subscriber.email), startType: startType, startValue: startValue, emailData: email, condition: email.condition })
                await newTask.save()
                cron.schedule(dateCron, async () => {
                    const emails = subscribers.map(subscriber => subscriber.email);
                    const updatedSubscribers = await Client.find({ email: { $in: emails } }).lean()
                    const filteredSubscribers = updatedSubscribers.filter(subscriber => {
                        const tagsCondition = (email.condition.length === 0 && !subscriber.tags.includes('desuscrito')) || (subscriber.condition.some(tag => !subscriber.tags.includes(tag) || !subscriber.tags.includes('desuscrito')))
                        let funnelOrServiceCondition = true
                        if (startType === 'Añadido a una etapa de un embudo') {
                            funnelOrServiceCondition = subscriber.funnels.some(funnel => funnel.step === startValue)
                        } else if (startType === 'Añadido a una etapa de un servicio') {
                            funnelOrServiceCondition = subscriber.services.some(service => service.step === startValue)
                        }
                        return tagsCondition && funnelOrServiceCondition
                    });
                    const clientData = await ClientData.find()
                    const storeData = await StoreData.find()
                    const style = await Style.findOne()
                    sendEmailBrevo({ subscribers: filteredSubscribers, emailData: email, clientData: clientData, storeData: storeData[0], automatizationId: newAutomatizationSave._id, style: style })
                })
            }
        })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAutomatizations = async (req, res) => {
    try {
        const automatizations = await Automatization.find().lean()
        return res.send(automatizations)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAutomatization = async (req, res) => {
    try {
        const automatization = await Automatization.findById(req.params.id).lean()
        if (!automatization) {
            return res.sendStatus(404)
        }
        return res.send(automatization)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deleteAutomatization = async (req, res) => {
    try {
        const automatizationDelete = await Automatization.findByIdAndDelete(req.params.id)
        return res.send(automatizationDelete)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editAutomatizacion = async (req, res) => {
    try {
        const automatizationEdit = await Automatization.findByIdAndUpdate(req.params.id, req.body, { new: true })
        return res.json(automatizationEdit)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
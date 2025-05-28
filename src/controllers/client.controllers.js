import Client from '../models/Client.js'
import Automatization from '../models/Automatization.js'
import StoreData from '../models/StoreData.js'
import { sendEmailBrevo } from '../utils/sendEmailBrevo.js'
import { formatDateToCron } from '../utils/cronFormat.js'
import cron from 'node-cron'
import ClientData from '../models/ClientData.js'
import Task from '../models/Task.js'
import Style from '../models/Style.js'
import Account from '../models/Account.js'
import bcrypt from 'bcryptjs'

export const createClient = async (req, res) => {
  try {
    const client = await Client.findOne({ email: req.body.email }).lean();
    if (client) {
      const clientTagsSet = new Set(client.tags || []);
      const reqBodyTagsSet = new Set(req.body.tags || []);
      reqBodyTagsSet.forEach(tag => clientTagsSet.add(tag));
      const updatedTags = Array.from(clientTagsSet);

      const updatedFunnels = req.body.funnels 
        ? [
            ...client.funnels.filter(f => !(req.body.funnels || []).some(newF => newF.funnel === f.funnel)),
            ...(req.body.funnels || [])
          ]
        : client.funnels;
        
      const updatedForms = req.body.forms ? [...client.forms, ...(req.body.forms || [])] : client.forms;
      const updatedMeetings = req.body.meetings ? [...client.meetings, ...(req.body.meetings || [])] : client.meetings;
      
      const updatedServices = req.body.services
        ? [
            ...client.services.map(service => {
              const updatedService = (req.body.services || []).find(newService => newService.service === service.service);
              return updatedService ? { ...service, ...updatedService } : service;
            }),
            ...(req.body.services || []).filter(newService => !client.services.some(service => service.service === newService.service))
          ]
        : client.services;

      const updatedClient = {
        ...client,
        ...req.body,
        funnels: updatedFunnels,
        forms: updatedForms,
        meetings: updatedMeetings,
        tags: updatedTags,
        services: updatedServices
      };

      const editClient = await Client.findByIdAndUpdate(client._id, updatedClient, { new: true });
      const automatizations = await Automatization.find().lean();

      const automatizationsClient = automatizations.filter(automatization => {
        switch (automatization.startType) {
          case 'Formulario completado':
            return (req.body.forms || []).some(form => form.form === automatization.startValue);
          case 'Llamada agendada':
            return (req.body.meetings || []).some(meeting => meeting.meeting === automatization.startValue);
          case 'Ingreso a un servicio':
            return (req.body.services || []).some(service => service.service === automatization.startValue && service.step && service.step !== '' && client.services.find(service => service.step ? req.body.services[0].step === service.step : true));
          case 'Añadido a una etapa de un embudo':
            return (req.body.funnels || []).some(funnel => funnel.step === automatization.startValue);
          case 'Añadido a una etapa de un servicio':
            return (req.body.services || []).some(service => service.step === automatization.startValue);
          case 'Tag añadido':
            return (req.body.tags || []).includes(automatization.startValue);
          default:
            return false;
        }
      });

      res.send(editClient);

      automatizationsClient.map(async (automatization) => {
        let emails = [];
        let previousDate = new Date();

        for (const email of automatization.automatization) {
          const currentDate = new Date(previousDate);
          if (email.time === 'Días') {
            currentDate.setDate(currentDate.getDate() + Number(email.number));
          } else if (email.time === 'Horas') {
            currentDate.setHours(currentDate.getHours() + Number(email.number));
          } else if (email.time === 'Minutos') {
            currentDate.setMinutes(currentDate.getMinutes() + Number(email.number));
          }
          email.date = currentDate;
          emails.push(email);
          previousDate = currentDate;
        }

        emails.map(async (email) => {
          if (Number(email.number) === 0) {
            if (
              (email.condition.length === 0 && !client.tags.includes('desuscrito')) ||
              (email.condition.some(tag => !client.tags.includes(tag) || !client.tags.includes('desuscrito')))
            ) {
              const clientData = await ClientData.find();
              const storeData = await StoreData.find();
              const style = await Style.findOne()
              sendEmailBrevo({ subscribers: [client], emailData: email, clientData: clientData, storeData: storeData[0], automatizationId: automatization._id, style: style });
            }
          } else {
            const dateCron = formatDateToCron(new Date(email.date));
            const newTask = new Task({
              dateCron: dateCron,
              subscriber: client.email,
              emailData: email,
              automatizationId: automatization._id,
              condition: email.condition,
              startType: automatization.startType,
              startValue: automatization.startValue
            });
            await newTask.save();
            cron.schedule(dateCron, async () => {
              const clientUpdate = await Client.findOne({ email: client.email }).lean();
              if (clientUpdate) {
                const tagsCondition =
                  (email.condition.length === 0 && !client.tags.includes('desuscrito')) ||
                  (client.condition.some(tag => !clientUpdate.tags.includes(tag) || !clientUpdate.tags.includes('desuscrito')));
                let funnelOrServiceCondition = true;
                if (automatization.startType === 'Añadido a una etapa de un embudo') {
                  funnelOrServiceCondition = clientUpdate.funnels.some(funnel => funnel.step === automatization.startValue);
                } else if (automatization.startType === 'Añadido a una etapa de un servicio') {
                  funnelOrServiceCondition = clientUpdate.services.some(service => service.step === automatization.startValue);
                }
                if (tagsCondition && funnelOrServiceCondition) {
                  const clientData = await ClientData.find();
                  const storeData = await StoreData.find();
                  const style = await Style.findOne()
                  sendEmailBrevo({ subscribers: [clientUpdate], emailData: email, clientData: clientData, storeData: storeData[0], automatizationId: automatization._id, style: style });
                }
              }
            });
          }
        });
      });
    } else {
      const newClient = new Client(req.body);
      const newClientSave = await newClient.save();
      const automatizations = await Automatization.find().lean();

      const automatizationsClient = automatizations.filter(automatization => {
        switch (automatization.startType) {
          case 'Formulario completado':
            return (req.body.forms || []).some(form => form.form === automatization.startValue);
          case 'Llamada agendada':
            return (req.body.meetings || []).some(meeting => meeting.meeting === automatization.startValue);
          case 'Ingreso a un servicio':
            return (req.body.services || []).some(service => service.service === automatization.startValue && service.step && service.step !== '');
          case 'Añadido a una etapa de un embudo':
            return (req.body.funnels || []).some(funnel => funnel.step === automatization.startValue);
          case 'Añadido a una etapa de un servicio':
            return (req.body.services || []).some(service => service.step === automatization.startValue);
          case 'Tag añadido':
            return (req.body.tags || []).includes(automatization.startValue);
          default:
            return false;
        }
      });

      res.json(newClientSave);

      automatizationsClient.map(async (automatization) => {
        let emails = [];
        let previousDate = new Date();

        for (const email of automatization.automatization) {
          const currentDate = new Date(previousDate);
          if (email.time === 'Días') {
            currentDate.setDate(currentDate.getDate() + Number(email.number));
          } else if (email.time === 'Horas') {
            currentDate.setHours(currentDate.getHours() + Number(email.number));
          } else if (email.time === 'Minutos') {
            currentDate.setMinutes(currentDate.getMinutes() + Number(email.number));
          }
          email.date = currentDate;
          emails.push(email);
          previousDate = currentDate;
        }

        emails.map(async (email) => {
          if (Number(email.number) === 0) {
            if (
              (email.condition.length === 0 && !newClient.tags.includes('desuscrito')) ||
              (email.condition.some(tag => !newClient.tags.includes(tag) || !newClient.tags.includes('desuscrito')))
            ) {
              const clientData = await ClientData.find();
              const storeData = await StoreData.find();
              const style = await Style.findOne()
              sendEmailBrevo({ subscribers: [newClientSave], emailData: email, storeData: storeData[0], clientData: clientData, automatizationId: automatization._id, style: style });
            }
          } else {
            const dateCron = formatDateToCron(new Date(email.date));
            const newTask = new Task({
              dateCron: dateCron,
              subscriber: newClient.email,
              emailData: email,
              automatizationId: automatization._id,
              condition: email.condition,
              startType: automatization.startType,
              startValue: automatization.startValue
            });
            await newTask.save();
            cron.schedule(dateCron, async () => {
              const clientUpdate = await Client.findOne({ email: newClient.email }).lean();
              if (clientUpdate) {
                const tagsCondition = (email.condition.length === 0 && !clientUpdate.tags.includes('desuscrito')) || (clientUpdate.condition.some(tag => !clientUpdate.tags.includes(tag) || !clientUpdate.tags.includes('desuscrito')));
                let funnelOrServiceCondition = true;
                if (automatization.startType === 'Añadido a una etapa de un embudo') {
                  funnelOrServiceCondition = clientUpdate.funnels.some(funnel => funnel.step === automatization.startValue);
                } else if (automatization.startType === 'Añadido a una etapa de un servicio') {
                  funnelOrServiceCondition = clientUpdate.services.some(service => service.step === automatization.startValue);
                }
                if (tagsCondition && funnelOrServiceCondition) {
                  const clientData = await ClientData.find();
                  const storeData = await StoreData.find();
                  const style = await Style.findOne()
                  sendEmailBrevo({ subscribers: [clientUpdate], emailData: email, clientData: clientData, storeData: storeData[0], automatizationId: automatization._id, style: style });
                }
              }
            });
          }
        });
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getClients = async (req, res) => {
  try {
    const clients = await Client.find()

    if (!clients) {
      return undefined
    }

    return res.json(clients)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const updateClient = async (req, res) => {
  try {
    const updateClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })
    return res.send(updateClient)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const updateClientEmail = async (req, res) => {
  try {
    const updateClient = await Client.findOneAndUpdate({ email: req.params.id }, req.body, { new: true })
    return res.send(updateClient)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    if (!client) return res.json({meesage: 'Not Found'})
    return res.send(client)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getClientByEmail = async (req, res) => {
  try {
    const client = await Client.findOne({ email: req.params.id }).lean()
    if (!client) return res.json({meesage: 'Not Found'})
    return res.send(client)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const deleteClient = async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id)
    return res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const emailProduct = async (req, res) => {
  try {
    const client = await Client.findOne({ email: req.params.email }).lean()
    if (client) {
      const productsClient = [...client.products]
      productsClient.push(req.body.product)
      const updateClient = await Client.findByIdAndUpdate(client._id, { products: productsClient }, { new: true })
      return res.json(updateClient)
    } else {
      const newClient = new Client({ email: req.params.email, products: [{ product: req.body.product }] })
      return res.json(newClient)
    }
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const createAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    const emailLower = email.toLowerCase()
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!regex.test(emailLower)) return res.send({ message: 'El email no es valido' })
    if (password.length < 6) return res.send({ message: 'La contraseña tiene que tener minimo 6 caracteres' })
    const user = await Account.findOne({ email: emailLower })
    if (user) return res.send({ message: 'El email ya esta registrado' })
    const hashedPassword = await bcrypt.hash(password, 12)
    const newAccount = new Account({ firstName, lastName, email: emailLower, password: hashedPassword })
    const accountSave = await newAccount.save()
    return res.send({ firstName: accountSave.firstName, lastName: accountSave.lastName, email: accountSave.email, _id: accountSave._id })
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getAccountData = async (req, res) => {
  try {
    const accountData = await Account.findById(req.params.id).lean()
    if (!accountData) return res.sendStatus(404)
    return res.send(accountData)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const editAccountData = async (req, res) => {
  try {
    const editAccountData = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true })
    return res.send(editAccountData)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}
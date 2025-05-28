import Session from '../models/Session.js'
import Checkout from '../models/Checkout.js'
import Pay from '../models/Pay.js'
import Page from '../models/Page.js'
import Lead from '../models/Lead.js'
import Client from '../models/Client.js'
import Meeting from '../models/Meeting.js'
import ViewContent from '../models/ViewContent.js'
import AddCart from '../models/AddCart.js'
import Sell from '../models/Sell.js'
import Information from '../models/Information.js'

export const getStadistics = async (req, res) => {
    try {
        const pages = await Page.find()
        const sessions = await Session.find()
        const viewContents = await ViewContent.find()
        const addCarts = await AddCart.find()
        const leads = await Lead.find()
        const meetings = await Meeting.find()
        const informations = await Information.find()
        const checkouts = await Checkout.find()
        const pays = await Pay.find()
        const sells = await Sell.find()
        const clients = await Client.find()
        return res.json({ pages, sessions, viewContents, addCarts, leads, meetings, informations, checkouts, pays, sells, clients })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getStadisticsFiltered = async (req, res) => {
    try {
        const {dateInitial, dateLast} = req.body
        const dateInitialFormat = new Date(dateInitial)
        const dateLastFormat = new Date(dateLast)
        const pages = await Page.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const sessions = await Session.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const viewContents = await ViewContent.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const addCarts = await AddCart.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const leads = await Lead.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const meetings = await Meeting.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const informations = await Information.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const checkouts = await Checkout.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const pays = await Pay.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const sells = await Sell.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        const clients = await Client.find({ createdAt: { $gte: dateInitialFormat, $lte: dateLastFormat } })
        return res.json({ pages, sessions, viewContents, addCarts, leads, meetings, informations, checkouts, pays, sells, clients })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
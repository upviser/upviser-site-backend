import ShopLogin from '../models/ShopLogin.js'
import bcrypt from 'bcryptjs'

export const createAccount = async (req, res) => {
    try {
        const { name, email, password, type, permissions, plan } = req.body
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!regex.test(email)) return res.send({ message: 'El email no es valido' })
        if (password.length < 6) return res.send({ message: 'La contraseña tiene que tener minimo 6 caracteres' })
        const user = await ShopLogin.findOne({ email: email })
        if (user) return res.send({ message: 'El email ya esta registrado' })
        const hashedPassword = await bcrypt.hash(password, 12)
        const newAccount = new ShopLogin({ name, email, password: hashedPassword, type, permissions, plan })
        const accountSave = await newAccount.save()
        return res.send({ name, email: accountSave.email, _id: accountSave._id, type, permissions, plan })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAccountData = async (req, res) => {
    try {
        const accountData = await ShopLogin.findById(req.params.id).lean()
        if (!accountData) return res.sendStatus(404)
        return res.send(accountData)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editAccountData = async (req, res) => {
    try {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!regex.test(req.body.email)) return res.send({ message: 'El email no es valido' })
        if (req.body.password) {
            if (req.body.password.length < 6) return res.send({ message: 'La contraseña tiene que tener minimo 6 caracteres' })
            const hashedPassword = await bcrypt.hash(req.body.password, 12)
            const editAccountData = await ShopLogin.findByIdAndUpdate(req.body._id, { name: req.body.name, email: req.body.email, password: hashedPassword }, { new: true })
            return res.send(editAccountData)
        } else {
            const editAccountData = await ShopLogin.findByIdAndUpdate(req.body._id, { name: req.body.name, email: req.body.email }, { new: true })
            return res.send(editAccountData)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAccounts = async (req, res) => {
    try {
        const accounts = await ShopLogin.find().lean()
        return res.send(accounts)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getAccountAdmin = async (req, res) => {
    try {
        const account = await ShopLogin.findOne({ type: "Administrador" }).lean()
        return res.send(account)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editAccountAdmin = async (req, res) => {
    try {
        const account = await ShopLogin.findOneAndUpdate({ type: "Administrador" }, req.body, { new: true }).lean()
        return res.send(account)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
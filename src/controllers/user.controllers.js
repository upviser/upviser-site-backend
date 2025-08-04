import User from '../models/User.js'

export const createUser = async (req, res) => {
    try {
        const user = await User.findOne({ api: req.body.api }).lean()
        if (user) {
            const userUpdate = await User.findByIdAndUpdate(user._id, req.body, { new: true })
            return res.json(userUpdate)
        } else {
            const newUser = new User(req.body)
            const newUserSave = await newUser.save()
            return res.json(newUserSave)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ api: req.params.api }).lean()
        return res.json(user)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().lean()
        const index = users.findIndex(user => !user.email || user.email === "")
        return res.json({ index: index })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
import Call from '../models/Call.js'

export const createCall = async (req, res) => {
    try {
        const newCall = new Call(req.body)
        const newCallSave = await newCall.save()
        return res.json(newCallSave)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getCalls = async (req, res) => {
    try {
        const calls = await Call.find()
        return res.json(calls)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getCall = async (req, res) => {
    try {
        const call = await Call.findById(req.params.id)
        return res.json(call)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getCallName = async (req, res) => {
    try {
        const call = await Call.findOne({ nameMeeting: req.params.name })
        return res.json(call)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editCall = async (req, res) => {
    try {
        const callEdit = await Call.findByIdAndUpdate(req.params.id, req.body, { new: true })
        return res.json(callEdit)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deleteCall = async (req, res) => {
    try {
        const callDelete = await Call.findByIdAndDelete(req.params.id, { new: true })
        return res.json(callDelete)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
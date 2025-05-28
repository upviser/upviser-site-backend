import Form from '../models/Form.js'

export const createForm = async (req, res) => {
    try {
        const newForm = new Form(req.body)
        const newFormSave = await newForm.save()
        return res.json(newFormSave)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getForms = async (req, res) => {
    try {
        const forms = await Form.find()
        return res.json(forms)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getForm = async (req, res) => {
    try {
        const form = await Form.findById(req.params.id)
        return res.json(form)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const editForm = async (req, res) => {
    try {
        const formEdit = await Form.findByIdAndUpdate(req.params.id, req.body, { new: true })
        return res.json(formEdit)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const deteleFotm = async (req, res) => {
    try {
        const formDelete = await Form.findByIdAndDelete(req.params.id)
        return res.send(formDelete)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}
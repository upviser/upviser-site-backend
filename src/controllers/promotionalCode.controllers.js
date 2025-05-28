import PromotionalCode from '../models/PromotionalCode.js'

export const createPromotionalCode = async (req, res) => {
  try {
    const newPromotionalCode = new PromotionalCode(req.body)
    await newPromotionalCode.save()
    return res.json(newPromotionalCode)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getPromotionalCodes = async (req, res) => {
  try {
    const promotionalCodes = await PromotionalCode.find()
    return res.json(promotionalCodes)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const getPromotionalCodeBySlug = async (req, res) => {
  try {
    const promotionalCode = await PromotionalCode.findOne({slug: req.params.id}).lean()

    if (!promotionalCode) {
      return null
    }
    
    return res.send(promotionalCode)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const updatePromotionalCode = async (req, res) => {
  try {
    const updatedCode = await PromotionalCode.findOneAndUpdate({slug: req.params.id}, req.body, {new: true})
    return res.send(updatedCode)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}

export const deletePromotionalCode = async (req, res) => {
  try {
    await PromotionalCode.findByIdAndDelete(req.params.id)
    return res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({message: error.message})
  }
}
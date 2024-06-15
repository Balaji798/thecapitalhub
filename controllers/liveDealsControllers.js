import { LiveDealsModel } from "../models/liveDeals.js";

export const addLiveDeal = async (req, res) => {
  try {
    const response = await LiveDealsModel.create({
      startupId: req.body.startupId,
    });
    return res.status(201).send(response);
  } catch (err) {
    return res.status(500).send({
      status: 500,
      message: "An error occurred while fetching the investor details.",
    });
  }
};

export const get_live_deal = async (req, res) => {
  try {
    const liveDealData = await LiveDealsModel.find()
      .populate({
        path: "startupId",
        model: "StartUps",
        select:
          "company logo sector description location noOfEmployees socialLinks",
      })
      .populate({
        path: "intrustedInvestor",
        model: "Users",
        select: "profilePicture firstName lastName designation",
      });
    return res.status(201).send(liveDealData);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({
      status: 500,
      message: "An error occurred while fetching the investor details.",
    });
  }
};

export const add_to_live_deals = async (req, res) => {
  try {
    console.log(req.body)
    const data = await LiveDealsModel.findById(req.body.liveDealId);
    if (!data.intrustedInvestor.includes(req.userId)) {
      data.intrustedInvestor.push(req.userId);
      data.save();
    }
    const liveDealData = await LiveDealsModel.find();
    return res.status(200).send(liveDealData);
  } catch (err) {
    return res.status(500).send({
      status: 500,
      message: "An error occurred while fetching the investor details.",
    });
  }
};

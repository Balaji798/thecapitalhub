import jwt from "jsonwebtoken";
import {
  registerUserService,
  getUsersService,
  loginUserService,
  getUserById,
  updateUserData,
  updateUserById,
  changePassword,
  requestPasswordReset,
  resetPassword,
  searchUsers,
  addEducation,
  addExperience,
  addStartupToUser,
  addUserAsInvestor,
  getExplore,
  getExploreFilters,
  validateSecretKey,
  createSecretKey,
  googleLogin,
  updateEducation,
  updateExperience,
  deleteEducation,
  deleteExperience,
} from "../services/userService.js";
import { sendMail } from "../utils/mailHelper.js";
import { secretKey } from "../constants/config.js";
import { UserModel } from "../models/User.js";
import { StartUpModel } from "../models/startUp.js";
import axios from "axios";
import { InvestorModel } from "../models/Investor.js";

export const getUsersController = async (req, res, next) => {
  try {
    const getUser = await getUsersService();
    return res.status(200).json(getUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch data" });
  }
};
export const sendOTP = async (req, res) => {
  try {
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/send",
      {
        phoneNumber: req.body.phoneNumber,
        otpLength: 6,
        channel: "SMS",
        expiry: 600,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    return res.status(200).send({
      orderId: response.data.orderId,
      message: "OTP Send successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch data" });
  }
};
export const verifyOtp = async (req, res) => {
  try {
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/verify",
      {
        orderId: req.body.orderId,
        otp: req.body.otp,
        phoneNumber: req.body.phoneNumber,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.isOTPVerified) {
      return res.status(200).send({
        isOTPVerified: response.data.isOTPVerified,
        message: "OTP verified",
      });
    }
    return res.status(200).send({
      data: response.data,
      message: response.data.reason,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch data" });
  }
};
export const registerUserController = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      designation,
      gender,
      isInvestor,
      company,
      industry,
      location,
      foundingAsk,
      previousFounding,
      fundedTillDate,
      portfolio,
      chequeSize
    } = req.body;

    const newUser = await registerUserService({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      isInvestor,
      gender,
    });

    const generateUniqueOneLink = async (baseLink, model) => {
      let uniqueLink = baseLink;
      let count = 1;
      while (await model.countDocuments({ oneLink: uniqueLink })) {
        uniqueLink = baseLink + count++;
      }
      return uniqueLink;
    };

    if (isInvestor) {
      let existingCompany = await InvestorModel.findOne({ founderId: newUser._id });
      let baseOneLink = company.split(" ").join("").toLowerCase();
      const uniqueOneLink = await generateUniqueOneLink(baseOneLink, InvestorModel);

      if (existingCompany) {
        existingCompany.set({
          companyName: company,
          industry,
          description: portfolio,
          oneLink: uniqueOneLink,
        });
        await existingCompany.save();
        return res.status(200).json({ message: "Investor Updated", data: existingCompany });
      }
      const newInvestor = await InvestorModel.create({
        companyName: company,
        industry,
        description: portfolio,
        oneLink: uniqueOneLink,
        founderId:newUser._id
      });
      //await newInvestor.save();
      const { founderId } = newInvestor;
      const user = await UserModel.findOneAndUpdate({_id:founderId}, {
        investor: newInvestor._id,
        location,
      });
    //  console.log("update")
      const emailMessage = `
        A new user has requested for an account:
        
        Investor Details:
        User ID: ${newUser._id}
        Name: ${newUser.firstName} ${newUser.lastName}
        Email: ${newUser.email}
        Mobile: ${phoneNumber}
        Company Name: ${newInvestor.companyName}
        Industry: ${newInvestor.industry}
        Portfolio: ${newInvestor.portfolio}
      `;
      const subject = "New Account Request";
      const adminMail = "investments.capitalhub@gmail.com" 
      //"learn.capitalhub@gmail.com";
      const response = await sendMail(newUser.firstName, adminMail, newUser.email, subject, emailMessage);
      if (response.status === 200) {
        return res.status(200).json({ message: "Investor Added", data: newUser });
      } else {
        return res.status(500).json({ message: "Error while sending mail" });
      }
      //return res.status(201).json({ message: "User added successfully" });
    } else {
      let existingCompany = await StartUpModel.findOne({ founderId: newUser._id });
      let baseOneLink = company.split(" ").join("").toLowerCase();
      const uniqueOneLink = await generateUniqueOneLink(baseOneLink, StartUpModel);

      if (existingCompany) {
        existingCompany.set({
          location,
          foundingAsk,
          company,
          industry,
          designation,
          oneLink: uniqueOneLink,
        });
        await existingCompany.save();
        return res.status(200).json({ message: "Startup Updated", data: existingCompany });
      }

      const newStartUp = new StartUpModel({
        ...req.body,
        oneLink: uniqueOneLink,
      });

      await newStartUp.save();
      const { founderId } = newStartUp;
      await UserModel.findOneAndUpdate({_id:founderId}, {
        startUp: newStartUp._id,
      });
      return res.status(201).json({ message: "User added successfully" });
    }
  } catch ({ message }) {
    res.status(409).json({
      success: false,
      operational: true,
      message,
    });
  }
};


export const loginUserController = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    const user = await loginUserService({
      phoneNumber,
      password,
    });

    user.password = undefined;

    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      secretKey
    );

    return res
      .cookie("token", token)
      .status(200)
      .json({ message: "Login successful", user, token });
  } catch (error) {
    return res
      .status(401)
      .json({ operational: true, success: false, message: error.message });
  }
};

// get user by id
export const getUserByIdController = async (req, res) => {
  try {
    const response = await getUserById(req.params.id);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while creating the company.",
    });
  }
};

// Update User
export const updateUser = async (req, res) => {
  try {
    const { userId, body: newData } = req;
    const { status, message, data } = await updateUserData({
      userId,
      newData,
    });
    res.status(status).json({ message, data });
  } catch (error) {}
};

export const updateUserByIdController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, message, data } = await updateUserById(userId, req.body);
    res.status(status).json({ message, data });
  } catch (error) {}
};

export const changePasswordController = async (req, res) => {
  try {
    const { userId } = req;
    const { newPassword, oldPassword } = req.body;
    const response = await changePassword(userId, { newPassword, oldPassword });
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while updating password.",
    });
  }
};

export const requestPasswordResetController = async (req, res) => {
  try {
    const { email } = req.body;
    const response = await requestPasswordReset(email);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while requesting a password reset" });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const response = await resetPassword(token, newPassword);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while resetting the password" });
  }
};

export const searchUsersController = async (req, res) => {
  try {
    const { searchQuery } = req.query;
    const response = await searchUsers(searchQuery);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred while resetting the password" });
  }
};

// add education
export const addEducationController = async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await addEducation(userId, req.body);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while adding education.",
    });
  }
};

//add experience
export const addExperienceController = async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await addExperience(userId, req.body);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while adding experience.",
    });
  }
};

//add startup to user
export const addStartupToUserController = async (req, res) => {
  try {
    const { userId, startUpId } = req.body;
    const response = await addStartupToUser(userId, startUpId);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while adding startups to user.",
    });
  }
};

export const addUserAsInvestorController = async (req, res) => {
  try {
    const { userId, investorId } = req.body;
    const response = await addUserAsInvestor(userId, investorId);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while adding user as investor.",
    });
  }
};

export const getExploreController = async (req, res) => {
  try {
    const response = await getExplore(req.query);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while getting explore results.",
    });
  }
};

export const getExploreFiltersController = async (req, res) => {
  try {
    const { type } = req.query;
    const response = await getExploreFilters(type);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while getting explore results.",
    });
  }
};

export const validateSecretKeyController = async (req, res) => {
  try {
    const { oneLinkId, secretOneLinkKey } = req.body;
    const response = await validateSecretKey({
      oneLinkId,
      secretOneLinkKey,
    });
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while vaidating secret key.",
    });
  }
};

export const createSecretKeyController = async (req, res) => {
  try {
    const { secretOneLinkKey } = req.body;
    const userId = req.userId;
    const response = await createSecretKey(userId, secretOneLinkKey);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while creating secret key.",
    });
  }
};

export const googleLoginController = async (req, res) => {
  try {
    const { credential } = req.body;
    const response = await googleLogin(credential);
    res.status(response.status).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while login.",
    });
  }
};

export const updateEducationController = async (req, res) => {
  try {
    const userId = req.userId;
    const { educationId } = req.params;
    const response = await updateEducation(userId, educationId, req.body);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while updating education.",
    });
  }
};

export const deleteEducationController = async (req, res) => {
  try {
    const userId = req.userId;
    const { educationId } = req.params;
    const response = await deleteEducation(userId, educationId);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while deleting education.",
    });
  }
};

export const updateExperienceController = async (req, res) => {
  try {
    const userId = req.userId;
    const { experienceId } = req.params;
    const response = await updateExperience(userId, experienceId, req.body);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while updating experience.",
    });
  }
};

export const deleteExperienceController = async (req, res) => {
  try {
    const userId = req.userId;
    const { experienceId } = req.params;
    const response = await deleteExperience(userId, experienceId);
    res.status(response.status).send(response);
    return response;
  } catch (error) {
    console.error(error);
    res.status(500).send({
      status: 500,
      message: "An error occurred while deleting experience.",
    });
  }
};

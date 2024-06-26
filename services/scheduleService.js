import { ScheduleModel } from "../models/Schedule.js";
import { UserModel } from "../models/User.js";
import { cloudinary } from "../utils/uploadImage.js";
import jwt from "jsonwebtoken";
import { addNotification, deleteNotification } from "./notificationService.js";
import axios from "axios";

// Corrected generateZoomToken function
// const generateZoomToken = () => {
//   const expirationTime = Math.floor(Date.now() / 1000) + (60 * 60); // Token valid for 1 hour

//   const payload = {
//     iss: process.env.ZOOM_API_KEY,
//     exp: expirationTime
//   };

//   return jwt.sign(payload, process.env.ZOOM_API_SECRET);
// };

// export const getMeetingAccessToken = async (req,res)=>{
//   try{
//     const {data} = await axios.post("https://zoom.us/oauth/token",null,{
//       params:{
//         grant_type:'authorization_code',
//         code: req.body.code,
//         redirect_url:process.env.BASE_URL
//       },
//       headers:{
//         'Authorization':`Basic ${Buffer.from(`${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`).toString('base64')}`
//       },
//     })
//     return res.status(200).send(data.access_token)
//   }catch(error){
//     console.error(error);
//     return {
//       status: 500,
//       message: "An error occurred while creating a meeting.",
//     };
//   }
// }
export const createMeeting = async (userId, meetingData) => {
  try {
    const startDate = new Date(meetingData.start);
    const endDate = new Date(meetingData.end);
    const user = await UserModel.findOne({ oneLinkId: meetingData.oneLinkId });

    const existingMeeting = await ScheduleModel.findOne({
      requesterId: userId,
      $or: [
        {
          $and: [{ start: { $lte: startDate } }, { end: { $gt: startDate } }],
        },
        {
          $and: [{ start: { $lt: endDate } }, { end: { $gte: endDate } }],
        },
        {
          $and: [{ start: { $gte: startDate } }, { end: { $lte: endDate } }],
        },
      ],
    });

    if (existingMeeting) {
      return {
        status: 409,
        message: "Time is overlapping with existing meeting .",
        data: existingMeeting,
      };
    }
    let doc = "";
    if (meetingData?.doc) {
      const { secure_url } = await cloudinary.uploader.upload(
        meetingData?.doc,
        {
          folder: `${process.env.CLOUDIANRY_FOLDER}/schedule/doc`,
          format: "pdf",
          unique_filename: true,
        }
      );
      doc = secure_url;
    }
    // const { data } = await axios.post("https://zoom.us/oauth/token", null, {
    //   params: {
    //     grant_type: "authorization_code",
    //     code: req.body.code,
    //     redirect_url: process.env.BASE_URL,
    //   },
    //   headers: {
    //     Authorization: `Basic ${Buffer.from(
    //       `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
    //     ).toString("base64")}`,
    //   },
    // });
    // const token = generateZoomToken();
    // console.log(token)
    // const zoomMeetingData = {
    //   topic: meetingData.topic || "Meeting",
    //   type: 2, // Scheduled meeting
    //   start_time: startDate.toISOString(),
    //   duration: (endDate - startDate) / 60000, // Duration in minutes
    //   timezone: "UTC",
    //   settings: {
    //     join_before_host: true,
    //     approval_type: 0,
    //     registration_type: 1,
    //     audio: "voip",
    //     auto_recording: "none",
    //   },
    // };

    // // Create a meeting on Zoom
    // const response = await axios.post(
    //   `https://api.zoom.us/v2/users/me/meetings`,
    //   zoomMeetingData,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //   }
    // );

    // const zoomMeetingLink = response.data.join_url;

    const meeting = new ScheduleModel({
      ...meetingData,
      userId: user._id,
      requesterId: userId,
      doc,
      //meetingLink:zoomMeetingLink
    });
    await meeting.save();

    return {
      status: 200,
      message: "Meeting Created",
      data: meeting,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while creating a meeting.",
    };
  }
};

export const getAllMeetings = async (oneLinkId) => {
  try {
    const user = await UserModel.findOne({ oneLinkId });

    if (!user) {
      return {
        status: 404,
        message: "User not found with the provided oneLinkId.",
      };
    }

    const meetings = await ScheduleModel.find({ userId: user._id });

    return {
      status: 200,
      message: "Meetings retrieved successfully",
      data: meetings,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while retrieving meetings.",
    };
  }
};

export const requestBookingSlotById = async (meetingId, requestData) => {
  try {
    const meeting = await ScheduleModel.findById(meetingId);
    if (!meeting) {
      return {
        status: 404,
        message: "Meeting not found with the provided ID.",
      };
    }
    if (meeting.bookedBy && meeting.bookedBy.name) {
      return {
        status: 400,
        message: "Meeting is already booked.",
      };
    }

    requestData.start = meeting.start;
    requestData.end = meeting.end;
    meeting.requestedBy.push(requestData);
    await meeting.save();
    const type = "meetingRequest";
    await addNotification(meeting.userId, null, type, null, null, meeting._id);
    return {
      status: 200,
      message: "Booking request added successfully",
      data: meeting,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while adding the booking request.",
    };
  }
};

export const deleteMeeting = async (meetingId, userId) => {
  try {
    const meeting = await ScheduleModel.findOneAndDelete({
      _id: meetingId,
      userId: userId,
    });
    const type = "meetingRequest";
    deleteNotification(meeting.userId, null, type, meetingId);
    if (!meeting) {
      return {
        status: 404,
        message: "Meeting not found with the provided ID.",
      };
    }

    return {
      status: 200,
      message: "Meeting deleted successfully",
      data: meeting,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while deleting the meeting.",
    };
  }
};

export const acceptRequestById = async (meetingId, requestId) => {
  try {
    const meeting = await ScheduleModel.findById(meetingId);
    if (!meeting) {
      return {
        status: 404,
        message: "Meeting not found with the provided ID.",
      };
    }
    const type = "meetingRequest";
    deleteNotification(meeting.userId, null, type, meetingId);
    const requestToAccept = meeting.requestedBy.find(
      (request) => request._id.toString() === requestId
    );
    if (!requestToAccept) {
      return {
        status: 404,
        message: "Request not found with the provided ID for this meeting.",
      };
    }
    meeting.requestedBy = [];
    meeting.bookedBy = {
      name: requestToAccept.name,
      companyName: requestToAccept.companyName,
      email: requestToAccept.email,
      phone: requestToAccept.phone,
      description: requestToAccept.description,
      oneLink: requestToAccept.oneLink,
      start: requestToAccept.start,
      end: requestToAccept.end,
    };
    await meeting.save();
    return {
      status: 200,
      message: "Request accepted successfully",
      data: meeting,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while accepting the request.",
    };
  }
};

export const getAllRequestedByForUser = async (userId) => {
  try {
    const userMeetings = await ScheduleModel.find({ userId: userId });
    const userRequestedBy = [];
    userMeetings.forEach((meeting) => {
      meeting.requestedBy.forEach((request) => {
        userRequestedBy.push({
          _id: request._id,
          meetingId: meeting._id,
          name: request.name,
          companyName: request.companyName,
          email: request.email,
          phone: request.phone,
          agenda: request.description,
          oneLink: request.oneLink,
          start: request.start,
          end: request.end,
        });
      });
    });

    return {
      status: 200,
      message: "All 'requested by' data for the user retrieved successfully",
      data: userRequestedBy,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message:
        "An error occurred while retrieving 'requested by' data for the user.",
    };
  }
};

export const rejectRequestById = async (meetingId, requestId) => {
  try {
    const meeting = await ScheduleModel.findById(meetingId);
    if (!meeting) {
      return {
        status: 404,
        message: "Meeting not found with the provided ID.",
      };
    }
    const type = "meetingRequest";
    deleteNotification(meeting.userId, null, type, meetingId);
    const requestToRejectIndex = meeting.requestedBy.findIndex(
      (request) => request._id.toString() === requestId
    );
    if (requestToRejectIndex === -1) {
      return {
        status: 404,
        message: "Request not found with the provided ID for this meeting.",
      };
    }
    meeting.requestedBy.splice(requestToRejectIndex, 1);
    await meeting.save();
    return {
      status: 200,
      message: "Request rejected successfully",
      data: meeting,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while rejecting the request.",
    };
  }
};

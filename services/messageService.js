import { MessageModel } from "../models/Message.js";
import { cloudinary } from "../utils/uploadImage.js";

export const addMessage = async (id, chatId, senderId, text, documentName, documentUrl, image, video) => {
  try {
    if (image) {
      const { secure_url } = await cloudinary.uploader.upload(image, {
        folder: `${process.env.CLOUDIANRY_FOLDER}/posts/images`,
        format: "webp",
        unique_filename: true,
      });
      image = secure_url;
    }
    if (video) {
      const { secure_url } = await cloudinary.uploader.upload(video, {
        folder: `${process.env.CLOUDIANRY_FOLDER}/posts/videos`,
        resource_type: "video",
        unique_filename: true,
      });
      video = secure_url;
    }
    const message = new MessageModel({
      id,
      chatId,
      senderId,
      text,
      documentName,
      documentUrl,
      image,
      video
    });
    await message.save();
    return {
      status: 200,
      message: "New Message added",
      data: message,
    }
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "An error occurred while adding message.",
    };
  }
};

export const getMessages = async (chatId) => {
  try {
    const chats = await MessageModel.find({ chatId })
      .populate({
        path: 'senderId',
        select: 'firstName lastName profilePicture oneLinkId',
      })
      .exec();
    return {
      status: 200,
      message: "Message retrived successfully",
      data: chats,
    }
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "An error occurred while getting message.",
    };
  }
};

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const result = await MessageModel.updateMany(
      { chatId, senderId: userId }, { $set: { read: true } }
    );
    if (result.nModified > 0) {
      return {
        status: 200,
        message: "All messages in the chat have been marked as read.",
      };
    } else {
      return {
        status: 200,
        message: "No messages found in the chat to mark as read.",
      };
    }
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "An error occurred while marking messages as read.",
    };
  }
};

export const getUnreadMessageCount = async (chatId, userId) => {
  try {
    const unreadCount = await MessageModel.countDocuments({
      chatId,
      senderId: { $ne: userId },
      read: false,
    });
    return {
      status: 200,
      message: "Unread message count retrieved successfully",
      data: unreadCount,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while getting unread message count.",
    };
  }
};

export const clearAllMessages = async (chatId) => {
  try {
    const result = await MessageModel.deleteMany({ chatId });

    if (result.deletedCount > 0) {
      return {
        status: 200,
        message: "All messages in the chat have been cleared.",
      };
    } else {
      return {
        status: 200,
        message: "No messages found in the chat to clear.",
      };
    }
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "An error occurred while clearing messages.",
    };
  }
};

export const deleteMessage = async (messageId) => {
  try {
    const deletedMessage = await MessageModel.findOneAndDelete({ id: messageId });

    if (!deletedMessage) {
      return {
        status: 404,
        message: "Message not found",
      };
    }

    return {
      status: 200,
      message: "Message deleted successfully",
      data: deletedMessage,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while deleting the message.",
    };
  }
};

export const markMessagesAsReadInCommunities = async (chatId, userId) => {
  try {
    const result = await MessageModel.updateMany(
      { chatId, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );
    if (result.nModified > 0) {
      return {
        status: 200,
        message: "Messages marked as read by the community",
      };
    } else {
      return {
        status: 200,
        message: "No messages found to mark as read by the community",
      };
    }
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while marking messages as read by the community.",
    };
  }
};

export const getUnreadMessageCountInCommunities = async (chatId, userId) => {
  try {
    const unreadCount = await MessageModel.countDocuments({
      chatId,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });
    return {
      status: 200,
      message: "Unread message count in community retrieved successfully",
      data: unreadCount,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while getting unread message count.",
    };
  }
};

export const getLastMessage = async (chatId) => {
  try {
    const lastMessage = await MessageModel.findOne({ chatId }).sort({ createdAt: -1 }).populate('senderId');
    if (!lastMessage) {
      return {
        status: 404,
        message: "No messages found in the chat",
      };
    }
    return {
      status: 200,
      message: "Last message retrieved successfully",
      data: lastMessage,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      message: "An error occurred while getting the last message.",
    };
  }
};

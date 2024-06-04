import { Schema, model } from "mongoose";

const scheduleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
    title: {
      type: String,
    },
    bookedBy: {
      name: {
        type: String,
      },
      companyName: {
        type: String,
      },
      email: {
        type: String,
      },
      phone: {
        type: String,
      },
      description: {
        type: String,
      },
      oneLink: {
        type: String,
      },
      start: {
        type: Date,
      },
      end: {
        type: Date,
      },
    },
    requestedBy: [
      {
        name: {
          type: String,
        },
        companyName: {
          type: String,
        },
        email: {
          type: String,
        },
        phone: {
          type: String,
        },
        description: {
          type: String,
        },
        oneLink: {
          type: String,
        },
        start: {
          type: Date,
        },
        end: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const ScheduleModel = model("Schedule", scheduleSchema);
const mongoose = require("mongoose");
const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: "active"
    },
  }
);
const Alert = mongoose.model("Alert", alertSchema);
module.exports = Alert;
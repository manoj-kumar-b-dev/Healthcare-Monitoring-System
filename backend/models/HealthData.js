const mongoose = require("mongoose");
const healthDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "patient",
      required: true
    },
    heartRate: Number,
    spo2: Number,
    temperature: Number,
  },
  {
    timestamps: true
  }
)
const HealthData = mongoose.model("HealthData", healthDataSchema)
module.exports = HealthData
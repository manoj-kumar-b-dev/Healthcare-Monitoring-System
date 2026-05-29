const express = require("express");
const router = express.Router();
const HealthData = require("../models/HealthData.js");
const { protect: authMiddleWare } = require("../middleware/auth.js")
router.post("/health", authMiddleWare, async (req, res) => {
  try {
    const { temperature, heartRate, spo2 } = req.body
    const userId = req.user.id;
    const newData = await HealthData.create({
      userId,
      temperature,
      heartRate,
      spo2
    })

    await newData.save();
    res.status(200).json({
      message: "health data stored succesfully",
      data: newData
    }
    )
  }
  catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
})

router.get("/health/latest", authMiddleWare, async (req, res) => {
  try {
    const latestData = await HealthData
      .findOne()
      .sort({ createdAt: -1 });
    res.json(latestData)
  }

  catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
}
)

router.get("/health/history", authMiddleWare, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1)
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)
    const healthHistory = await HealthData.find().sort({ createdAt: -1 })
    res.json(healthHistory)
  }
  catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
}
)

module.exports = router;



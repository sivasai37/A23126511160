const express = require("express");

const router = express.Router();

const { getNotifications } = require("../services/notificationService");

const { sortNotifications } = require("../utils/priorityQueue");

const Log = require("../../logging-middleware/logger");

router.get("/priority", async (req, res) => {
  try {
    await Log("backend", "info", "route", "Priority endpoint called");

    const notifications = await getNotifications();

    const top10 = sortNotifications(notifications);

    await Log("backend", "info", "service", "Top 10 notifications generated");

    res.status(200).json({
      notifications: top10,
    });
  } catch (error) {
    await Log("backend", "error", "handler", error.message);

    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;

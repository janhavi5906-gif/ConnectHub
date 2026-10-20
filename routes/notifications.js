const express = require("express");
const jwt = require("jsonwebtoken");
const Notification = require("../models/Notification");

const router = express.Router();


// ===============================
// GET MY NOTIFICATIONS
// ===============================

router.get("/", async (req, res) => {
    try {

        const token =
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );


        const notifications =
            await Notification.find({
                recipient: decoded.userId
            })
            .populate(
                "sender",
                "name profileImage"
            )
            .populate(
                "post",
                "content"
            )
            .sort({
                createdAt: -1
            });


        res.json(notifications);

    } catch (error) {

        res.status(500).json({
            message: "Failed to get notifications",
            error: error.message
        });

    }
});


// ===============================
// GET UNREAD COUNT
// ===============================

router.get("/unread-count", async (req, res) => {
    try {

        const token =
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );


        const count =
            await Notification.countDocuments({
                recipient: decoded.userId,
                read: false
            });


        res.json({
            count
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to get unread count",
            error: error.message
        });

    }
});


// ===============================
// MARK ONE NOTIFICATION AS READ
// ===============================

router.put("/:id/read", async (req, res) => {
    try {

        const token =
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );


        const notification =
            await Notification.findOne({
                _id: req.params.id,
                recipient: decoded.userId
            });


        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }


        notification.read = true;

        await notification.save();


        res.json({
            message: "Notification marked as read"
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to update notification",
            error: error.message
        });

    }
});


// ===============================
// MARK ALL NOTIFICATIONS AS READ
// ===============================

router.put("/read-all", async (req, res) => {
    try {

        const token =
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );


        await Notification.updateMany(
            {
                recipient: decoded.userId,
                read: false
            },
            {
                $set: {
                    read: true
                }
            }
        );


        res.json({
            message: "All notifications marked as read"
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to mark notifications as read",
            error: error.message
        });

    }
});


module.exports = router;
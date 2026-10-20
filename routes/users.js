const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const router = express.Router();


// ===============================
// GET ALL USERS
// ===============================

router.get("/", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );

        const users = await User.find()
            .select("name email bio profileImage followers following");

        res.json(users);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get users",
            error: error.message
        });
    }
});


// ===============================
// SEARCH USERS AND POSTS
// ===============================

router.get("/search", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );

        const query = req.query.q?.trim();

        if (!query) {
            return res.json({
                users: [],
                posts: []
            });
        }

        const users = await User.find({
            $or: [
                {
                    name: {
                        $regex: query,
                        $options: "i"
                    }
                },
                {
                    email: {
                        $regex: query,
                        $options: "i"
                    }
                }
            ]
        })
        .select("name email bio profileImage followers following")
        .limit(20);

        const posts = await Post.find({
            content: {
                $regex: query,
                $options: "i"
            }
        })
        .populate(
            "author",
            "name email profileImage"
        )
        .populate(
            "likes",
            "name"
        )
        .sort({
            createdAt: -1
        })
        .limit(20);

        res.json({
            users,
            posts
        });

    } catch (error) {
        res.status(500).json({
            message: "Search failed",
            error: error.message
        });
    }
});


// ===============================
// GET USER PROFILE
// ===============================

router.get("/:id", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );

        const user = await User.findById(req.params.id)
            .select(
                "name email bio profileImage followers following createdAt"
            );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const posts = await Post.find({
            author: req.params.id
        })
        .populate(
            "author",
            "name email profileImage"
        )
        .populate(
            "likes",
            "name"
        )
        .sort({
            createdAt: -1
        });

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                profileImage: user.profileImage,
                followers: user.followers.length,
                following: user.following.length,
                createdAt: user.createdAt
            },
            posts
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to get profile",
            error: error.message
        });
    }
});


// ===============================
// FOLLOW / UNFOLLOW USER
// ===============================

router.put("/:id/follow", async (req, res) => {
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

        const currentUser =
            await User.findById(decoded.userId);

        const targetUser =
            await User.findById(req.params.id);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (
            currentUser._id.toString() ===
            targetUser._id.toString()
        ) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }


        const alreadyFollowing =
            currentUser.following.some(
                userId =>
                    userId.toString() ===
                    targetUser._id.toString()
            );


        // ===============================
        // UNFOLLOW
        // ===============================

        if (alreadyFollowing) {

            currentUser.following =
                currentUser.following.filter(
                    userId =>
                        userId.toString() !==
                        targetUser._id.toString()
                );

            targetUser.followers =
                targetUser.followers.filter(
                    userId =>
                        userId.toString() !==
                        currentUser._id.toString()
                );

            await currentUser.save();
            await targetUser.save();


            // Remove follow notification
            await Notification.deleteOne({
                recipient: targetUser._id,
                sender: currentUser._id,
                type: "follow"
            });


            return res.json({
                message: "User unfollowed",
                following: false
            });
        }


        // ===============================
        // FOLLOW
        // ===============================

        currentUser.following.push(
            targetUser._id
        );

        targetUser.followers.push(
            currentUser._id
        );

        await currentUser.save();
        await targetUser.save();


        // ===============================
        // CREATE NOTIFICATION
        // ===============================

        const notification =
            new Notification({
                recipient: targetUser._id,
                sender: currentUser._id,
                type: "follow",
                message: "Someone started following you"
            });

        await notification.save();


        res.json({
            message: "User followed",
            following: true
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to follow user",
            error: error.message
        });

    }
});


module.exports = router;
const express = require("express");
const jwt = require("jsonwebtoken");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const router = express.Router();


// ===============================
// ADD COMMENT
// ===============================

router.post("/:postId", async (req, res) => {

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

        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty"
            });
        }


        // Find the post
        const post =
            await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }


        // Create comment
        const comment = new Comment({
            post: req.params.postId,
            author: decoded.userId,
            text: text.trim()
        });

        await comment.save();

        await comment.populate(
            "author",
            "name profileImage"
        );


        // ===============================
        // CREATE NOTIFICATION
        // ===============================

        // Don't notify yourself
        if (
            post.author.toString() !==
            decoded.userId
        ) {

            const notification =
                new Notification({
                    recipient: post.author,
                    sender: decoded.userId,
                    type: "comment",
                    post: post._id,
                    message: "Someone commented on your post"
                });

            await notification.save();
        }


        res.status(201).json({
            message: "Comment added successfully",
            comment
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to add comment",
            error: error.message
        });

    }

});


// ===============================
// GET COMMENTS
// ===============================

router.get("/:postId", async (req, res) => {

    try {

        const token =
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );

        const comments =
            await Comment.find({
                post: req.params.postId
            })
            .populate(
                "author",
                "name profileImage"
            )
            .sort({
                createdAt: 1
            });

        res.json(comments);

    } catch (error) {

        res.status(500).json({
            message: "Failed to get comments",
            error: error.message
        });

    }

});


module.exports = router;
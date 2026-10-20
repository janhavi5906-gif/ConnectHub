const express = require("express");
const jwt = require("jsonwebtoken");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const router = express.Router();


// ===============================
// CREATE POST
// ===============================

router.post("/", async (req, res) => {
    try {

        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "connecthub_secret"
        );

        const { content, image } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                message: "Post content is required"
            });
        }

        const post = new Post({
            author: decoded.userId,
            content: content.trim(),
            image: image || ""
        });

        await post.save();

        await post.populate(
            "author",
            "name email profileImage"
        );

        res.status(201).json({
            message: "Post created successfully",
            post
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to create post",
            error: error.message
        });

    }
});


// ===============================
// GET ALL POSTS
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

        const posts = await Post.find()
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

        res.json(posts);

    } catch (error) {

        res.status(500).json({
            message: "Failed to get posts",
            error: error.message
        });

    }
});


// ===============================
// LIKE / UNLIKE POST
// ===============================

router.put("/:id/like", async (req, res) => {

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

        const post =
            await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const alreadyLiked =
            post.likes.some(
                userId =>
                    userId.toString() === decoded.userId
            );


        // ===============================
        // UNLIKE
        // ===============================

        if (alreadyLiked) {

            post.likes =
                post.likes.filter(
                    userId =>
                        userId.toString() !==
                        decoded.userId
                );

            await post.save();


            // Remove existing like notification
            await Notification.deleteOne({
                recipient: post.author,
                sender: decoded.userId,
                type: "like",
                post: post._id
            });


            return res.json({
                message: "Post unliked",
                likes: post.likes.length
            });
        }


        // ===============================
        // LIKE
        // ===============================

        post.likes.push(decoded.userId);

        await post.save();


        // Don't notify yourself
        if (
            post.author.toString() !==
            decoded.userId
        ) {

            const notification =
                new Notification({
                    recipient: post.author,
                    sender: decoded.userId,
                    type: "like",
                    post: post._id,
                    message: "Someone liked your post"
                });

            await notification.save();
        }


        res.json({
            message: "Post liked",
            likes: post.likes.length
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to like post",
            error: error.message
        });

    }

});


// ===============================
// DELETE POST
// ===============================

router.delete("/:id", async (req, res) => {

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

        const post =
            await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        if (
            post.author.toString() !==
            decoded.userId
        ) {

            return res.status(403).json({
                message:
                    "You can only delete your own posts"
            });

        }

        // Delete notifications related to this post
        await Notification.deleteMany({
            post: post._id
        });

        await Post.findByIdAndDelete(
            req.params.id
        );

        res.json({
            message: "Post deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to delete post",
            error: error.message
        });

    }

});


module.exports = router;
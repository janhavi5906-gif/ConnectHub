const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");

dotenv.config();

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());


// ===============================
// API ROUTES
// ===============================

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);


// ===============================
// SERVE FRONTEND
// ===============================

app.use(express.static("public"));


// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
    res.send("ConnectHub Server is Running!");
});


// ===============================
// SERVER
// ===============================

const PORT = 5001;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {

        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(
                `ConnectHub server running at http://localhost:${PORT}`
            );
        });

    })
    .catch((error) => {

        console.log(
            "MongoDB connection error:",
            error.message
        );

    });
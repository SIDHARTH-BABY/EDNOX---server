import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv'
import multer from 'multer';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import postRoutes from "./routes/posts.js"
import chatRoutes from "./routes/chat.js"
import MessageRoute from './routes/message.js'
// import AdminRoute from './routes/admin.js'

import { register, sendOtp } from './controllers/auth.js'
import { createPost } from './controllers/posts.js';
import { verifyToken } from './middleware/auth.js';
import User from "./models/User.js"
import Post from './models/Post.js'
import { users, posts } from './data/index.js'
import { adminLogin, adminRegister, blockUser, deleteAllnotifications, getFullUsers, markNotificationAsSeen, reportLists, unBlockUser, viewPost } from './controllers/admin.js';




//CONFIGURATION

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config()
const app = express()



const httpServer = createServer(app);
import { createServer } from "http";
import { Server } from "socket.io";
import { editProfilePic } from './controllers/users.js';



const io = new Server(httpServer, {
    cors: {
        origin: ["https://ednox.netlify.app", "https://ed.ednox.shop:3000", "http://localhost:3000", "https://ed.ednox.shop"],
    },
});




let activeUsers = [];


io.on("connection", (socket) => {
    // add new User
    socket.on("new-user-add", (newUserId) => {
        // if user is not added previously
        if (!activeUsers.some((user) => user.userId === newUserId)) {
            activeUsers.push({ userId: newUserId, socketId: socket.id });
            console.log("New User Connected", activeUsers);
        }
        // send all active users to new user
        io.emit("get-users", activeUsers);
    });

    socket.on("disconnect", () => {
        // remove user from active users
        activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
        console.log("User Disconnected", activeUsers);
        // send all active users to all users
        io.emit("get-users", activeUsers);
    });

    // send message to a specific user
    socket.on("send-message", (data) => {
        const { receiverId } = data;
        const user = activeUsers.find((user) => user.userId === receiverId);
        console.log("Sending from socket to :", receiverId)
        console.log("Data: ", data)
        if (user) {
            io.to(user.socketId).emit("recieve-message", data);
        }
    });
})




app.use(express.json())
app.use(helmet())
app.use(helmet.crossOriginResourcePolicy({ "policy": "cross-origin" }))
app.use(morgan("common"))
app.use(bodyParser.json({ limit: "30mb", extended: true }))
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors({
    origin: ["https://ednox.netlify.app", "http://localhost:3000"],
    credentials: true
}));

app.options('*', cors());
app.use(cors());

app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

//FILE STORAGE
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/assets")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({ storage })


//ROUTES WITH FILES
app.post("/auth/register", upload.single("picture"), register)
app.post("/posts", verifyToken, upload.single("picture"), createPost)
app.post("/users/profilepic-user/:id", upload.single("picture"), editProfilePic)
app.post("/send-otp", sendOtp)
app.post("/admin/register", adminRegister)
app.post("/admin/login", adminLogin)
app.get("/admin/get-users", getFullUsers)
app.post("/admin/block-user", blockUser)
app.post("/admin/unblock-user", unBlockUser)
app.post("/admin/view-post", viewPost)
app.get("/admin/mark-all-notifications-as-seen", markNotificationAsSeen)
app.get("/admin/delete-all-notifications", deleteAllnotifications)
app.get("/admin/get-reports", reportLists)




//ROUTES
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/posts", postRoutes)
app.use("/chat", chatRoutes)
app.use("/message", MessageRoute)
// app.use("/admin",AdminRoute)

//MONGOOSE
const PORT = process.env.PORT || 5000
mongoose.set('strictQuery', false); // or true, based on your preference
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    app.listen(PORT, () => console.log(`server port: ${PORT}`))
    /* ADD DATA ONE TIME */
    // User.insertMany(users);
    // Post.insertMany(posts);
}).catch((error) => console.log(`${error}did not connect`))
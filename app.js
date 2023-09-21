import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";
import { faker } from "@faker-js/faker";
import "dotenv"
import {
  broadCastEvent,
  sendMessage,
  receivedMessage,
  disconnect,
  getStoredMessages,
  checkIfUserIsValid,
  isTyping,
  maxAllowedUsers
} from "./controller/socketController.js";
const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", credentials: true },
  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000,
    skipMiddlewares: true,
  },
  cookie:{
    name:"io"
  }
});

const sessionMiddleware = session({
  secret: "changeit",
  resave: true,
  saveUninitialized: true,
  name:"eloho",
  
});

io.engine.use(sessionMiddleware);
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

io.engine.use((req, res, next) => {
  if (!req.session.userDetails) {
    req.session.userDetails = {
      name: faker.internet.userName(),
      image: faker.image.url(),
      active: true,
      id: uuidv4(),
      sort: false,
    };
    req.session.storedMessages = [];
    req.session.messages = [];
    req.session.savedMessages = [];
    return next();
  }
  next();
});

async function Connection(socket) {
  const req = socket.request;

  broadCastEvent(io, "active:users", socket);
  await checkIfUserIsValid(socket, io);
  sendMessage(socket, io);
  receivedMessage(socket, io);
  getStoredMessages(socket);
  isTyping(socket, io);
  maxAllowedUsers(socket,io)
  socket.on("getStoredMessages", (msg) => {
    socket.emit("sendMessages", req.session.storedMessages);
  });

  socket.on("messageData", (message) => {
    req.session.reload(async (err) => {
      if (err) {
        return socket.disconnect();
      }
      req.session.storedMessages.push(message);
      req.session.save();
    });
  });
  disconnect(socket, io);
}

io.on("connection", Connection);

httpServer.listen(process.env.PORT || 3000, () => {
  console.log("good over here");
});





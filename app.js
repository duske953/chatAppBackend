import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";
import { faker } from "@faker-js/faker";
import {
  broadCastEvent,
  sendMessage,
  receivedMessage,
  disconnect,
  getStoredMessages,
  checkIfUserIsValid,
  isTyping,
} from "./controller/socketController.js";
const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "https://anonymo.vercel.app/",credentials:true},
  connectionStateRecovery: {
    skipMiddlewares: true,
  },
  cookie: true,
});

const sessionMiddleware = session({
  secret: "changeit",
  resave: false,
  saveUninitialized: false,
  cookie:{
    secure:true,
    sameSite:"none",
    httpOnly:true
  }
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

httpServer.listen(3000, () => {
  console.log("good over here");
});

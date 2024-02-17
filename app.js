/* eslint-disable no-undef */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
import { faker } from '@faker-js/faker';
import {
  broadCastEvent,
  sendMessage,
  receivedMessage,
  disconnect,
  getStoredMessages,
  checkIfUserIsValid,
  isTyping,
  getMessageAttr,
} from './controller/socketController.js';
const app = express();
console.log(process.env.NODE_ENV);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173'
        : 'https://anonymo.vercel.app',
    credentials: true,
  },

  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000,
    skipMiddlewares: true,
  },
  cookie: true,
});

app.set('trust proxy', 1);
const sessionMiddleware = session({
  secret: process.env.SECRET,
  resave: true,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    secure: process.env.NODE_ENV === 'development' ? false : true,
    httpOnly: true,
  },
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
  broadCastEvent(io, 'active:users', socket);
  await checkIfUserIsValid(socket, io);
  sendMessage(socket, io);
  receivedMessage(socket, io);
  getMessageAttr(socket);
  isTyping(socket, io);
  getStoredMessages(socket, io);

  socket.on('messageData', (message) => {
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

io.on('connection', Connection);

httpServer.listen(process.env.port || 8000, () => {
  console.log('good over here');
});

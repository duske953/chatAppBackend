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
  receivedMessageAttr,
} from './controller/socketController.js';
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173'
        : process.env.FRONTEND_URL,
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 3 * 60 * 1000,
    skipMiddlewares: true,
  },
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
      msgSent: false,
    };
    req.session.sentMessages = [];
    req.session.receivedMessages = [];
    req.session.messageAttr = [];
    req.session.savedMessages = [];
    return next();
  }
  next();
});

async function Connection(socket) {
  socket.use(([event, ...args], next) => {
    if (io.engine.clientsCount >= 50) {
      socket.emit('server:full', { data: socket.data });
      return socket.disconnect();
    }
    next();
  });
  const req = socket.request;
  broadCastEvent(io, 'active:users', socket);
  await checkIfUserIsValid(socket, io);
  sendMessage(socket, io);
  receivedMessage(socket, io);
  receivedMessageAttr(socket);
  isTyping(socket, io);
  getStoredMessages(socket, io);

  socket.on('seen:message', (msg) => {
    req.session.reload(async (err) => {
      if (err) return socket.disconnect();
      req.session.messageAttr.forEach((ele) => {
        if (ele.senderId === msg.id) {
          ele.new = msg.new;
        }
        req.session.save();
      });
    });
  });

  disconnect(socket, io);
}

io.on('connection', Connection);

httpServer.listen(process.env.PORT || 8000, () => {
  console.log('good over here');
});

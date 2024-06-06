import moment from "moment"
function storeUserData(socket) {
  let req = socket.request;
  socket.data.userDetails = {
    ...req.session.userDetails,
    refId: socket.handshake.auth.token,
  };
  socket.data.savedMessages = req.session.savedMessages;
  socket.broadcast.emit('user:disconnected', {
    user: socket.data.userDetails,
    active: true,
  });
}

function getSocketsData(sockets) {
  return sockets.map((ele) => {
    return {
      ...ele.data.userDetails,
      socketId: ele.id,
    };
  });
}

export async function broadCastEvent(io, ev, socket) {
  storeUserData(socket);
  let sockets;
  sockets = await io.fetchSockets();

  const foundClient = sockets
    .filter((ele) => ele.handshake.auth.token !== socket.handshake.auth.token)
    .map((ele) => ele.data.userDetails)
    .find((ele) => ele.id === socket.data.userDetails.id);
  if (foundClient) {
    socket.emit('userAlreadyConnected', foundClient);
    socket.disconnect();
    sockets = await io.fetchSockets();
    return;
    // return socket.broadcast.emit(ev, {
    //   users: getSocketsData(sockets),
    //   foundClient,
    // });
  }
  return io.emit('active:users', { users: getSocketsData(sockets) });
}

export function getStoredMessages(socket, io) {
  let req = socket.request;
  socket.on('fetchAllMessages', () => {
    return socket.emit('sendAllMessages', {
      sentMessages: req.session.sentMessages,
      receivedMessages: req.session.receivedMessages,
      messageAttr: req.session.messageAttr,
      currentUser: socket.data.userDetails,
    });
  });
}

export function getMessageAttr(socket) {
  let req = socket.request;
  socket.emit('sendMessageAttr', {
    messageAttr: req.session.messages,
  });
}

export function sendMessage(socket, io) {
  let req = socket.request;
  socket.on('send:message', async (msg) => {
    req.session.reload(async (err) => {
      const sockets = await io.fetchSockets();
      const receiver = sockets.find(
        (ele) => ele.data.userDetails.id === msg.receiverId
      );
      if (err) {
        return socket.disconnect();
      }
      if (!receiver) return;
      req.session.sentMessages.push({
        ...msg,
        read: true,
        position: 'left',
        time:moment().format()
      });
      io.to(receiver.id).emit('received:message', {
        ...msg,
        read: false,
        position: 'right',
      });
      socket.emit('sent:message', {
        msg: req.session.sentMessages,
        sent: true,
      });
      req.session.save();
      // io.to(receiver.id).emit('messageAttr', {
      //   messages: { ...msg, read: false },
      //   sid: msg.senderId,
      // });
    });
  });
}

export async function receivedMessageAttr(socket) {
  let req = socket.request;
  socket.on('received:messageAttr', (msg) => {
    req.session.reload(async (err) => {
      if (err) return socket.disconnect();
      req.session.messageAttr.push(msg);
      req.session.save();
    });
  });
}

export async function receivedMessage(socket) {
  let req = socket.request;
  socket.on('received:message', ({ msg, messageAttr }) => {
    req.session.reload(async (err) => {
      if (err) return socket.disconnect();
      req.session.receivedMessages.push({ ...msg, new: true,time:moment().format() });
      req.session.messageAttr.push(messageAttr);
      req.session.save();
    });
  });

  // socket.on('received:messageAttr', (msg) => {
  //   req.session.reload(async (err) => {
  //     if (err) return socket.disconnect();
  //     req.session.messageAttr.push(msg);
  //     req.session.save();
  //   });
  // });
  // socket.on('receivedMessageAttr', ({ getMessage }) => {
  //   req.session.reload(async (err) => {
  //     if (err) {
  //       console.log(err);
  //       socket.disconnect();
  //     }
  //     if (!getMessage || getMessage.length === 0) return;
  //     req.session.messages = getMessage;
  //     req.session.save();
  //   });
  // });
}

export async function checkIfUserIsValid(socket, io) {
  let req = socket.request;
  socket.on('isUserStillValid', async (id) => {
    const sockets = await io.fetchSockets();
    const foundUser = sockets
      .filter((ele) => ele.data.userDetails.id === id)
      .map((ele) => ele.data.userDetails);
    if (foundUser.length === 0) {
      return socket.emit('response:userIsStillValid', {
        foundUser: 'no-user',
        id,
      });
    }
    return socket.emit('response:userIsStillValid', {
      foundUser,
    });
  });
}

export async function isTyping(socket, io) {
  socket.on('userIsTyping', async ({ sid, rid, typing }) => {
    const sockets = await io.fetchSockets();
    const receiver = sockets.find((ele, i) => ele.data.userDetails.id === rid);
    if (!receiver) {
      return;
    }
    io.to(receiver.id).emit('userIsTyping', { typing, sid });
  });
}

export async function disconnect(socket, io) {
  let sockets = await io.fetchSockets();
  let isUserStillConnected;
  socket.on('disconnect', async () => {
    socket.broadcast.emit('user:disconnected', {
      user: socket.data.userDetails,
      active: false,
    });
    setTimeout(async () => {
      sockets = await io.fetchSockets();
      isUserStillConnected = sockets.find(
        (ele) => ele.data.userDetails.id === socket.data.userDetails.id
      );
      if (!isUserStillConnected) {
        socket.broadcast.emit('user:disconnected', {
          user: socket.data.userDetails,
          active: false,
          disconnected: true,
        });
      }
    }, 70000);
  });
}

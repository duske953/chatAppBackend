## Anonymo: Real-time Chat Server with Persistent Messaging

This repository holds the backend code for a real-time chat application, providing the server-side functionality for features like persistent messaging, user management (optional), and real-time communication. 

### Technologies Used

* **Node.js:** ([https://nodejs.org/](https://nodejs.org/)) JavaScript runtime environment for building server-side applications.
* **Express.js:** ([https://expressjs.com/](https://expressjs.com/)) Web framework for building web applications and APIs with Node.js.
* **Socket.IO:** ([https://socket.io/](https://socket.io/)) Enables real-time, bidirectional communication between web clients and servers.

### Dependencies

This project relies on the following external libraries:

* express
* socket.io
* fakerjs
* express-session

You can install them by running:

```bash
npm install
```

### Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/duske953/chatAppBackend.git
   ```

2. **Install dependencies:**

   ```bash
   cd chatAppBackend
   npm install
   ```

3. **Run the server:**

   ```bash
   node app.js
   ```

   This will start the server and listen for incoming connections on the default port (usually 3000).

### Features

* **Persistent Messaging:** Messages are stored and retrieved upon revisiting the chat, allowing users to keep track of the conversation history even after refreshing the browser or closing the application.
* **Unique User Details Generation (Optional):** The server can generate unique and anonymous user details (usernames, avatars, etc.) to protect user identities while facilitating communication. You can implement this feature based on your specific requirements.
* **Real-time Communication:** Leverages Socket.IO to enable real-time communication between clients and the server, ensuring immediate message delivery and a seamless chat experience.


**Important Note:**

* This backend service is designed to work with the frontend code available at [https://github.com/duske953/chatapplication-frontend](https://github.com/duske953/chatapplication-frontend).

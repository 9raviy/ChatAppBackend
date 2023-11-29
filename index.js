const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["*"],
  },
});

app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to the Chat App Backend!");
});

// Store questions and answers in an object
const qaPairs = {};

// Store chat messages in an array
const messages = [];

io.on("connection", (socket) => {
  let userName; // Variable to store the current user's name

  // Listen for the user name from the frontend
  socket.on("user connected", (name) => {
    userName = name;

    // Send existing QA pairs and chat messages to the new user
    // socket.emit("qa pairs", qaPairs);
    socket.emit("chat messages", messages);

    // Broadcast user connection to all users
    io.emit("chat message", {
      user: "bot",
      message: `${userName} joined the chat!`,
    });

    socket.on("chat message", (msg) => {
      // Attach user name to the message
      const messageWithUser = { ...msg, user: userName };

      // Add the message to the messages array
      messages.push(messageWithUser);

      io.emit("chat message", messageWithUser);

      // Check if the message is a question
      const isQuestion = msg.message.endsWith("?");

      if (isQuestion) {
        // Check if the bot has a stored response for the question
        const storedResponse = qaPairs[msg.message.toLowerCase()];
        if (storedResponse) {
          // Emit the stored response with the information about the previous user who answered
          io.emit("chat message", {
            user: "Awesome Bot",
            message: `${userName} had earlier answered this question: ${storedResponse}`,
          });
        } else {
          qaPairs[msg.message.toLowerCase()] = null;
        }
      } else {
        if (messages.length > 1) {
          const lastMessage = messages[messages.length - 2].message;
          const wasLastMessageQuestion = lastMessage.endsWith("?");
          if (wasLastMessageQuestion) {
            qaPairs[lastMessage.toLowerCase()] = msg.message;
          }
        }
      }
    });

    socket.on("disconnect", () => {
      // Broadcast user disconnection to all users
      io.emit("chat message", {
        user: "bot",
        message: `${userName} left the chat.`,
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

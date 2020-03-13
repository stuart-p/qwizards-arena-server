const clientList = {};
let lobbyList = [];
let gameCount = 1;
let currentGame = 1;
const playersWaitingForQuiz = {};
const { fetchQuestions } = require("../models/quiz.models");
//client data format:
// {
//   clientID,
//     username,
//     loggedIn,
//     inLobby,
//     inQuiz,
//     quizScore,
//     playerLevel,
//     inGame,
//     killCount;
// }

module.exports = io => {
  io.on("connection", socket => {
    console.log("clientStatusController online and listening");
    clientList[socket.id] = {
      ...clientList[socket.id],
      clientID: socket.id,
      loggedIn: false,
      inLobby: false,
      inQuiz: false,
      inGame: false
    };
    socket.on("playerLogin", username => {
      clientList[socket.id] = { ...clientList[socket.id], username };

      socket.emit("loginAuthorised", true);
      clientList[socket.id] = { ...clientList[socket.id], loggedIn: true };
    });

    socket.on("joinedLobby", username => {
      const newLobbyUserData = {
        user: clientList[socket.id],
        username: clientList[socket.id].username,
        ready: false,
        game: gameCount,
        socket: socket.id
      };
      io.to(`lobby`).emit("newLobbyAddition", newLobbyUserData);
      socket.join(`lobby`);
      io.to("lobby").emit("playerJoinedLobbyNotification", {
        user: "admin",
        message: `${clientList[socket.id].username} has joined the lobby!`
      });
      lobbyList.push(newLobbyUserData);
      socket.emit("currentLobbyGuests", lobbyList);
      clientList[socket.id] = { ...clientList[socket.id], inLobby: true };
    });

    socket.on("lobbyMessageSend", message => {
      io.to(`lobby`).emit("lobbyMessageBroadcast", {
        user: clientList[socket.id].username,
        message
      });
    });

    socket.on("ready for the quiz", ready => {
      let notReady = 0;
      lobbyList.forEach(user => {
        if (user.socket !== socket.id && user.ready === false) {
          notReady++;
        }
        if (user.socket === socket.id) {
          user.ready = true;
        }
      });
      if (notReady === 0) {
        io.to(`lobby`).emit("startGame", lobbyList);
      }
    });

    socket.on("sendQuizQuestions", () => {
      console.log("sending quiz questions");
      const quizFinishTime = Date.now() + 20000;
      const quizQuestions = fetchQuestions();
      io.to(`lobby`).emit("beginQuiz", quizQuestions, quizFinishTime);
    });
    socket.on("requestToJoinNextGame", () => {
      playersWaitingForQuiz[socket.id] = { clientID: socket.id };
      socket.join("waitingForQuizStart");
    });

    //client requests to join next game

    socket.on("disconnect", () => {
      console.log("clientStatusController registered disconnect");
      lobbyList = lobbyList.filter(user => {
        return user.socket !== socket.id;
      });
      console.log(lobbyList);
      io.to(`lobby`).emit("currentLobbyGuests", lobbyList);
      delete clientList[socket.id];
      delete playersWaitingForQuiz[socket.id];
    });
  });
};

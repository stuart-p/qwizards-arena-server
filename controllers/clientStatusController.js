const clientList = {};
const lobbyList = { users: [], messages: [] };
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

    socket.on("playerLogin", username => {
      clientList[socket.id] = username;

      socket.emit("loginAuthorised", true);
    });

    socket.on("joinedLobby", username => {
      if (lobbyList.users.length < 11115) {
        lobbyList.users.push({
          username: clientList[socket.id],
          ready: false,
          game: gameCount,
          socket: socket.id
        });
        socket.join(`lobby1`);
      }
      // if (lobbyList[gameCount].length === 5) {
      //   gameCount++;-
      //   lobbyList[gameCount] = [gameCount];
      //   lobbyList[gameCount].users.push({
      //     username: clientList[socket.id],
      //     ready: false,
      //     game: gameCount
      //   });
      //   socket.join(`lobby${gameCount}`);
      // }
      io.to(`lobby1`).emit("currentLobbyData", lobbyList);
    });

    socket.on("newMessage", message => {
      lobbyList.messages.push({
        user: clientList[socket.id],
        message: message
      });
      io.to(`lobby1`).emit("currentLobbyData", lobbyList);
    });

    socket.on("ready for the quiz", ready => {
      let notReady = 0;
      lobbyList.users.forEach(user => {
        if (user.socket !== socket.id && user.ready === false) {
          notReady++;
        }
        if (user.socket === socket.id) {
          user.ready = true;
        }
      });
      if (notReady === 0) {
        io.to(`lobby1`).emit("startGame", lobbyList);
      }
    });

    //quiz begins when enough players have registered interest
    socket.on("sendQuizQuestions", () => {
      console.log("sendingquizquestions");
      const quizQuestions = fetchQuestions();
      io.to(`lobby1`).emit("beginQuiz", quizQuestions);
    });
    socket.on("requestToJoinNextGame", () => {
      playersWaitingForQuiz[socket.id] = { clientID: socket.id };
      socket.join("waitingForQuizStart");
    });

    //client requests to join next game

    socket.on("disconnect", () => {
      console.log("clientStatusController registered disconnect");
      lobbyList.users = lobbyList.users.filter(user => {
        return user.socket !== socket.id;
      });
      console.log(lobbyList);
      io.to(`lobby1`).emit("currentLobbyData", lobbyList);
      delete clientList[socket.id];
      delete lobbyList[socket.id];
      delete playersWaitingForQuiz[socket.id];
    });
  });
};

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
      console.log("recieved client login request");
      clientList[socket.id] = username;
      console.log(clientList);

      socket.emit("loginAuthorised", true);
    });

    socket.on("joinedLobby", username => {
      console.log(clientList);
      console.log(socket.id);

      if (lobbyList.users.length < 11115) {
        lobbyList.users.push({
          username: clientList[socket.id],
          ready: false,
          game: gameCount,
          socket: socket.id
        });
        socket.join(`lobby1`);
        console.log(`lobby1`);
      }
      // if (lobbyList[gameCount].length === 5) {
      //   gameCount++;
      //   lobbyList[gameCount] = [gameCount];
      //   lobbyList[gameCount].users.push({
      //     username: clientList[socket.id],
      //     ready: false,
      //     game: gameCount
      //   });
      //   socket.join(`lobby${gameCount}`);
      // }
      io.to(`lobby1`).emit("currentLobbyGuests", lobbyList);
    });

    socket.on("newMessage", message => {
      console.log(clientList);
      console.log(clientList[socket.id]);
      lobbyList.messages.push({
        user: clientList[socket.id],
        message: message
      });
      io.to(`lobby1`).emit("chatUpdate", lobbyList.messages);
      console.log("messageupdatesent");
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
    //client requests to join next game
    socket.on("requestToJoinNextGame", () => {
      playersWaitingForQuiz[socket.id] = { clientID: socket.id };
      socket.join("waitingForQuizStart");

      //quiz begins when enough players have registered interest
      if (Object.keys(playersWaitingForQuiz).length > 0) {
        io.to("waitingForQuizStart").emit(
          "quizStartNotification",
          "quiz round beginning!"
        );
        io.to("waitingForQuizStart").emit("beginQuiz", {
          quizQuestions: fetchQuestions()
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("clientStatusController registered disconnect");
      delete clientList[socket.id];
      delete lobbyList[socket.id];
      delete playersWaitingForQuiz[socket.id];
    });
  });
};

const clientList = {};
const lobbyList = {};
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
    clientList = { ...clientList, [socket.id]: true };

    //client logs in and is sent to the lobby
    socket.on("playerLogin", username => {
      console.log("recieved client login request");
      clientList[socket.id] = {
        username: ""
      };
      socket.emit("loginAuthorised", true);
      console.log("remitting login authorised");
      lobbyList[socket.id].users = { ...lobbyList[socket.id].users, username };
      socket.join("lobby");
      socket.to("lobby").emit("currentLobbyGuests", lobbyList);
      io.to("lobby").emit(
        "playerJoinedLobbyNotification",
        `${username} has joined the lobby`
      );
      socket.broadcast
        .to("lobby")
        .emit("newLobbyAddition", lobbyList[socket.id]);
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

const clientList = {};
let lobbyList = [];
let gameCount = 1;
const maxPlayers = 2;
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
      username: "undefined",
      loggedIn: false,
      inLobby: false,
      inQuiz: false,
      inGame: false,
      left: false
    };
    socket.on("playerLogin", username => {
      clientList[socket.id] = {
        ...clientList[socket.id],
        loggedIn: true,
        username
      };
      socket.emit("loginAuthorised", clientList[socket.id]);
    });

    socket.on("joinedLobby", () => {
      const newLobbyUserData = {
        username: clientList[socket.id].username,
        ready: false,
        game: gameCount,
        socket: socket.id,
        left: false
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
      socket.emit("updateClientDetails", clientList[socket.id]);
    });

    socket.on("lobbyMessageSend", message => {
      io.to(`lobby`).emit("lobbyMessageBroadcast", {
        user: clientList[socket.id].username,
        message
      });
    });

    socket.on("requestToJoinNextGame", ready => {
      lobbyList.forEach(user => {
        if (user.socket === socket.id) {
          if (user.ready === false) {
            const currentRequestsToJoin = io.sockets.adapter.rooms[
              "waitingForQuizStart"
            ] || { sockets: {} };
            if (
              Object.keys(currentRequestsToJoin.sockets).length < maxPlayers
            ) {
              user.ready = true;
              socket.join("waitingForQuizStart");
              io.to("lobby").emit("lobbyMessageBroadcast", {
                user: "admin",
                message: `${
                  clientList[socket.id].username
                } is joining the next game!`
              });
              if (
                Object.keys(currentRequestsToJoin.sockets).length === maxPlayers
              ) {
                console.log("max players!");
                io.to("waitingForQuizStart").emit("startGame");
                io.of("/")
                  .in("lobby")
                  .clients((err, sockets) => {
                    if (err) throw err;

                    sockets.forEach(socketID => {
                      io.sockets.sockets[socketID].leave("waitingForQuizStart");
                      io.sockets.sockets[socketID].leave("lobby");
                      io.sockets.sockets[socketID].join("inQuiz");
                      clientList[socketID] = {
                        ...clientList[socketID],
                        inLobby: false,
                        inQuiz: true
                      };
                      io.to("lobby").emit(
                        "lobbyGuestStateUpdate",
                        clientList[socketID]
                      );
                      lobbyList = lobbyList.filter(user => {
                        return user.socket !== socket.ID;
                      });
                    });
                  });
              }
            }
          } else {
            socket.leave("waitingForQuizStart");
            user.ready = false;
            io.to("lobby").emit("lobbyMessageBroadcast", {
              user: "admin",
              message: `${
                clientList[socket.id].username
              } is no longer joining the next game...`
            });
          }
          io.to("lobby").emit("lobbyGuestStateUpdate", user);
        }
      });
    });

    //quiz begins when enough players have registered interest
    socket.on("sendQuizQuestions", () => {
      const quizQuestions = fetchQuestions();
      io.to(`inQuiz`).emit("beginQuiz", quizQuestions);
    });

    //client requests to join next game

    socket.on("disconnect", () => {
      console.log("clientStatusController registered disconnect");
      lobbyList = lobbyList.filter(user => {
        return user.socket !== socket.id;
      });
      io.to(`lobby`).emit("currentLobbyGuests", lobbyList);
      delete clientList[socket.id];
      delete playersWaitingForQuiz[socket.id];
    });
  });
};

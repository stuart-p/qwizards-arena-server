const express = require("express");
const app = express();
const path = require("path");
const jsdom = require("jsdom");
const server = require("http").Server(app);
const io = require("socket.io").listen(server);
const Datauri = require("datauri");
const datauri = new Datauri();
const { JSDOM } = jsdom;
const clientStatusController = require("./controllers/clientStatusController");
app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => {
  // res.status(201).sendFile(__dirname + "/index.html");
  res.status(200).send("get received");
});

io.on("connection", socket => {
  console.log(`a client has connected to the server: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`a client has disconnected from the server: ${socket.id}`);
  });
});
clientStatusController(io);

function setupAuthoratitivePhaser() {
  JSDOM.fromFile(path.join(__dirname, "authoratitive_server/index.html"), {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
  })
    .then(dom => {
      dom.window.URL.createObjectURL = blob => {
        if (blob) {
          return datauri.format(
            blob.type,
            blob[Object.getOwnPropertySymbols(blob)[0]]._buffer
          ).content;
        }
      };
      dom.window.URL.revokeObjectURL = objectURL => {};

      dom.window.gameLoaded = () => {
        let port = process.env.PORT;
        if (port == null || port == "") {
          port = 8080;
        }
        server.listen(port, function() {
          console.log(`Listening on ${server.address().port}`);
        });
      };
      dom.window.io = io;
    })
    .catch(error => {
      console.log(error.message);
    });
}

setupAuthoratitivePhaser();

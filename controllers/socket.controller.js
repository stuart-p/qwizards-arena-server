let connection = null;

class SocketController {
  constructor() {
    this._socket = null;
  }

  connect(server) {
    const io = require("socket.io").listen(server);
    io.on("connection", socket => {
      this._socket = socket;
      this._socket.on("statusConnection", data => {
        console.log(data);
      });
      this._socket.on("disconnect", () => {
        console.log(socket.id, " socket disconnected");
      });
      console.log(`new socket connection: ${socket.id}`);
    });
  }

  sendEvent(event, data) {
    this._socket.emit(event, data);
  }
  registerEvent(event, handler) {
    this._socket.on(event, handler);
  }

  static init(server) {
    if (!connection) {
      connection = new SocketController();
      connection.connect(server);
    }
  }

  static getConnection() {
    if (!connection) {
      throw new Error("no active connection");
    }
    return connection;
  }
}

module.exports = {
  connect: SocketController.init,
  connection: SocketController.getConnection
};

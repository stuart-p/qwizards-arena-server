const config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);
let dolly;
function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("baddie", "assets/13.png");
  this.load.image("star", "assets/star.png");
  this.load.image("tiles", "assets/rogue.png");
  this.load.tilemapTiledJSON("map", "assets/mapTest.json");
}

function create() {
  const self = this;
  this.socket = io();
  this.players = this.add.group();
  dolly = this.physics.add.image(100, 100, "star");
  this.cameras.main.setDeadzone(50, 50);
  this.cameras.main.startFollow(dolly, true, 0.05, 0.05);
  this.cameras.main.setZoom(1.6);

  this.socket.on("currentPlayers", players => {
    Object.keys(players).forEach(id => {
      if (players[id].playerID === self.socket.id) {
        displayPlayers(self, players[id], "genie");
      } else {
        displayPlayers(self, players[id], "baddie");
      }
    });
  });

  this.socket.on("newPlayer", playerInfo => {
    displayPlayers(self, playerInfo, "baddie");
  });

  this.socket.on("disconnect", playerID => {
    self.players.getChildren().forEach(player => {
      if (playerID === player.playerID) {
        player.destroy();
      }
    });
  });

  this.socket.on("playerUpdates", players => {
    Object.keys(players).forEach(id => {
      self.players.getChildren().forEach(player => {
        if (players[id].playerID === player.playerID) {
          player.setRotation(players[id].rotation);
          player.setPosition(players[id].x, players[id].y);
        }
      });
    });
    dolly.setPosition(players[this.socket.id].x, players[this.socket.id].y);
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
  this.downKeyPressed = false;

  const map = this.make.tilemap({ key: "map" });

  const tileset = map.addTilesetImage("rogue", "tiles");
  const layerOne = map.createStaticLayer("floor", tileset, 0, 0);
  const layerTwo = map.createStaticLayer("walls", tileset, 0, 0);
}

function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const up = this.upKeyPressed;
  const down = this.downKeyPressed;

  if (this.cursors.left.isDown) {
    this.leftKeyPressed = true;
    this.rightKeyPressed = false;
  } else if (this.cursors.right.isDown) {
    this.rightKeyPressed = true;
    this.leftKeyPressed = false;
  } else {
    this.leftKeyPressed = false;
    this.rightKeyPressed = false;
  }

  if (this.cursors.up.isDown) {
    this.upKeyPressed = true;
    this.downKeyPressed = false;
  } else if (this.cursors.down.isDown) {
    this.downKeyPressed = true;
    this.upKeyPressed = false;
  } else {
    this.downKeyPressed = false;
    this.upKeyPressed = false;
  }

  if (
    left !== this.leftKeyPressed ||
    right !== this.rightKeyPressed ||
    up !== this.upKeyPressed ||
    down !== this.downKeyPressed
  ) {
    this.socket.emit("playerInput", {
      left: this.leftKeyPressed,
      right: this.rightKeyPressed,
      up: this.upKeyPressed,
      down: this.downKeyPressed
    });
  }
}

function displayPlayers(self, playerInfo, sprite) {
  const player = self.add
    .sprite(playerInfo.x, playerInfo.y, sprite)
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50);
  if (playerInfo.team === "blue") {
    // player.setTint(0x0000ff);
  } else {
    // player.setTint(0xff0000);
  }

  player.playerID = playerInfo.playerID;
  self.players.add(player);
}

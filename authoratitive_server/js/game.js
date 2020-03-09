const config = {
  type: Phaser.HEADLESS,
  parent: "phaser-example",
  width: 800,
  height: 600,
  autoFocus: false,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
const players = {};
const attacks = {};
let numberOfAttacks = 0;

function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("fireball", "assets/balls.png");
}

function create() {
  const self = this;
  this.players = this.physics.add.group();
  this.attacks = this.physics.add.group();
  io.on("connection", socket => {
    console.log("a client connected");
    players[socket.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerID: socket.id,
      // team: Math.floor(Math.random() * 2) == 0 ? "red" : "blue",
      input: {
        left: false,
        right: false,
        up: false,
        down: false
      }
    };
    addPlayer(self, players[socket.id]);

    socket.emit("currentPlayers", players);
    socket.broadcast.emit("newPlayer", players[socket.id]);

    socket.on("disconnect", () => {
      console.log("a client disconnected");
      removePlayer(self, socket.id);

      delete players[socket.id];
      io.emit("disconnect", socket.id);
    });

    socket.on("playerInput", inputData => {
      handlePlayerInput(self, socket.id, inputData);
    });
    socket.on("attackInput", histring => {
      console.log(this.players[socket.id]);
      addAttack(self, players[socket.id]);
    });
    socket.on("set health", health => {
      console.log("setting health to: ", health);
      setHealth(health, self);
      console.log("self.data.values.health: ", self.data.values.health);
    });
  });
}

function update() {
  // console.log(attacks);
  this.players.getChildren().forEach(player => {
    const input = players[player.playerID].input;
    if (input.left) {
      player.body.velocity.x = -150;
      // player.setAngularVelocity(-450);
    } else if (input.right) {
      player.body.velocity.x = 150;
      // player.setAngularVelocity(450);
    } else {
      player.body.velocity.x = 0;
      // player.setAngularVelocity(0);
    }

    if (input.up) {
      player.body.velocity.y = -150;
      // this.physics.velocityFromRotation(
      //   player.rotation + 1.5,
      //   200,
      //   player.body.acceleration
      // );
    } else if (input.down) {
      player.body.velocity.y = 150;
    } else {
      player.body.velocity.y = 0;
      // player.setAcceleration(0);
    }

    players[player.playerID].x = player.x;
    players[player.playerID].y = player.y;
    players[player.playerID].rotation = player.rotation;
  });

  io.emit("playerUpdates", players);
  io.emit("attackUpdates", attacks);
}

function addPlayer(self, playerInfo) {
  console.log("addingPlayer");
  const player = self.physics.add
    .image(playerInfo.x, playerInfo.y, "genie")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50);
  player.setDrag(5);
  player.setAngularDrag(100);
  player.setMaxVelocity(200);
  player.playerID = playerInfo.playerID;
  self.players.add(player);
  player.body.setCollideWorldBounds(true);
}

function addAttack(self, playerInfo) {
  console.log("hererer");
  const attack = self.physics.add
    .image(playerInfo.x, playerInfo.y, "fireball")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50);
  attack.setDrag(5);
  attack.setAngularDrag(100);
  attack.setMaxVelocity(400);
  attack.playerID = numberOfAttacks;
  // attack.attackID = numberOfAttacks;
  numberOfAttacks++;
  console.log(playerInfo.input);
  if (playerInfo.input.right) {
    attack.body.velocity.x = 250;
  }
  if (playerInfo.input.left) {
    attack.body.velocity.x = -250;
  }
  if (playerInfo.input.up) {
    attack.body.velocity.y = -250;
  }
  if (playerInfo.input.down) {
    attack.body.velocity.y = 250;
  }
  attack.body.setCollideWorldBounds(true);
  self.attacks.add(attack);

  io.emit("newAttack", playerInfo);
}

function setHealth(health, self) {
  self.data.set("health", health);
}

function removePlayer(self, playerID) {
  self.players.getChildren().forEach(player => {
    if (playerID === player.playerID) {
      player.destroy();
    }
  });
}

function handlePlayerInput(self, playerID, input) {
  self.players.getChildren().forEach(player => {
    if (playerID === player.playerID) {
      players[player.playerID].input = input;
    }
  });
}

const game = new Phaser.Game(config);

window.gameLoaded();

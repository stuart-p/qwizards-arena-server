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

const playerClientUpdateObject = {};
const attackClientUpdateObject = {};
const something = {};
let attackID = 0;
let numberOfAttacks = 0;

function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("fireball", "assets/balls.png");
  console.log("PRELOADING");
}

function create() {
  const self = this;
  const scores = {};

  this.players = this.physics.add.group();
  this.attacks = this.physics.add.group();

  io.on("connection", socket => {
    socket.on("clientGameReady", score => {
      scores[socket.id] = score;
    });

    socket.on("gameLoaded", () => {
      console.log("SCOREJAMIE", scores[socket.id]);
      console.log(scores);
      playerClientUpdateObject[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerID: socket.id,
        life: scores[socket.id],
        isAlive: true,
        hitBy: {},
        input: {
          left: false,
          right: false,
          up: false,
          down: false
        }
      };

      addPlayer(self, playerClientUpdateObject[socket.id]);

      socket.emit("currentPlayers", playerClientUpdateObject);
      socket.broadcast.emit("newPlayer", playerClientUpdateObject[socket.id]);
    });

    socket.on("player hit", playerID => {
      console.log("test");
    });

    socket.on("disconnect", () => {
      removePlayer(self, socket.id);

      delete playerClientUpdateObject[socket.id];
      io.emit("disconnect", socket.id);
    });

    socket.on("playerInput", inputData => {
      handlePlayerInput(self, socket.id, inputData);
    });
    socket.on("attackInput", histring => {
      // console.log(players[socket.id]);
      if (playerClientUpdateObject[socket.id]) {
        if (
          playerClientUpdateObject[socket.id].isAlive &&
          (playerClientUpdateObject[socket.id].hasAttacked === false ||
            playerClientUpdateObject[socket.id].hasAttacked === undefined)
        ) {
          const attack = {
            player: socket.id,
            attackID: attackID,
            x: playerClientUpdateObject[socket.id].x,
            y: playerClientUpdateObject[socket.id].y,
            isAlive: true
          };

          attackClientUpdateObject[attackID++] = attack;
          addAttack(self, playerClientUpdateObject[socket.id], attack);

          io.emit("newAttack", attack);
        }
      }
    });
    socket.on("something", thing => {
      if (
        playerClientUpdateObject[socket.id].hasSomething === false ||
        playerClientUpdateObject[socket.id].hasSomething === undefined
      ) {
        let newSomething = {
          player: playerClientUpdateObject[socket.id],
          thing: thing
        };
        something[socket.id] = newSomething;
        io.emit("somethingAdded", newSomething);
        playerClientUpdateObject[socket.id].hasSomething = true;
        self.time.delayedCall(
          1000,
          () => {
            delete something[socket.id];
            io.emit("somethingRemoved", something);
          },
          [],
          this
        );
        self.time.delayedCall(
          6000,
          () => {
            playerClientUpdateObject[socket.id].hasSomething = false;
          },
          [],
          this
        );
      }
    });
  });
}

function update() {
  this.players.getChildren().forEach(player => {
    const input = playerClientUpdateObject[player.playerID].input;
    if (input.left) {
      player.body.velocity.x = -150;
    } else if (input.right) {
      player.body.velocity.x = 150;
    } else {
      player.body.velocity.x = 0;
    }

    if (input.up) {
      player.body.velocity.y = -150;
    } else if (input.down) {
      player.body.velocity.y = 150;
    } else {
      player.body.velocity.y = 0;
    }

    playerClientUpdateObject[player.playerID].x = player.x;
    playerClientUpdateObject[player.playerID].y = player.y;
    playerClientUpdateObject[player.playerID].rotation = player.rotation;
  });

  this.attacks.getChildren().forEach(attackObj => {
    this.players.getChildren().forEach(player => {
      if (attackObj.playerID !== player.playerID) {
        if (attackObj.x - player.x < 30 && attackObj.x - player.x > -30) {
          if (attackObj.y - player.y < 30 && attackObj.y - player.y > -30) {
            attackObj.isAlive = false;
            playerClientUpdateObject[player.playerID].life--;
            if (playerClientUpdateObject[player.playerID].life === 0) {
              player.isAlive = false;
              console.log("player killed");
              // HERE WE CAN USE THE ATTACK.PLAYERID TO ADD A KILL TO A PLAYER
              playerClientUpdateObject[player.playerID].isAlive = false;
              io.emit("onDie", player.playerID);
            }
            // }

            // socket.emit("playerUpdates", playerClientUpdateObject);
          }
        }
      }
    });

    // console.log(attackObj.body.velocity);
    // if (attackObj.body.velocity.x === 0 && attackObj.body.velocity.y === 0) {
    //   delete attackClientUpdateObject[attackObj.attackID];
    //   attackObj.destroy();
    // } else {
    //   attackClientUpdateObject[attackObj.attackID].x = attackObj.x;
    //   attackClientUpdateObject[attackObj.attackID].y = attackObj.y;
    // }
  });
  this.attacks.getChildren().forEach(attackObj => {
    if (attackObj.body.velocity.x === 0 && attackObj.body.velocity.y === 0) {
      attackObj.isAlive = false;
    }
    if (attackObj.isAlive === false) {
      io.emit("attackEnded", attackObj.attackID);
      delete attackClientUpdateObject[attackObj.attackID];
      attackObj.destroy();
    } else {
      attackClientUpdateObject[attackObj.attackID].x = attackObj.x;
      attackClientUpdateObject[attackObj.attackID].y = attackObj.y;
    }
  });

  io.emit("somethingUpdates", {
    somethings: something,
    players: playerClientUpdateObject
  });

  io.emit("playerUpdates", playerClientUpdateObject);

  io.emit("attackUpdates", attackClientUpdateObject);
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add
    .image(playerInfo.x, playerInfo.y, "genie")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50);
  player.setDrag(5);
  player.setAngularDrag(100);
  player.setMaxVelocity(200);
  player.playerID = playerInfo.playerID;
  player.isAlive = playerInfo.isAlive;
  self.players.add(player);
  player.body.setCollideWorldBounds(true);
}

function addAttack(self, playerInfo, attackInfo) {
  if (
    playerInfo.isAlive &&
    (playerInfo.hasAttacked === false || playerInfo.hasAttacked === undefined)
  ) {
    playerInfo.hasAttacked = true;
    self.time.delayedCall(
      1000,
      () => {
        playerInfo.hasAttacked = false;
      },
      [],
      this
    );
    // add a cooldown
    // console.log("hererer");
    const attack = self.physics.add
      .image(playerInfo.x, playerInfo.y, "fireball")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(50, 50);

    self.attacks.add(attack);
    attack.attackID = attackInfo.attackID;
    attack.playerID = playerInfo.playerID;
    attack.isAlive = attackInfo.isAlive;
    // attack.attackID = numberOfAttacks;
    // numberOfAttacks++;
    // console.log(playerInfo.input);
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
  }
  // io.emit("newAttack", playerInfo);
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
      playerClientUpdateObject[player.playerID].input = input;
    }
  });
}

const game = new Phaser.Game(config);

window.gameLoaded();

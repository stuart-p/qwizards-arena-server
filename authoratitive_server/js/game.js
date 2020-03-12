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
const spell = {};
let attackID = 0;
let numberOfAttacks = 0;
let playerList = {};

function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("fireball", "assets/balls.png");
}

function create() {
  const self = this;
  const scores = {};
  // const playersAlive = 0;
  this.players = this.physics.add.group();
  this.attacks = this.physics.add.group();

  io.on("connection", socket => {
    socket.on("playerLogin", username => {
      playerList[socket.id] = username;
    });

    socket.on("clientGameReady", score => {
      scores[socket.id] = score;
    });
    // socket.on("currentLobbyGuests", lobbyList => {
    //   console.log("here donkey");
    //   console.log(lobbyList);
    // });
    // socket.on("playerLogin", username => {
    //   players[socket.id] = username;
    //   playersAlive = players.Length;
    // });

    socket.on("gameLoaded", () => {
      playerClientUpdateObject[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerID: socket.id,
        life: 4,
        isAlive: true,
        username: playerList[socket.id],
        kills: 0,
        hits: 0,
        winner: false,
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

    socket.on("player hit", playerID => {});

    socket.on("disconnect", () => {
      removePlayer(self, socket.id);

      delete playerClientUpdateObject[socket.id];
      io.emit("disconnect", socket.id);
    });

    socket.on("playerInput", inputData => {
      handlePlayerInput(self, socket.id, inputData);
    });
    socket.on("attackInput", histring => {
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
    socket.on("spell", thing => {
      if (
        playerClientUpdateObject[socket.id].hasspell === false ||
        playerClientUpdateObject[socket.id].hasspell === undefined
      ) {
        let newspell = {
          player: playerClientUpdateObject[socket.id],
          thing: thing
        };
        spell[socket.id] = newspell;
        io.emit("spellAdded", newspell);
        playerClientUpdateObject[socket.id].hasspell = true;
        self.time.delayedCall(
          1000,
          () => {
            delete spell[socket.id];
          },
          [],
          this
        );
        self.time.delayedCall(
          6000,
          () => {
            playerClientUpdateObject[socket.id].hasspell = false;
          },
          [],
          this
        );
      }
    });
  });
}
// RUNS 60times a second
function update() {
  // takes input from client and moves their sprites
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
    // adds new location to player update object
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
            // console.log(player.hasspell);
            if (
              playerClientUpdateObject[player.playerID].hasspell === false ||
              playerClientUpdateObject[player.playerID].hasspell === undefined
            ) {
              playerClientUpdateObject[player.playerID].life--;
              playerClientUpdateObject[attackObj.playerID].hits++;
            }
            if (playerClientUpdateObject[player.playerID].life === 0) {
              player.isAlive = false;
              playerClientUpdateObject[attackObj.playerID].kills++;
              playerClientUpdateObject[player.playerID].isAlive = false;
              let playersAlive = Object.keys(playerClientUpdateObject).filter(
                player => {
                  return playerClientUpdateObject[player].isAlive === true;
                }
              );
              io.emit("onDie", player.playerID);
              if (playersAlive.length === 1) {
                let winner = playerClientUpdateObject[playersAlive[0]].username;
                io.emit("gameWinnerNotification", winner);
                this.time.delayedCall(
                  5000,
                  () => {
                    game.loop.stop();
                    game.canvas.remove();
                    window.game = null;
                    io.emit("showGameSummary", playerClientUpdateObject);
                  },
                  [],
                  this
                );
              }
            }
          }
        }
      }
    });
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

  io.emit("spellUpdates", {
    spells: spell,
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

    const attack = self.physics.add
      .image(playerInfo.x, playerInfo.y, "fireball")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(50, 50);

    self.attacks.add(attack);
    attack.attackID = attackInfo.attackID;
    attack.playerID = playerInfo.playerID;
    attack.isAlive = attackInfo.isAlive;

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

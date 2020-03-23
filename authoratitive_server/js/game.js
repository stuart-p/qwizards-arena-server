const config = {
  type: Phaser.HEADLESS,
  parent: "phaser-example",
  width: 1600,
  height: 800,
  autoFocus: false,
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

let playerClientUpdateObject = {};
let attackClientUpdateObject = {};
let spell = {};
let attackID = 0;
let numberOfAttacks = 0;
let playerList = {};
let ranking = [];
let gameInProgress = false;
const spawnPoints = [
  [446, 570],
  [232, 111],
  [947, 174],
  [918, 505],
  [1316, 299],
  [1225, 514],
  [211, 389],
  [610, 92]
];
let spawnValue = 0;

function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("fireball", "assets/balls.png");
  this.load.image("background", "assets/backgroundExtrude.png");
  this.load.image("decorative", "assets/decorativeExtrude.png");
  this.load.tilemapTiledJSON("map", "assets/forestLevel.json");
}

function create() {
  // console.log("server game scene is being re-created");
  spawnValue = 0;
  const self = this;
  const scores = {};
  // const playersAlive = 0;
  this.players = this.physics.add.group();
  this.attacks = this.physics.add.group();
  // this.scene.pause();
  // this.scene.resume();
  io.on("connection", socket => {
    socket.on("playerLogin", username => {
      playerList[socket.id] = username;
    });

    socket.on("clientGameReady", (score, username) => {
      scores[socket.id] = score;
      playerList[socket.id] = username;
      //we send a message to back to the player with their max health and currentHealth (currently just score +1)
      io.to("inGame").emit("playerHealth", socket.id, score + 1, score + 1);
    });

    let power = Math.ceil(scores[socket.id] / 4);
    socket.on("gameLoaded", () => {
      // console.log("server game scene is resuming...");
      gameInProgress = true;
      // let testscore = Math.ceil(scores[socket.id] / 4);
      // console.log(testscore);
      playerClientUpdateObject[socket.id] = {
        rotation: 0,
        // x: Math.floor(Math.random() * 700) + 50,
        // y: Math.floor(Math.random() * 500) + 50,
        x: spawnPoints[spawnValue][0],
        y: spawnPoints[spawnValue][1],
        playerID: socket.id,
        maxLife: 1 + scores[socket.id],
        life: 1 + scores[socket.id],
        power: 1,
        isAlive: true,
        username: playerList[socket.id],
        kills: 0,
        hits: 0,
        spellsCast: 0,
        winner: false,
        rank: 0,
        hitBy: {},
        input: {
          left: false,
          right: false,
          up: false,
          down: false
        }
      };
      spawnValue++;
      if (spawnValue >= 8) spawnValue = 0;
      // console.log("server is sending a list of player objects to client");
      // console.log(playerClientUpdateObject);
      addPlayer(self, playerClientUpdateObject[socket.id]);
      socket.emit("currentPlayers", playerClientUpdateObject);
      socket
        .to("inGame")
        .emit("newPlayer", playerClientUpdateObject[socket.id]);
    });

    socket.on("player hit", playerID => {});

    socket.on("disconnect", () => {
      removePlayer(self, socket.id);

      delete playerClientUpdateObject[socket.id];
      io.to("inGame").emit("disconnect", socket.id);
    });

    socket.on("playerInput", inputData => {
      handlePlayerInput(self, socket.id, inputData);
    });
    socket.on("attackInput", inputData => {
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
            isAlive: true,
            direction: inputData
          };

          attackClientUpdateObject[attackID++] = attack;
          addAttack(self, playerClientUpdateObject[socket.id], attack);
          playerClientUpdateObject[socket.id].spellsCast++;
          io.to("inGame").emit("newAttack", attack);
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
        io.to("inGame").emit("spellAdded", newspell);
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

  const map = this.make.tilemap({ key: "map" });

  const tileset = map.addTilesetImage("background", "background", 32, 32, 1, 2);
  const decorativeTileset = map.addTilesetImage(
    "decorative",
    "decorative",
    32,
    32,
    1,
    2
  );

  const obstacles = map.createStaticLayer("obstacles", tileset, 0, 0);
  const obstacleDecorations = map.createStaticLayer(
    "obstacleDecorations",
    decorativeTileset,
    0,
    0
  );

  obstacles.setCollisionByProperty({ collides: true });
  obstacleDecorations.setCollisionByProperty({ collides: true });

  this.physics.add.collider(this.players, obstacles);
  this.physics.add.collider(this.players, obstacleDecorations);
}
// RUNS 60times a second
function update() {
  if (gameInProgress === false) {
    return;
  }
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
        if (attackObj.x - player.x < 25 && attackObj.x - player.x > -25) {
          if (attackObj.y - player.y < 25 && attackObj.y - player.y > -25) {
            if (player.isAlive === true) {
              attackObj.isAlive = false;

              if (
                playerClientUpdateObject[player.playerID].hasspell === false ||
                playerClientUpdateObject[player.playerID].hasspell === undefined
              ) {
                playerClientUpdateObject[player.playerID].life =
                  playerClientUpdateObject[player.playerID].life -
                  playerClientUpdateObject[attackObj.playerID].power;
                if (playerClientUpdateObject[player.playerID].life < 0) {
                  playerClientUpdateObject[player.playerID].life = 0;
                }
                playerClientUpdateObject[attackObj.playerID].hits++;
                io.to("inGame").emit(
                  "hit",
                  attackObj.playerID,
                  player.playerID
                );
                io.to("inGame").emit(
                  "playerHealth",
                  player.playerID,
                  playerClientUpdateObject[player.playerID].life,
                  playerClientUpdateObject[player.playerID].maxLife
                );

                if (playerClientUpdateObject[player.playerID].life === 0) {
                  ranking.push(player.playerID);
                  player.isAlive = false;
                  playerClientUpdateObject[attackObj.playerID].kills++;
                  playerClientUpdateObject[player.playerID].isAlive = false;

                  let playersAlive = Object.keys(
                    playerClientUpdateObject
                  ).filter(player => {
                    return playerClientUpdateObject[player].isAlive === true;
                  });
                  io.to("inGame").emit("onDie", player.playerID);

                  if (playersAlive.length === 1) {
                    let winner =
                      playerClientUpdateObject[playersAlive[0]].username;
                    io.to("inGame").emit("gameWinnerNotification", winner);
                    playerClientUpdateObject[playersAlive[0]].winner = true;

                    ranking.push(playersAlive[0]);
                    setRanking();
                    gameInProgress = false;
                    this.time.delayedCall(
                      5000,
                      () => {
                        // this.scene.pause();
                        io.to("inGame").emit(
                          "showGameSummary",
                          playerClientUpdateObject
                        );
                        const allSocketsInGame =
                          io.sockets.adapter.rooms["inGame"].sockets;
                        Object.keys(allSocketsInGame).forEach(socketID => {
                          io.sockets.sockets[socketID].leave("inGame");
                        });
                        this.scene.restart();
                        // this.scene.pause();
                        resetGame();
                      },
                      [],
                      this
                    );
                  }
                }
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
      io.to("inGame").emit("attackEnded", attackObj.attackID);
      delete attackClientUpdateObject[attackObj.attackID];
      attackObj.destroy();
    } else {
      attackClientUpdateObject[attackObj.attackID].x = attackObj.x;
      attackClientUpdateObject[attackObj.attackID].y = attackObj.y;
    }
  });

  io.to("inGame").emit("spellUpdates", {
    spells: spell,
    players: playerClientUpdateObject
  });

  io.to("inGame").emit("playerUpdates", playerClientUpdateObject);

  io.to("inGame").emit("attackUpdates", attackClientUpdateObject);
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add
    .image(playerInfo.x, playerInfo.y, "genie")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(20, 20);
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
      .setDisplaySize(20, 20);

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

function setRanking() {
  ranking.reverse().map((playerID, position) => {
    console.log(position + 1);
    playerClientUpdateObject[playerID].rank = position + 1;
  });
}

function resetGame() {
  playerClientUpdateObject = {};
  attackClientUpdateObject = {};
  spell = {};
  attackID = 0;
  numberOfAttacks = 0;
  playerList = {};
  ranking = [];
}

const game = new Phaser.Game(config);

window.gameLoaded();

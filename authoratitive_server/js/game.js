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
let attackID = 0;
let numberOfAttacks = 0;

function preload() {
  this.load.image("genie", "assets/10.png");
  this.load.image("fireball", "assets/balls.png");
}

function create() {
  const self = this;
  // console.log(this.players);
  this.players = this.physics.add.group();
  this.attacks = this.physics.add.group();
  io.on("connection", socket => {
    console.log("a client connected");
    playerClientUpdateObject[socket.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerID: socket.id,
      life: 3,
      hitBy: {},
      // team: Math.floor(Math.random() * 2) == 0 ? "red" : "blue",
      input: {
        left: false,
        right: false,
        up: false,
        down: false
      }
    };

    // this.physics.add.overlap(this.players, this.attacks, function(
    //   player,
    //   attack
    // ) {
    //   if (player.playerID !== attack.playerID) {
    //     socket.emit("player hit", player.playerID);
    //     // players[player.playerID].destroy();
    //     // delete playerClientUpdateObject[player.playerID];
    //     // socket.emit("playerUpdates", playerClientUpdateObject);
    //   }
    // });

    addPlayer(self, playerClientUpdateObject[socket.id]);

    socket.emit("currentPlayers", playerClientUpdateObject);
    socket.broadcast.emit("newPlayer", playerClientUpdateObject[socket.id]);

    socket.on("player hit", playerID => {
      console.log("test");
    });

    socket.on("disconnect", () => {
      console.log("a client disconnected");
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
          playerClientUpdateObject[socket.id].hasAttacked === false ||
          playerClientUpdateObject[socket.id].hasAttacked === undefined
        ) {
          const attack = {
            player: socket.id,
            attackID: attackID,
            x: playerClientUpdateObject[socket.id].x,
            y: playerClientUpdateObject[socket.id].y
          };

          attackClientUpdateObject[attackID++] = attack;
          addAttack(self, playerClientUpdateObject[socket.id], attack.attackID);

          io.emit("newAttack", attack);
        }
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
            // if (
            //   playerClientUpdateObject[player.playerID].hitBy[
            //     attackObj.attackID
            //   ] === undefined
            // ) {
            //   playerClientUpdateObject[player.playerID].life--;
            //   console.log("life reduced");
            //   playerClientUpdateObject[player.playerID] = true;
            //   console.log("added attack id to player");
            attackObj.destroy();
            playerClientUpdateObject[player.playerID].life--;
            if (playerClientUpdateObject[player.playerID].life === 0) {
              player.destroy();
              console.log("player killed");
              // HERE WE CAN USE THE ATTACK.PLAYERID TO ADD A KILL TO A PLAYER
              delete playerClientUpdateObject[player.playerID];
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
      delete attackClientUpdateObject[attackObj.attackID];
      attackObj.destroy();
    } else {
      attackClientUpdateObject[attackObj.attackID].x = attackObj.x;
      attackClientUpdateObject[attackObj.attackID].y = attackObj.y;
    }
  });

  io.emit("playerUpdates", playerClientUpdateObject);

  io.emit("attackUpdates", attackClientUpdateObject);
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

function addAttack(self, playerInfo, attackID) {
  if (
    playerInfo.hasAttacked === false ||
    playerInfo.hasAttacked === undefined
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

    attack.setDrag(5);
    attack.setAngularDrag(100);
    attack.setMaxVelocity(400);
    attack.attackID = attackID;
    attack.playerID = playerInfo.playerID;
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

// function attackHit(player, attack) {
//   console.log(this.players);
//   if (player.playerID !== attack.playerID) {
//     // console.log(player.playerID);
//     // console.log(players);
//     // this.players[player.playerID].destroy();
//     // delete playerClientUpdateObject[player.playerID];
//     // socket.emit("playerUpdates", playerClientUpdateObject);
//     killPlayer(player);
//   }
// }

// function killPlayer(player) {
//   //console.log(player.playerID);
//   // console.log(players);
//   // this.players[player.playerID].destroy();
//   // delete playerClientUpdateObject[player.playerID];
//   // socket.emit("playerUpdates", playerClientUpdateObject);
// }

const game = new Phaser.Game(config);

window.gameLoaded();

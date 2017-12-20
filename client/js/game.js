var socket = io();
var cursors;
var velocity = 0;
var game = new Phaser.Game(1000, 1000, Phaser.AUTO, 'main_game', {
  preload: preload,
  create: create,
  update: update,
  CarInteraction: CarInteraction,
  CarUpdate: CarUpdate
});
var x = 0;
var y = 0;
var playerCar;
var CollisionTrack;

function preload() {
  this.game.load.spritesheet('track', 'client/img/Background-Track.png');
  this.game.load.spritesheet('car', 'client/img/CarSmall.png');
  game.load.spritesheet('Collision-Track', 'client/img/Collision-Track.png');
  game.load.physics("collision", "client/img/collision.json");
  this.game.scale.pageAlignHorizontally = true;
  this.game.scale.pageAlignVertically = true;
  this.game.scale.refresh();
  //this.game.world.scale.setTo(2.5, 2.5);
}

function create() {
  var playerMap = {};
  console.log("creating game");
  game.physics.startSystem(Phaser.Physics.P2JS);
  var track = game.add.sprite(0, 0, 'track');
  CollisionTrack = game.add.sprite(500, 500, 'Collision-Track');
  console.log("Track and collision added");
  car.askNewPlayer();
  console.log(game.playerCar);
  //car = game.add.sprite(600, 100, 'car');
}

function update() {
  setTimeout(CarUpdate(), 10000);
  this.camera.follow(playerCar, Phaser.Camera.FOLLOW_LOCKON);
  if (cursors.up.isDown && velocity <= 200) {
    velocity += 4;
    socket.emit('keyPress', {
      inputId: 'up',
      state: true
    });
  } else if (cursors.down.isDown && velocity >= -50) {
    velocity -= 4;
    socket.emit('keyPress', {
      inputId: 'down',
      state: true
    });
  } else {
    if (velocity >= 1)
      velocity -= 1;
  }



  playerCar.body.velocity.x = velocity * Math.cos((playerCar.angle - 90) * 0.01745);
  playerCar.body.velocity.y = velocity * Math.sin((playerCar.angle - 90) * 0.01745);

  if (cursors.left.isDown)
    playerCar.body.angularVelocity = -1 * (velocity / 50);
  //socket.emit('keyPress',{inputId:'left', state:true});
  else if (cursors.right.isDown)
    playerCar.body.angularVelocity = 1 * (velocity / 50);
  //socket.emit('keyPress',{inputId:'right', state:true});
  else
    playerCar.body.angularVelocity = 0;

  text.setText("Speed = " + velocity);
  text.x = Math.floor(playerCar.x);
  text.y = Math.floor(playerCar.y - 20);
}

game.addNewPlayer = function(id, x, y) {
  console.log("spawning player");
  playerCar = game.add.sprite(x, y, 'car');
  console.log(playerCar);
  setTimeout(CarInteraction(), 10000);
};

function CarInteraction() {
  console.log("beinging inetaction");
  if (playerCar != null) {
    console.log(playerCar);
    game.physics.p2.enable(playerCar);
    playerCar.body.angle = 0;
    cursors = game.input.keyboard.createCursorKeys();

    var carCollisionGroup = game.physics.p2.createCollisionGroup();
    var CollisionTrackCollisionGroup = game.physics.p2.createCollisionGroup();
    game.physics.p2.updateBoundsCollisionGroup();

    game.physics.p2.enable(CollisionTrack);
    CollisionTrack.body.kinematic = true;
    CollisionTrack.body.clearShapes();
    CollisionTrack.body.loadPolygon('collision', 'Collision-Track');

    playerCar.body.setCollisionGroup(carCollisionGroup);
    CollisionTrack.body.setCollisionGroup(CollisionTrackCollisionGroup);

    playerCar.body.collides([carCollisionGroup, CollisionTrackCollisionGroup]);
    CollisionTrack.body.collides([CollisionTrackCollisionGroup, carCollisionGroup]);

    count = 0;

    text = game.add.text(150, 900, "Speed = 0", {
      font: "10px Arial",
      fill: "#000000",
      align: "center"
    });


    text.anchor.setTo(0.5, 0.5);
  }


}

function CarUpdate(){
  socket.on('newPostions', function(data) {
    for (var i = 0; i < data.length; i++) {
      //console.log("updating playerCar");
      //console.log("X = " + data[i].x);
      //console.log("Y = " + data[i].y);
      x = data[i].x;
      y = data[i].y;
      //console.log("CAR " + playerCar);
      playerCar.x = data[i].x;
      playerCar.y = data[i].y;
    }
  });
}

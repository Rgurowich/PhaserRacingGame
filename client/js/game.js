var WIDTH = 800;
var HEIGHT = 600;
var socket = io();

// LOGIN SCRIPT //
var logInDiv = document.getElementById('logInDiv');
var logInDivLogIn = document.getElementById('logInDiv-logIn');
var logInDivSignUp = document.getElementById('logInDiv-signUp');
var logInDivUsername = document.getElementById('logInDiv-username');
var logInDivPassword = document.getElementById('logInDiv-password');
var playerNumber = 0;

socket.on('fullResponse', function(data) {
  alert("Server is Full");
});

socket.on('signUpResponse', function(data) {
  if (data.success) {
    alert("Sign up successul.");
  } else
    alert("Sign up unsuccessul.");
});

logInDivLogIn.onclick = function() {
  socket.emit('logIn', {
    username: logInDivUsername.value,
    password: logInDivPassword.value
  });
}
logInDivSignUp.onclick = function() {
  socket.emit('signUp', {
    username: logInDivUsername.value,
    password: logInDivPassword.value
  });
}
socket.on('logInResponse', function(data) {
  playerNumber = data.numPly;
  console.log(playerNumber);
  if (data.success) {
    logInDiv.style.display = 'none';
    gameDiv.style.display = 'inline-block';
  } else {
    alert("Log in unsuccessful.");
  }
});

// CHAT SCRIPT //
var ingameText = document.getElementById('ingame-text');
var ingameTextInput = document.getElementById('ingame-text-input');
var ingameTextForm = document.getElementById('ingame-text-form');

socket.on('addIngameText', function(data) {
  ingameText.innerHTML += '<div>' + data + '<div>';
});

ingameTextForm.onsubmit = function(event) {
  event.preventDefault();
  socket.emit('sendTxtToServer', ingameTextInput.value);
  ingameTextInput.value = '';
}

// GAME SCRIPT //
var Img = {};
Img.player = new Image();
Img.player.src = '/client/img/tank.png';
Img.player2 = new Image();
Img.player2.src = '/client/img/tank2.png';
Img.shell = new Image();
Img.shell.src = '/client/img/bullet.png';
Img.map = new Image();
Img.map.src = '/client/img/map.png';
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

var Player = function(initPack) {
  var self = {};
  self.id = initPack.id;
  self.number = initPack.number;
  self.x = initPack.x;
  self.y = initPack.y;
  self.health = initPack.hp;
  self.maxHealth = initPack.maxHp;
  self.score = initPack.score;
  self.draw = function() {
    var hpWidth = 50 * self.health / self.maxHealth;
    if(self.health <= 10 && self.health >= 7){
      ctx.fillStyle = 'green';
    } else if (self.health < 7 && self.health >= 4){
      ctx.fillStyle = 'orange';
    } else if (self.health < 4 && self.health >= 1){
      ctx.fillStyle = 'red';
    }
    ctx.fillRect(self.x - hpWidth / 2, self.y + 40, hpWidth, 4);
    var tankWidth = Img.player.width * 2;
    var tankHeight = Img.player.height * 2;
    if (self.y > 300)
      ctx.drawImage(Img.player, 0, 0, Img.player.width, Img.player.height, self.x - tankWidth / 2, self.y - tankHeight / 2, tankWidth, tankHeight);
    else {
      ctx.drawImage(Img.player2, 0, 0, Img.player2.width, Img.player2.height, self.x - tankWidth / 2, self.y - tankHeight / 2, tankWidth, tankHeight);
    }
  }
  console.log("x = " + self.x + "y = " + self.y);
  Player.list[self.id] = self;
  return self;
}

Player.list = {};

var Shell = function(initPack) {
  var self = {};
  self.id = initPack.id;
  self.x = initPack.x;
  self.y = initPack.y;
  self.draw = function() {
    var shellWidth = Img.shell.width;
    var shellHeight = Img.shell.height;
    ctx.drawImage(Img.shell, 0, 0, Img.shell.width, Img.shell.height,
      self.x - 5, self.y - 30, shellWidth, shellHeight);
  }
  Shell.list[self.id] = self;
  return self;
}

Shell.list = {};

var selfId = null;

socket.on('init', function(data) {
  if (data.selfId) {
    selfId = data.selfId;
  }
  for (var i = 0; i < data.player.length; i++) {
    new Player(data.player[i]);
  }
  for (var i = 0; i < data.shell.length; i++) {
    new Shell(data.shell[i]);
  }
});

socket.on('update', function(data) {
  for (var i = 0; i < data.player.length; i++) {
    var pack = data.player[i];
    var tank = Player.list[pack.id];
    if (tank) {
      if (pack.x !== undefined)
        tank.x = pack.x;
      if (pack.y !== undefined)
        tank.y = pack.y;
      if (pack.hp !== undefined)
        tank.health = pack.hp;
      if (pack.score !== undefined)
        tank.score = pack.score;
    }
  }
  for (var i = 0; i < data.shell.length; i++) {
    var pack = data.shell[i];
    var shell = Shell.list[data.shell[i].id];
    if (shell) {
      if (pack.x !== undefined)
        shell.x = pack.x;
      if (pack.y !== undefined)
        shell.y = pack.y;
    }
  }
});

socket.on('remove', function(data) {
  for (var i = 0; i < data.player.length; i++) {
    delete Player.list[data.player[i]];
  }
  for (var i = 0; i < data.shell.length; i++) {
    delete Shell.list[data.shell[i]];
  }
});

setInterval(function() {
  if (!selfId)
    return;
  ctx.clearRect(0, 0, 800, 600);
  drawGameMap();
  drawTankScore();
  for (var i in Player.list) {
    Player.list[i].draw();
  }
  for (var i in Shell.list) {
    Shell.list[i].draw();
  }
}, 40);

var drawGameMap = function() {
  ctx.drawImage(Img.map, 0, 0);
}

var drawTankScore = function() {
  ctx.fillRect(0, 0, 130, 40);
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + Player.list[selfId].score, 0, 30);
}

document.onkeydown = function(event) {
  if (event.keyCode === 68)
    socket.emit('keyPress', {
      inputId: 'right',
      state: true
    });
  else if (event.keyCode === 65)
    socket.emit('keyPress', {
      inputId: 'left',
      state: true
    });
  else if (event.keyCode === 87)
    socket.emit('keyPress', {
      inputId: 'firing',
      state: true
    });
}

document.onkeyup = function(event) {
  if (event.keyCode === 68)
    socket.emit('keyPress', {
      inputId: 'right',
      state: false
    });
  else if (event.keyCode === 65)
    socket.emit('keyPress', {
      inputId: 'left',
      state: false
    });
  else if (event.keyCode === 87){
    socket.emit('keyPress', {
      inputId: 'firing',
      state: false
    });
  }
}

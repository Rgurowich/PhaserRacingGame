var mongoDB = require('mongojs');
var accountDB = mongoDB("mongodb://rgurowich:Balota321@ds245687.mlab.com:45687/webscriptingdatabase", ["UserAccounts"]);
var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
app.use('/client/img', express.static(__dirname + '/client/img'));
app.use('/client/js', express.static(__dirname + '/client/js'));

//serv.listen(8080);
serv.listen(process.env.PORT || 8080);
console.log("Server Started");

var numberOfPlayers = 0;
var tankOnex = 400;
var tankOney = 550;
var tankTwox = 400;
var tankTwoy = 50;
var tankShellX;
var tankShellY;
var tankOneFiringAngle = 270;
var tankTwoFiringAngle = 180;
var x;
var y;
var canFire = true;
var fireTimer;

var GetTankPosition = function() {
  if (numberOfPlayers <= 0) {
    numberOfPlayers = 1;
  }
  if (numberOfPlayers == 1) {
    x = tankOnex;
    y = tankOney;
  } else if (numberOfPlayers == 2) {
    x = tankTwox;
    y = tankTwoy;
  } else {
    x = tankOnex;
    y = tankOney;
    console.log("No players");
  }
}

var GetShellSpeed = function(p) {
  if (numberOfPlayers == 1) {
    p.shellSpeedy = Math.cos(90 / Math.PI) * 40;
    console.log("Shell up");
  } else if (numberOfPlayers == 2) {
    p.shellSpeedy = Math.cos(90 / Math.PI) * -40;
    console.log("Shell down");
  } else {
    p.shellSpeedy = Math.cos(90 / Math.PI) * 40;
  }
}

var GetDisconnectedPlayer = function(p) {
  if (numberOfPlayers == 1 && p.y == tankOney) {
    numberOfPlayers = 1;
  } else if (numberOfPlayers == 1 && p.y == tankTwoy) {
    numberOfPlayers = 0;
  } else if (numberOfPlayers == 0 && p.y == tankOney) {
    numberOfPlayers = 1;
  }
}

fireTimer = setInterval(function() {}, 1);

var AbleToFire = function() {
  if (canFire == true) {
    canFire = false;
    fireTimer = setInterval(function() {
      canFire = true
    }, 2000);
  }
}
var SOCKET_LIST = {};
//Gives attributes to all entitys in the game//
var Entity = function() {
  GetTankPosition();
  var self = {
    x: x,
    y: y,
    spdX: 0,
    spdY: 0,
    id: "",
  }
  self.update = function() {
    self.updatePosition();
  }
  self.updatePosition = function() {
    self.x += self.spdX;
    self.y += self.spdY;
  }
  self.getDistance = function(pt) {
    return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
  }
  return self;
}
//player attributes//
var Player = function(id) {
  var self = Entity();
  self.id = id;
  self.number = "" + Math.floor(10 * Math.random());
  self.pressingRight = false;
  self.pressingLeft = false;
  self.firingWeapon = false;
  self.firingDirection = tankOneFiringAngle;
  self.tankMovementSpeed = 10;
  self.health = 10;
  self.maxHealth = 10;
  self.score = 0;
  self.shellSpeedy = 0;
  self.atTop = false;
  GetShellSpeed(self);
  //override for speed and update//
  var tank_update = self.update;
  self.update = function() {
    self.updateSpd();
    tank_update();
    if (self.firingWeapon && canFire == true) {
      self.fireShell(self.firingDirection);
      self.firingWeapon = false;
      AbleToFire();
    }
    GetDisconnectedPlayer(self);
  }
  self.fireShell = function(angle, x, y) {
    var shell = Shell(self, angle, x, y);
    shell.x = self.x;
    shell.y = self.y;
    clearInterval(fireTimer);
  }

  self.updateSpd = function() {
    if (self.pressingRight)
      self.spdX = self.tankMovementSpeed;
    else if (self.pressingLeft)
      self.spdX = -self.tankMovementSpeed;
    else
      self.spdX = 0;
  }

  self.getInitPack = function() {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      number: self.number,
      hp: self.health,
      maxHp: self.maxHealth,
      score: self.score,
    };
  }
  self.getUpdatePack = function() {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      hp: self.health,
      score: self.score,
    };
  }

  Player.list[id] = self;
  initPack.player.push(self.getInitPack());
  return self;
}
Player.list = {};


//Creates new player//
Player.onConnect = function(socket) {
  var tank = Player(socket.id);
  socket.on('keyPress', function(data) {
    if (data.inputId === 'left')
      tank.pressingLeft = data.state;
    else if (data.inputId === 'right')
      tank.pressingRight = data.state;
    else if (data.inputId === 'firing')
      tank.firingWeapon = data.state;
  });

  socket.emit('init', {
    selfId: socket.id,
    player: Player.getLoginPack(),
    shell: Shell.getLoginPack(),
  })
}

Player.getLoginPack = function() {
  var users = [];
  for (var i in Player.list) {
    users.push(Player.list[i].getInitPack());
  }
  return users;
}

Player.onDisconnect = function(socket) {
  delete Player.list[socket.id];
  removePack.player.push(socket.id);
}
Player.update = function() {
  var pack = [];
  for (var i in Player.list) {
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePack());
  }
  return pack;
}

var Shell = function(parent, angle) {
  var self = Entity();
  self.id = Math.random();
  self.parent = parent;
  self.spdX = 0;
  self.spdY = parent.shellSpeedy;
  self.timer = 0;
  self.toRemove = false;
  var shell_update = self.update;
  self.update = function() {
    if (self.timer++ > 100)
      self.toRemove = true;
    shell_update();

    for (var i in Player.list) {
      var tank = Player.list[i];
      if (self.getDistance(tank) < 32 && parent.id !== tank.id) {
        tank.health -= 2.5;
        if (tank.health <= 0) {
          var firingTank = Player.list[self.parent.id];
          if (firingTank) {
            firingTank.score += 1;
            console.log(firingTank.score);
          }
          tank.health = tank.maxHealth;
          tank.x = Math.random() * 500;
        }
        self.toRemove = true;
      }
    }
  }
  self.getInitPack = function() {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
    };
  }
  self.getUpdatePack = function() {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
    };
  }

  Shell.list[self.id] = self;
  initPack.shell.push(self.getInitPack());
  return self;
}
Shell.list = {};

Shell.update = function() {
  var pack = [];
  for (var i in Shell.list) {
    var shell = Shell.list[i];
    shell.update();
    if (shell.toRemove) {
      delete Shell.list[i];
      removePack.shell.push(shell.id);
    } else {
      pack.push(shell.getUpdatePack());
    }
  }
  return pack;
}

Shell.getLoginPack = function() {
  var shells = [];
  for (var i in Shell.list) {
    shells.push(Shell.list[i].getInitPack());
  }
  return shells;
}

var isValidPassword = function(data, cb) {
  accountDB.UserAccounts.find({
    username: data.username,
    password: data.password
  }, function(error, res) {
    if (res.length > 0) {
      cb(true);
    } else {
      cb(false);
    }
  });
}
var isUsernameValid = function(data, cb) {
  accountDB.UserAccounts.find({
    username: data.username
  }, function(error, res) {
    if (res.length > 0) {
      cb(true);
    } else {
      cb(false);
    }
  });
}
var addUser = function(data, cb) {
  accountDB.UserAccounts.insert({
    username: data.username,
    password: data.password
  }, function(error) {
    cb();
  });
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;
  socket.on('logIn', function(data) {
    isValidPassword(data, function(res) {
      if (res && numberOfPlayers < 2) {
        numberOfPlayers++;
        Player.onConnect(socket);
        socket.emit('logInResponse', {
          success: true,
          numPly: numberOfPlayers
        });
      } else if (res && numberOfPlayers >= 2) {
        socket.emit('fullResponse', {});
      } else {
        socket.emit('logInResponse', {
          success: false,
          numPly: numberOfPlayers
        });
      }
    });
  });

  socket.on('signUp', function(data) {
    isUsernameValid(data, function(res) {
      if (res) {
        socket.emit('signUpResponse', {
          success: false
        });
      } else {
        addUser(data, function() {
          socket.emit('signUpResponse', {
            success: true
          });
        });
      }
    });
  });

  console.log('socket connection');
  socket.on('disconnect', function() {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
    numberOfPlayers--;
  });
  socket.on('sendTxtToServer', function(data) {
    var playerName = ("" + socket.id).slice(2, 7);
    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit('addIngameText', playerName + ': ' + data);
    }
  });
});

var initPack = {
  player: [],
  shell: []
};
var removePack = {
  player: [],
  shell: []
};

setInterval(function() {
  var pack = {
    player: Player.update(),
    shell: Shell.update(),
  }

  for (var i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    socket.emit('init', initPack);
    socket.emit('update', pack);
    socket.emit('remove', removePack);
  }
  initPack.player = [];
  initPack.shell = [];
  removePack.player = [];
  removePack.shell = [];

}, 1000 / 25);

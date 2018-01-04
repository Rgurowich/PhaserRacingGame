var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
app.use('/client/img', express.static(__dirname + '/client/img'));
app.use('/client/js', express.static(__dirname + '/client/js'));

serv.listen(8080);
console.log("Server Started");

var SOCKET_LIST = {};
//Gives attributes to all entitys in the game//
var Entity = function() {
  var self = {
    x: 250,
    y: 250,
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
  return self;
}
//player attributes//
var Player = function(id) {
  var self = Entity();
  self.id = id;
  self.number = "" + Math.floor(10 * Math.random());
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.maxSpeed = 10;
  //override for speed and update//
  var super_update = self.update;
  self.update = function() {
    self.updateSpd();
    super_update();
  }

  self.updateSpd = function() {
    if (self.pressingRight)
      self.spdX = self.maxSpeed;
    else if (self.pressingLeft)
      self.spdX = -self.maxSpeed;
    else
      self.spdX = 0;

    if (self.pressingUp)
      self.spdY = -self.maxSpeed;
    else if (self.pressingDown)
      self.spdY = self.maxSpeed;
    else
      self.spdY = 0;
  }
  Player.list[id] = self;
  return self;
}
Player.list = {};
//Creates new player//
Player.onConnect = function(socket) {
  var player = Player(socket.id);
  socket.on('keyPress', function(data) {
    if (data.inputId === 'left')
      player.pressingLeft = data.state;
    else if (data.inputId === 'right')
      player.pressingRight = data.state;
    else if (data.inputId === 'up')
      player.pressingUp = data.state;
    else if (data.inputId === 'down')
      player.pressingDown = data.state;
  });
}
Player.onDisconnect = function(socket) {
  delete Player.list[socket.id];
}
Player.update = function() {
  var pack = [];
  for (var i in Player.list) {
    var player = Player.list[i];
    player.update();
    pack.push({
      x: player.x,
      y: player.y,
      number: player.number
    });
  }
  return pack;
}

var Shell = function(angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();
    }
    Shell.list[self.id] = self;
    return self;
}
Shell.list = {};

Shell.update = function(){
    if(Math.random() < 0.1){
        Shell(Math.random()*360);
    }

    var pack = [];
    for(var i in Shell.list){
        var shell = Shell.list[i];
        shell.update();
        pack.push({
            x:shell.x,
            y:shell.y,
        });
    }
    return pack;
}
var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  //Calls for new player//
  Player.onConnect(socket);

  console.log('socket connection');
  socket.on('disconnect', function() {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });
});

setInterval(function() {
  var pack = {
    player: Player.update(),
    shell: Shell.update(),
  }

  for (var i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    socket.emit('newPostions', pack);
  }
}, 1000 / 25);

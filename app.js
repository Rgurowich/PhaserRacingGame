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
var PLAYER_LIST = {};
serv.lastPlayderID = 0;
var x = 150;
var y = 350;

var Player = function(id) {
  var self = {
    x: 150,
    y: 360,
    id: id,
    pressingRight: false,
    pressingLeft: false,
    pressingUp: false,
    pressingDown: false,
    maxSpeed: 10
  }
  self.updatePosition = function() {
    if (self.pressingRight)
      self.x += self.maxSpeed;
    if (self.pressingLeft)
      self.x -= self.maxSpeed;
    if (self.pressingUp)
      self.y -= self.maxSpeed;
    if (self.pressingDown)
      self.y += self.maxSpeed;
  }
  return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = Player(socket.id);
  PLAYER_LIST[socket.id] = player;

  console.log('socket connection');
  socket.on('disconnect', function() {
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
  });

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

  socket.on('newplayer', function() {
    socket.player = {
      id: serv.lastPlayderID++,
      x: x,
      y: y,
    };
    socket.emit('allplayers',getAllPlayers());
    socket.broadcast.emit('#', socket.player);
  });

});



function getAllPlayers() {
  var players = [];
  Object.keys(io.sockets.connected).forEach(function(socketID) {
    var player = io.sockets.connected[socketID].player;
    if (player) players.push(player);
  });
  return players;
}


setInterval(function() {
  var pack = [];
  for (var i in PLAYER_LIST) {
    var player = PLAYER_LIST[i];
    player.updatePosition();
    pack.push({
      x: player.x,
      y: player.y
    })
  }

  for (var i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    socket.emit('newPostions', pack);
  }

}, 1000 / 25);

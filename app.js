var mongoDB = require('mongojs');
var accountDB = mongoDB("mongodb://rgurowich:Balota321@ds245687.mlab.com:45687/webscriptingdatabase",["UserAccounts"]);
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
  self.getDistance = function(pt){
    return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
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
  self.pressingClick = false;
  self.mouseAngle = 0;
  self.maxSpeed = 10;
  //override for speed and update//
  var super_update = self.update;
  self.update = function() {
    self.updateSpd();
    super_update();

    if(self.pressingClick){
      self.fireShell(self.mouseAngle);
    }
  }
  self.fireShell = function(angle){
    var s = Shell(self.id,angle);
    s.x = self.x;
    s.y = self.y;
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
    else if (data.inputId === 'firing')
      player.pressingClick = data.state;
    else if (data.inputId === 'mouseAngle')
      player.mouseAngle = data.state;
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

var Shell = function(parent, angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    self.parent = parent;
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();

        for(var i in Player.list){
          var p = Player.list[i];
          if(self.getDistance(p) < 32 && self.parent !== p.id){
            self.toRemove = true;
          }
        }
    }
    Shell.list[self.id] = self;
    return self;
}
Shell.list = {};

Shell.update = function(){
    var pack = [];
    for(var i in Shell.list){
        var shell = Shell.list[i];
        shell.update();
        if(shell.toRemove){
          delete Shell.list[i];
        }
        pack.push({
            x:shell.x,
            y:shell.y,
        });
    }
    return pack;
}

var DEBUG = true;

var USERS = {
  "ross":"cat",
  "rosss":"catt",
  "rossss":"cattt",
}

var isValidPassword = function(data,cb) {
  accountDB.UserAccounts.find({username:data.username,password:data.password},function(error,res){
    if(res.length > 0){
      cb(true);
    } else {
      cb(false);
    }
  });
  // setTimeout(function(){
  //   cb(USERS[data.username] === data.password);
  // },10);
}
var isUsernameValid = function(data,cb) {
  accountDB.UserAccounts.find({username:data.username},function(error,res){
    if(res.length > 0){
      cb(true);
    } else {
      cb(false);
    }
  });
  // setTimeout(function(){
  //   cb (USERS[data.username]);
  // },10);
}
var addUser = function(data,cb) {
  accountDB.UserAccounts.insert({username:data.username,password:data.password},function(error){
  cb();
  });
  // setTimeout(function(){
  //   (USERS[data.username] = data.password);
  //   cb();
  // },10);
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  socket.on('logIn', function(data) {
    isValidPassword(data,function(res){
      if(res){
        //Calls for new player once they have loged in//
        Player.onConnect(socket);
        socket.emit('logInResponse', {success:true});
      } else {
        socket.emit('logInResponse', {success:false});
      }
    });
  });

  socket.on('signUp',function(data){
         isUsernameValid(data,function(res){
             if(res){
                 socket.emit('signUpResponse',{success:false});
             } else {
                 addUser(data,function(){
                     socket.emit('signUpResponse',{success:true});
                 });
             }
         });
     });


  console.log('socket connection');
  socket.on('disconnect', function() {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });
  socket.on('sendTxtToServer', function(data) {
    var playerName = ("" + socket.id).slice(2,7);
    for(var i in SOCKET_LIST){
      SOCKET_LIST[i].emit('addIngameText',playerName + ': ' + data);
    }
  });
  socket.on('evalServer', function(data) {
    if(!DEBUG){
      return;
    }
    var res = eval(data);
    socket.emit('evalAnswer', res);
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

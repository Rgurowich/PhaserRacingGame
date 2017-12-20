
var car = {};
car.socket = io.connect();

car.askNewPlayer = function(){
    car.socket.emit('newplayer');
};

car.socket.on('newplayer',function(data){
    game.addNewPlayer(data.id,data.x,data.y);
});

car.socket.on('allplayers',function(data){
    for(var i = 0; i < data.length; i++){
        game.addNewPlayer(data[i].id,data[i].x,data[i].y);
    }
});

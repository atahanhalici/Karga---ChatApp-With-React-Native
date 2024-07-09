var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get("/", function(req, res) {
    res.send('Hello World!');
});


let connectionRoomCount = {};

io.on("connection", function(socket) {
    socket.on('connection-room', (data) => {
        socket.join(data.roomId);
        connectionRoomCount[data.roomId] = (typeof connectionRoomCount[data.roomId] === 'undefined' ? 0 : connectionRoomCount[data.roomId]) + 1;

        io.to(data.roomId).emit('connection-room-view', { count: connectionRoomCount[data.roomId] });
    });

    socket.on('leave-room', (data) => {
        socket.leave(data.roomId);
        connectionRoomCount[data.roomId] = (typeof connectionRoomCount[data.roomId] === 'undefined' ? 0 : connectionRoomCount[data.roomId] - 1);

        io.to(data.roomId).emit('connection-room-view', { count: connectionRoomCount[data.roomId] });
    });

    socket.on('disconnect', () => {
        // Bu kullanıcı hangi odalarda olduğunu takip edin
        for (let roomId in connectionRoomCount) {
            if (io.sockets.adapter.rooms.get(roomId) && io.sockets.adapter.rooms.get(roomId).has(socket.id)) {
                connectionRoomCount[roomId] = (typeof connectionRoomCount[roomId] === 'undefined' ? 0 : connectionRoomCount[roomId] - 1);
                io.to(roomId).emit('connection-room-view', { count: connectionRoomCount[roomId] });
            }
        }
    });
});

http.listen(3000, function() {
    console.log('Server is running on http://localhost:3000');
});


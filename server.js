const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const rooms = {}; // Store information about rooms and connected clients

http.listen(3000, () => {
  console.log('Server listening on port 3000');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  // Create and join a room when requested by the client
  socket.on('createAndJoinRoom', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = { clients: [], gameData: {} };
    }

    const roomData = rooms[roomName];

    if (roomData.clients.length < 4) { // Allow a maximum of 4 players
      roomData.clients.push(socket);
      socket.join(roomName);

      console.log(`Player joined room: ${roomName}`);

      // Notify other players in the room about the new player
      socket.to(roomName).emit('playerJoined', { playerId: socket.id });

      // Send the player count to the joining player
      socket.emit('playerCount', roomData.clients.length); // Corrected this line

      if (roomData.clients.length === 4) {
        // The room is full, signal clients to start the game
        io.to(roomName).emit('roomFull', { roomName: roomName });
      }
    } else {
      // The room is full, notify the client
      socket.emit('roomFull', { roomName: roomName });
    }
  });

  // Handle incoming messages from the client

socket.on('message', (data) => {
  const room = io.sockets.adapter.sids[socket.id];
  if (room) {
    const roomName = Object.keys(room)[1]; // Get the room name
    const roomData = rooms[roomName];

    // Process the received message and send a response
    console.log(`Message from client in room ${roomName}:`, data);

    // Print the message to the server's console

    // Broadcast the message to all clients in the room (including the sender)
    io.to(roomName).emit('message', { date: new Date().getTime(), data: data });
  }
});


// Handle dice roll event from the client
socket.on('diceRoll', (diceResult) => {
  const room = io.sockets.adapter.sids[socket.id];
  if (room) {
    const roomName = Object.keys(room)[0]; // Get the room name

    // Broadcast the dice roll result to all clients in the room
    io.to(roomName).emit('diceRolled', diceResult);
  }
});

// Handle player movement event from the client
socket.on('playerMove', (playerPosition) => {
  const room = io.sockets.adapter.sids[socket.id];
  if (room) {
    const roomName = Object.keys(room)[0]; // Get the room name

    // Broadcast the player's movement to all clients in the room
    io.to(roomName).emit('playerMoved', playerPosition);
  }
});

socket.on('disconnect', () => {
  const room = io.sockets.adapter.sids[socket.id];
  if (room) {
    const roomName = Object.keys(room)[0]; // Get the room name
    const roomData = rooms[roomName];

    // Remove the disconnected client from the room
    if (roomData) {
      roomData.clients.splice(roomData.clients.indexOf(socket), 1);
      socket.leave(roomName);
      console.log(`Player left room: ${roomName}`);

      // Notify other clients about the disconnection
      io.to(roomName).emit('playerLeft', { playerId: socket.id });
    }
  }
});

});
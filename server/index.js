// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- CONFIGURATION ---
const WINNING_SCORE = 5; // Points needed to win

// --- GLOBAL STATE ---
const rooms = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// --- HELPER: START ROUND ---
function startRound(room) {
    const { players, gameState, id } = room;

    // 1. LOGIC TO ROTATE TURNS
    // If it's the first round, pick random. 
    // Otherwise, the team that just finished Drawing becomes the Giver.
    let givingTeam;
    if (!gameState.turn) {
        givingTeam = Math.random() > 0.5 ? 'A' : 'B';
    } else {
        givingTeam = gameState.turn.drawingTeam; 
    }

    const drawingTeam = givingTeam === 'A' ? 'B' : 'A';

    const givers = players.filter(p => p.team === givingTeam);
    const drawers = players.filter(p => p.team === drawingTeam);

    // Validate teams have players
    if (givers.length === 0 || drawers.length === 0) return false;

    // Pick random players within the teams for this specific turn
    const wordGiver = givers[Math.floor(Math.random() * givers.length)];
    const drawer = drawers[Math.floor(Math.random() * drawers.length)];

    // 2. Update State
    gameState.phase = 'WORD_SELECT';
    gameState.turn = {
        givingTeam,
        drawingTeam,
        wordGiverId: wordGiver.id,
        drawerId: drawer.id,
        secretWord: null,
        timer: 30
    };

    // 3. Notify everyone
    io.to(id).emit('update_room', room);
    io.to(id).emit('system_message', `Round Started! Team ${givingTeam} is choosing a word for Team ${drawingTeam}.`);
    
    return true;
}

// --- HELPER: GAME LOOP (TIMER) ---
function startGameLoop(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    // Clear any existing timer
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.timerInterval = setInterval(() => {
        const { gameState, id } = room;

        if (gameState.phase === 'DRAWING') {
            gameState.turn.timer--;
            io.to(id).emit('timer_update', gameState.turn.timer);

            // TIME UP!
            if (gameState.turn.timer <= 0) {
                clearInterval(room.timerInterval);
                gameState.phase = 'SCORING';
                
                // AUTO CLEAR CANVAS
                io.to(id).emit('clear_canvas'); 

                io.to(id).emit('system_message', `Time's up! The word was: ${gameState.turn.secretWord}`);
                io.to(id).emit('update_room', room);

                // Start next round after 3 seconds
                setTimeout(() => startRound(room), 3000);
            }
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // 1. CREATE ROOM
    socket.on('create_room', ({ name }) => {
        const roomId = generateRoomCode();
        const newRoom = {
            id: roomId,
            hostId: socket.id,
            players: [],
            timerInterval: null,
            gameState: {
                phase: 'LOBBY',
                turn: null,
                scores: { A: 0, B: 0 }
            }
        };
        const player = { id: socket.id, name, team: null, score: 0 };
        newRoom.players.push(player);
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        socket.emit('room_created', newRoom);
    });

    // 2. JOIN ROOM
    socket.on('join_room', ({ name, roomId }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found!');
            return;
        }
        const player = { id: socket.id, name, team: null, score: 0 };
        room.players.push(player);
        socket.join(roomId);
        socket.emit('room_joined', room);
        io.to(roomId).emit('update_room', room);
    });

    // 3. SWITCH TEAM
    socket.on('switch_team', ({ roomId, team }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.team = team;
            io.to(roomId).emit('update_room', room);
        }
    });

    // 4. START GAME
    socket.on('start_game', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.hostId === socket.id) {
            const success = startRound(room);
            if (!success) socket.emit('error', 'Need players in both teams!');
        }
    });

    // 5. WORD SELECTED
    socket.on('word_selected', ({ roomId, word }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (socket.id !== room.gameState.turn.wordGiverId) return;
        
        room.gameState.phase = 'DRAWING';
        room.gameState.turn.secretWord = word.toLowerCase().trim();
        room.gameState.turn.timer = 60; // 60 Seconds to draw

        io.to(roomId).emit('update_room', room);
        io.to(roomId).emit('system_message', `Word selected! Drawing starts now!`);
        
        startGameLoop(roomId);
    });

    // 6. DRAWING (Includes Width for Brush Size)
    socket.on('draw_line', ({ roomId, prevPoint, currentPoint, color, width }) => {
        socket.to(roomId).emit('draw_line', { prevPoint, currentPoint, color, width });
    });

    socket.on('clear_canvas', (roomId) => {
        io.to(roomId).emit('clear_canvas');
    });

    // 7. CHAT & GUESSING LOGIC
    socket.on('send_message', ({ roomId, message }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Standard Chat
        if (room.gameState.phase !== 'DRAWING') {
            io.to(roomId).emit('chat_message', { user: player.name, msg: message, type: 'chat' });
            return;
        }

        // PREVENT DRAWER FROM GUESSING
        if (player.id === room.gameState.turn.drawerId) {
            socket.emit('system_message', "⚠️ You are drawing! You cannot guess.");
            return;
        }

        const cleanMsg = message.trim().toLowerCase();
        const secret = room.gameState.turn.secretWord;
        
        // --- GUESSING TEAM LOGIC ---
        if (player.team === room.gameState.turn.drawingTeam) {
            if (cleanMsg === secret) {
                // Correct!
                room.gameState.scores[player.team]++;
                clearInterval(room.timerInterval);

                // AUTO CLEAR CANVAS
                io.to(roomId).emit('clear_canvas');

                // CHECK WIN CONDITION
                if (room.gameState.scores[player.team] >= WINNING_SCORE) {
                    room.gameState.phase = 'GAME_OVER';
                    room.gameState.winner = player.team;
                    io.to(roomId).emit('system_message', `🏆 TEAM ${player.team} WINS THE GAME!`);
                    io.to(roomId).emit('update_room', room);
                } else {
                    // CONTINUE GAME
                    room.gameState.phase = 'SCORING';
                    io.to(roomId).emit('system_message', `CORRECT! ${player.name} guessed the word!`);
                    io.to(roomId).emit('update_room', room);
                    setTimeout(() => startRound(room), 3000);
                }

            } else {
                io.to(roomId).emit('chat_message', { user: player.name, msg: message, type: 'guess' });
            }
        } 
        // --- ENEMY TEAM LOGIC (SPOILER PROTECTION) ---
        else {
            if (cleanMsg.includes(secret)) {
                socket.emit('system_message', "⚠️ You cannot type the secret word!");
            } else {
                io.to(roomId).emit('chat_message', { user: player.name, msg: message, type: 'enemy' });
            }
        }
    });

    // 8. RESET GAME (Play Again)
    socket.on('reset_game', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.hostId === socket.id) {
            room.gameState.phase = 'LOBBY';
            room.gameState.scores = { A: 0, B: 0 };
            room.gameState.turn = null;
            room.gameState.winner = null;
            
            io.to(roomId).emit('update_room', room);
            io.to(roomId).emit('system_message', 'Host has reset the game.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
// client/src/GameRoom.jsx
import React, { useEffect, useState } from 'react';
import CanvasBoard from './CanvasBoard';
import WordSelect from './WordSelect';
import ChatBox from './ChatBox';
import GameOver from './GameOver';

export default function GameRoom({ socket, roomData }) {
    
    const teamA = roomData.players.filter(p => p.team === 'A');
    const teamB = roomData.players.filter(p => p.team === 'B');
    const myId = socket.id;
    const isHost = myId === roomData.hostId;
    
    // Track Timer
    const [timeLeft, setTimeLeft] = useState(roomData.gameState.turn?.timer || 0);

    useEffect(() => {
        socket.on('timer_update', (time) => setTimeLeft(time));
        if(roomData.gameState.turn?.timer) setTimeLeft(roomData.gameState.turn.timer);
    }, [socket, roomData]);

    const switchTeam = (team) => { socket.emit('switch_team', { roomId: roomData.id, team }); };
    const startGame = () => { socket.emit('start_game', roomData.id); };

    // --- HELPER: RENDER PLAYER ITEM ---
    // This function handles the highlighting logic
    const renderPlayer = (p, teamColor) => {
        const isDrawer = roomData.gameState.turn?.drawerId === p.id;
        const isWordGiver = roomData.gameState.turn?.wordGiverId === p.id;
        const isHostPlayer = p.id === roomData.hostId;

        return (
            <li key={p.id} className={`p-3 rounded-lg shadow-sm flex items-center gap-3 transition-all
                ${isDrawer 
                    ? `border-4 border-yellow-400 bg-yellow-50 scale-105 z-10`  // HIGHLIGHT STYLE
                    : `bg-white border border-${teamColor}-100` 
                }
            `}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm 
                    ${isHostPlayer ? "bg-yellow-500" : `bg-${teamColor}-300`}`}>
                    {p.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex flex-col leading-tight">
                    <span className="font-medium text-gray-700">{p.name}</span>
                    {/* Status Text */}
                    {isDrawer && <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Drawing...</span>}
                    {isWordGiver && <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Mastermind</span>}
                </div>

                {/* Icons */}
                {isDrawer && <span className="ml-auto text-lg animate-bounce">✏️</span>}
                {isWordGiver && <span className="ml-auto text-lg">🧠</span>}
            </li>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            
            {/* TOP BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-6">
                    <div>
                        <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Room Code</span>
                        <h1 className="text-3xl font-black text-gray-800 tracking-widest">{roomData.id}</h1>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div>
                        <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Phase</span>
                        <div className="font-bold text-blue-600 text-lg">
                            {roomData.gameState.phase} 
                            {roomData.gameState.phase === 'DRAWING' && (
                                <span className="ml-2 text-red-500">({timeLeft}s)</span>
                            )}
                        </div>
                    </div>
                </div>

                {isHost && roomData.gameState.phase === 'LOBBY' && (
                    <button onClick={startGame} className="mt-4 md:mt-0 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105">
                        START GAME
                    </button>
                )}
            </div>

            {roomData.gameState.phase === 'WORD_SELECT' && <WordSelect socket={socket} roomData={roomData} myId={myId} />}
            {roomData.gameState.phase === 'GAME_OVER' && <GameOver socket={socket} roomData={roomData} myId={myId} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* TEAM A */}
                <div className="lg:col-span-3">
                    <div className="bg-red-50 p-4 rounded-xl border-2 border-red-100 h-full">
                        <h2 className="text-xl font-bold text-red-600 mb-4 flex justify-between items-center">
                            TEAM A <span className="text-3xl">{roomData.gameState.scores?.A || 0}</span>
                        </h2>
                        <button onClick={() => switchTeam('A')} className="w-full bg-white border-2 border-red-200 text-red-500 font-bold py-2 rounded-lg mb-4 hover:bg-red-50 transition">Join Team A</button>
                        <ul className="space-y-2">
                            {teamA.map(p => renderPlayer(p, 'red'))}
                        </ul>
                    </div>
                </div>

                {/* CANVAS */}
                <div className="lg:col-span-6 flex flex-col items-center">
                    <div className="bg-white p-1 rounded-xl shadow-xl border border-gray-200">
                        <CanvasBoard socket={socket} roomId={roomData.id} roomData={roomData} myId={myId} />
                    </div>
                    <div className="mt-6 flex items-center gap-4 bg-gray-800 text-white px-6 py-2 rounded-full font-bold shadow-lg">
                        <span className="text-red-400">Team A</span> <span className="text-gray-500 text-xs">VS</span> <span className="text-blue-400">Team B</span>
                    </div>
                </div>

                {/* TEAM B */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100">
                        <h2 className="text-xl font-bold text-blue-600 mb-4 flex justify-between items-center">
                            TEAM B <span className="text-3xl">{roomData.gameState.scores?.B || 0}</span>
                        </h2>
                        <button onClick={() => switchTeam('B')} className="w-full bg-white border-2 border-blue-200 text-blue-500 font-bold py-2 rounded-lg mb-4 hover:bg-blue-50 transition">Join Team B</button>
                        <ul className="space-y-2">
                             {teamB.map(p => renderPlayer(p, 'blue'))}
                        </ul>
                    </div>
                    <div className="flex-grow">
                        <ChatBox socket={socket} roomId={roomData.id} roomData={roomData} />
                    </div>
                </div>

            </div>
        </div>
    );
}
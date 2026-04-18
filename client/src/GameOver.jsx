import React from 'react';
import confetti from 'canvas-confetti'; // Optional: You can install this later for effects

export default function GameOver({ socket, roomData, myId }) {
    const isHost = myId === roomData.hostId;
    const winner = roomData.gameState.winner;
    const isMyTeamWinner = roomData.players.find(p => p.id === myId)?.team === winner;

    // Trigger basic confetti on load
    React.useEffect(() => {
        if(window.confetti) window.confetti();
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-lg w-full transform scale-100 animate-bounce-in">
                
                <h1 className="text-6xl mb-4">
                    {winner === 'A' ? '🔴' : '🔵'}
                </h1>
                
                <h2 className={`text-4xl font-black mb-2 ${winner === 'A' ? 'text-red-600' : 'text-blue-600'}`}>
                    TEAM {winner} WINS!
                </h2>

                <p className="text-xl text-gray-600 mb-8 font-bold">
                    {isMyTeamWinner ? "🎉 VICTORY! 🎉" : "💀 BETTER LUCK NEXT TIME 💀"}
                </p>

                <div className="bg-gray-100 p-4 rounded-lg mb-8">
                    <p className="font-bold text-gray-500">FINAL SCORE</p>
                    <div className="flex justify-center gap-8 text-2xl font-bold mt-2">
                        <span className="text-red-500">A: {roomData.gameState.scores.A}</span>
                        <span className="text-gray-400">-</span>
                        <span className="text-blue-500">B: {roomData.gameState.scores.B}</span>
                    </div>
                </div>

                {isHost ? (
                    <button 
                        onClick={() => socket.emit('reset_game', roomData.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition"
                    >
                        PLAY AGAIN 🔄
                    </button>
                ) : (
                    <p className="text-gray-400 animate-pulse">Waiting for host to restart...</p>
                )}
            </div>
        </div>
    );
}
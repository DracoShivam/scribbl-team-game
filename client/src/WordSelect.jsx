// client/src/WordSelect.jsx
import React, { useState } from 'react';

export default function WordSelect({ socket, roomData, myId }) {
    const [word, setWord] = useState("");
    const { turn } = roomData.gameState;

    // Safety check: If turn data is missing, don't render
    if (!turn) return null;

    const isGiver = myId === turn.wordGiverId;
    const isGivingTeam = roomData.players.find(p => p.id === myId)?.team === turn.givingTeam;

    if (isGiver) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl text-center shadow-2xl">
                    <h2 className="text-2xl font-bold mb-4 text-purple-600">You are the Mastermind!</h2>
                    <p className="mb-4 text-gray-600">Choose a word for the other team to draw.</p>
                    <input 
                        className="border-2 border-purple-300 p-2 rounded w-full mb-4 text-xl text-center"
                        placeholder="Type a word..."
                        value={word}
                        onChange={e => setWord(e.target.value)}
                    />
                    <button 
                        onClick={() => socket.emit('word_selected', { roomId: roomData.id, word })}
                        className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700"
                    >
                        Confirm Word
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                <h2 className="text-xl font-bold mb-2">Phase: Word Selection</h2>
                {isGivingTeam 
                    ? <p className="text-green-600">Your teammate is choosing a difficult word...</p>
                    : <p className="text-red-600">Opposing team is scheming...</p>
                }
            </div>
        </div>
    );
}
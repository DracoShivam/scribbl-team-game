// client/src/Lobby.jsx
import React, { useState } from 'react';

export default function Lobby({ socket, setRoomData }) {
    const [name, setName] = useState("");
    const [roomIdInput, setRoomIdInput] = useState("");
    const [error, setError] = useState("");

    const handleCreate = () => {
        if (!name) return setError("Please enter a name");
        socket.emit("create_room", { name });
    };

    const handleJoin = () => {
        if (!name || !roomIdInput) return setError("Enter name and room ID");
        socket.emit("join_room", { name, roomId: roomIdInput });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-gray-800">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
                <h1 className="text-4xl font-extrabold text-center text-blue-600 mb-6">
                    Team Scribbl
                </h1>
                
                {/* Name Input */}
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Nickname</label>
                    <input 
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                        placeholder="Ex: DrawingMaster"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Buttons */}
                <button 
                    onClick={handleCreate}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg mb-4 transition"
                >
                    Create New Room
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Join Section */}
                <div className="flex gap-2 mt-4">
                    <input 
                        className="w-2/3 p-3 border-2 border-gray-200 rounded-lg uppercase font-mono"
                        placeholder="ROOM CODE"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        maxLength={4}
                    />
                    <button 
                        onClick={handleJoin}
                        className="w-1/3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition"
                    >
                        Join
                    </button>
                </div>
                
                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
}
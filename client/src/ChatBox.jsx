import React, { useState, useEffect, useRef } from 'react';

export default function ChatBox({ socket, roomId, roomData }) {
    const [msg, setMsg] = useState("");
    const [logs, setLogs] = useState([]);
    const bottomRef = useRef(null);

    useEffect(() => {
        // Handle incoming chat
        const chatHandler = (data) => {
            setLogs(prev => [...prev, data]);
        };
        
        // Handle system messages (Time up, Correct guess)
        const sysHandler = (msg) => {
            setLogs(prev => [...prev, { user: "SYSTEM", msg, type: 'system' }]);
        };

        socket.on('chat_message', chatHandler);
        socket.on('system_message', sysHandler);

        return () => {
            socket.off('chat_message', chatHandler);
            socket.off('system_message', sysHandler);
        };
    }, [socket]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const sendParams = () => {
        if (!msg.trim()) return;
        socket.emit('send_message', { roomId, message: msg });
        setMsg("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') sendParams();
    };

    return (
        <div className="flex flex-col h-[500px] w-full lg:w-80 bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                <h3 className="font-bold text-gray-700">Chat & Guesses</h3>
            </div>
            
            {/* MESSAGES AREA */}
            <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {logs.map((log, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${
                        log.type === 'system' ? 'bg-yellow-100 text-center font-bold text-yellow-800' :
                        log.type === 'enemy' ? 'bg-red-50 text-red-600' :
                        log.type === 'guess' ? 'bg-blue-50 text-blue-800' :
                        'bg-gray-100'
                    }`}>
                        {log.type !== 'system' && <span className="font-bold mr-2">{log.user}:</span>}
                        {log.msg}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 border-t flex gap-2">
                <input 
                    className="flex-grow border rounded p-2 focus:outline-blue-500"
                    placeholder="Type here..."
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button 
                    onClick={sendParams}
                    className="bg-blue-500 text-white px-4 rounded font-bold hover:bg-blue-600"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
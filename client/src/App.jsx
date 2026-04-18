// client/src/App.jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Lobby from './Lobby';
import GameRoom from './GameRoom';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
const socket = io.connect(socketUrl);

function App() {
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    // 1. Listen for successful creation
    socket.on("room_created", (room) => {
      setRoomData(room);
    });

    // 2. Listen for successful join
    socket.on("room_joined", (room) => {
      setRoomData(room);
    });

    // 3. Listen for updates (when others join/switch teams)
    socket.on("update_room", (room) => {
      setRoomData(room);
    });
    
    // 4. Listen for errors
    socket.on("error", (msg) => {
      alert(msg);
    });

  }, []);

  return (
    <div>
      {!roomData ? (
        <Lobby socket={socket} setRoomData={setRoomData} />
      ) : (
        <GameRoom socket={socket} roomData={roomData} />
      )}
    </div>
  );
}

export default App;
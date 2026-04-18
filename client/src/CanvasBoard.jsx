// client/src/CanvasBoard.jsx
import React, { useRef, useEffect, useState } from 'react';

const useDraw = (onDraw) => {
    const [drawing, setDrawing] = useState(false);
    const canvasRef = useRef(null);
    const prevPoint = useRef(null);

    const onMouseDown = () => setDrawing(true);
    const onMouseUp = () => { setDrawing(false); prevPoint.current = null; };
    const onMouseMove = (e) => {
        if (!drawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = canvas.getContext('2d');
        if (onDraw) onDraw(ctx, { x, y }, prevPoint.current);
        prevPoint.current = { x, y };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mousemove', onMouseMove);
        };
    }, [onDraw]);

    return { canvasRef, onMouseDown, onMouseUp };
};

export default function CanvasBoard({ socket, roomId, roomData, myId }) { 
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(5);
    
    const isDrawingPhase = roomData?.gameState.phase === 'DRAWING';
    const isMyTurn = roomData?.gameState.turn?.drawerId === myId;
    const canDraw = isDrawingPhase && isMyTurn;
    
    // RETRIEVE THE SECRET WORD SAFELY
    const secretWord = roomData?.gameState.turn?.secretWord || "";

    const drawLine = ({ prevPoint, currentPoint, ctx, color, width }) => {
        const { x: currX, y: currY } = currentPoint;
        let startPoint = prevPoint ?? currentPoint;
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currX, currY);
        ctx.stroke();
    };

    const { canvasRef } = useDraw((ctx, currentPoint, prevPoint) => {
        if (!canDraw) return; 
        drawLine({ prevPoint, currentPoint, ctx, color, width: lineWidth });
        socket.emit('draw_line', { roomId, prevPoint, currentPoint, color, width: lineWidth });
    });

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        const handler = ({ prevPoint, currentPoint, color, width }) => {
            if (!ctx) return;
            drawLine({ prevPoint, currentPoint, ctx, color, width });
        };
        const clearHandler = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        };
        socket.on('draw_line', handler);
        socket.on('clear_canvas', clearHandler);
        return () => {
            socket.off('draw_line', handler);
            socket.off('clear_canvas', clearHandler);
        };
    }, [canvasRef]);

    const setEraser = () => { setColor('#FFFFFF'); setLineWidth(20); };

    return (
        <div className="flex flex-col items-center">
             
             {/* --- UPDATED HEADER --- */}
             {isDrawingPhase && (
                 <div className={`mb-2 font-bold text-lg px-6 py-2 rounded-full shadow-md transition-all ${
                     isMyTurn ? "bg-green-500 text-white animate-pulse" : "bg-yellow-100 text-yellow-800"
                 }`}>
                     {isMyTurn ? (
                         <span>DRAW: <span className="text-2xl font-black uppercase ml-2">{secretWord}</span></span>
                     ) : (
                         "GUESS THE WORD!"
                     )}
                 </div>
             )}
             {/* ---------------------- */}

            <div className={canDraw ? "" : "pointer-events-none opacity-90"}>
                <canvas 
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="bg-white border-4 border-gray-800 rounded-lg cursor-crosshair shadow-lg touch-none"
                />
            </div>
            
            {canDraw && (
                <div className="mt-4 flex flex-wrap items-center gap-4 p-3 bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-500 mb-1">Color</span>
                        <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setLineWidth(5); }} className="w-10 h-10 cursor-pointer border-none bg-transparent" />
                    </div>
                    <div className="w-px h-8 bg-gray-300"></div>
                    <div className="flex flex-col items-center w-32">
                        <span className="text-xs font-bold text-gray-500 mb-1">Size: {lineWidth}px</span>
                        <input type="range" min="2" max="30" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="w-px h-8 bg-gray-300"></div>
                    <button onClick={setEraser} className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded font-bold transition">Eraser 🧼</button>
                    <button onClick={() => socket.emit('clear_canvas', roomId)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold transition ml-auto">Clear</button>
                </div>
            )}
        </div>
    );
}
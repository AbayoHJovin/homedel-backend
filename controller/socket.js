const port = 3000; // Use a non-privileged port
const io = require("socket.io")(port, {
  cors: { origin: ["http://localhost:5173","http://localhost:5174", "https://homedel-jov.vercel.app/"] },
});
// Log when a client connects
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("offer", (message) => {
    console.log("Offer received:", message);
    io.emit("receivedOffer", message);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

io.on("error", (error) => {
  console.error("Socket.IO error:", error);
});

console.log(`Socket.IO server running at http://localhost:${port}`);

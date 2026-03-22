require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('[socket] Client connected:', socket.id);

  socket.on('join_url_room', (urlId) => {
    socket.join(`url_${urlId}`);
    console.log(`[socket] Client ${socket.id} joined room: url_${urlId}`);
  });

  socket.on('disconnect', () => {
    console.log('[socket] Client disconnected:', socket.id);
  });
});

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 TinyTrack API running on port ${PORT}`);
  });
};

start();

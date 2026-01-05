const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in PWA/Dev
        methods: ["GET", "POST"]
    }
});

app.get('/resolve-map-link', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL required' });

        // Fetch to follow redirects (for short links like maps.app.goo.gl)
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const finalUrl = response.url;

        // Regex to find coordinates in Google Maps URL
        // Matches @lat,lng or /lat,lng or ?q=lat,lng
        const regex = /[-+]?([0-9]*\.[0-9]+)[,]([-+]?([0-9]*\.[0-9]+))/;
        const match = finalUrl.match(regex);

        if (match && match.length >= 3) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            return res.json({ latitude: lat, longitude: lng });
        } else {
            return res.status(404).json({ error: 'Coordinates not found in URL' });
        }
    } catch (error) {
        console.error("Error resolving map link:", error);
        return res.status(500).json({ error: 'Failed to resolve link' });
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (data) => {
        // data can be string (room) or object { room, role, ... }
        const room = typeof data === 'string' ? data : data.room;
        socket.join(room);
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log(`User ${socket.id} joined room: ${room} (Total: ${roomSize})`);

        // Send Ack to the joining user
        socket.emit('room_joined_success', { room, memberCount: roomSize });

        // If it's a buyer joining, request transaction info from others (sellers)
        if (typeof data === 'object' && data.role === 'buyer') {
            socket.to(room).emit('request_transaction_info');
        }
    });

    socket.on('send_transaction_info', (data) => {
        // Seller sends info to specific socket or room
        socket.to(data.room).emit('receive_transaction_info', data);
    });

    socket.on('update_location', (data) => {
        // data: { room, latitude, longitude, username }
        console.log(`Loc update from ${data.username} in ${data.room}: ${data.latitude}, ${data.longitude}`);
        socket.to(data.room).emit('receive_location', data);
    });

    socket.on('set_meeting_point', (data) => {
        // data: { room, coords }
        console.log(`Meeting point set in ${data.room}:`, data.coords);
        io.to(data.room).emit('meeting_point_update', data.coords);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// Serve the client-side HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/styles.css', (req, res) => {
    res.sendFile(__dirname + '/styles.css'); 
});
app.get('/script.js', (req, res) => {
    res.set('Content-Type', 'text/javascript');
    res.sendFile(__dirname + '/script.js');
});

//

const messages = { };
const senders = { };
const commenters = { };

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected.');

    // Handle setting the username
    socket.on('set username', (username) => {
        console.log('User', socket.id, 'set username:', username);

        // Store the username in the socket object
        socket.username = username;
        if (socket.username === 'admin') socket.emit('req password');
        else {
            socket.isAdmin = false;
            socket.emit('username set');
        }
    });

    socket.on('get messages', () => {
        console.log('Getting messages...');
        for (const id in messages) {
            if(messages[id].approved || socket.isAdmin) {
                socket.emit('chat message', messages[id]);
                socket.emit('comment message', messages[id]);
            }
        }
    });

    socket.on('set password', (psw) => {
        if (psw === '@dm1n123_') {
            socket.join('admins');
            socket.isAdmin = true;
            socket.emit('admin approved');
            socket.emit('username set');
        } else {
            socket.username = 'fake admin trying to game the system';
            socket.emit('admin denied');
        }
    });

    // Handle incoming chat messages
    socket.on('chat message', (message) => {
        console.log('Received message:', message.caption, socket.username);

        if (socket.muted) {
            console.log('User is muted!');
            socket.emit('message muted');
            return;
        }

        const id = Math.floor(Math.random() * 10000000000);

        const mData = {
            id: id,
            approved: false,
            username: socket.username,
            caption: message.caption,
            image: message.image,
            comments: {},
            likes: 0,
            usersVoted: []
        }

        messages[id] = mData;
        senders[id] = socket;

        // Broadcast the message to all connected clients
        io.to('admins').emit('chat message', mData);
    });

    socket.on('like message', (id) => {
        socket.emit('voted', id);
        if (messages[id].usersVoted.includes(socket.username)) {
            socket.emit('already voted', id);
            return;
        }
        messages[id].usersVoted.push(socket.username);
        messages[id].likes += 1;
        io.emit('like message', {
            id: id,
            likes: messages[id].likes,
            usersVoted: messages[id].usersVoted,
        });
    });
    socket.on('dislike message', (id) => {
        socket.emit('voted', id);
        if (messages[id].usersVoted.includes(socket.username)) {
            socket.emit('already voted', id);
            return;
        }
        messages[id].usersVoted.push(socket.username);

        messages[id].likes -= 1;
        io.emit('like message', {
            id: id,
            usersVoted: messages[id].usersVoted,
            likes: messages[id].likes
        });
    });

    // Handle approved chat messages
    socket.on('approve message', (id) => {
        if (!socket.isAdmin) {
            console.log('Not an admin:', socket.username);
            return;
        }
        if (!messages[id]) {
            console.log('Message not found:', id);
            return;
        }

        messages[id].approved = true;
        console.log('Approved message:', id, messages[id].caption, messages[id].username);

        // Broadcast the message to all connected clients
        io.emit('chat message', messages[id]);
    });
    
    socket.on('mute sender', (id) => {
        if (!socket.isAdmin) {
            console.log('Not an admin:', socket.username);
            return;
        }
        if (!senders[id]) {
            console.log('Message not found:', id);
            return;
        }
        if (senders[id].isAdmin) {
            console.log('Cannot mute admin:', id, socket[id].username);
            return;
        }

        senders[id].muted = true;
        console.log('Muted sender:', id, messages[id].caption, messages[id].username);
    });

    socket.on('reject message', (id) => {
        console.log('Rejected message:', id, messages[id].caption, messages[id].username);
        delete messages[id];
    });

    socket.on('comment message', (data) => {
        if (socket.muted) {
            console.log('User is muted!');
            socket.emit('message muted');
            return;
        }

        const id = Math.floor(Math.random() * 10000000000);

        commenters[data.messageId + '::' + id] = socket;

        if (!messages[data.messageId]) {
            console.log('Message not found:', data.messageId);
            return;
        }

        messages[data.messageId].comments[id] = {
            messageId: data.messageId,
            id: id,
            username: socket.username,
            comment: data.comment || '(No comment)'
        }

        io.emit('comment message', messages[data.messageId]);
    });

    socket.on('mute commenter', (data) => {
        if (!socket.isAdmin) {
            console.log('Not an admin:', socket.username);
            return;
        }
        if (!commenters[data.messageId + '::' + data.id]) {
            console.log('Commenter not found:', data.messageId + '::' + data.id);
            return;
        }
        if (commenters[data.messageId + '::' + data.id].isAdmin) {
            console.log('Cannot mute admin:', data.messageId + '::' + data.id, socket[id].username);
            return;
        }

        commenters[data.messageId + '::' + data.id].muted = true;
        console.log('Muted sender:', data.messageId + '::' + data.id,
            messages[data.messageId].comments[data.id].comment,
            messages[data.messageId].comments[data.id].username );

    });

    socket.on('delete comment', (data) => {
        if (!socket.isAdmin) {
            console.log('Not an admin:', socket.username);
            return;
        }
        if (!commenters[data.messageId + '::' + data.id]) {
            console.log('Commenter not found:', id);
            return;
        }

        delete messages[data.messageId].comments[data.id];
        io.emit('comment message', messages[data.messageId]);
    });

});


// Start the server
const port = 3000;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
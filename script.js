
// Connect to the Socket.IO server
const socket = io();
let isAdmin = false;

function convertToDataURL(input, callback) {
    if (input.files && input.files[0]) {
        var maxSize = 1048576; // 1MB in bytes
        if (input.files[0].size > maxSize) {
            alert('File is too big! Max file size is 1MB!');
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var dataURL = e.target.result;
            callback(dataURL);
        };
        reader.onerror = function (e) {
            alert('Bad image file! ', e.target.error);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function printMessage(message, callback) {
    const messagesList = document.getElementById('messages');
    const li = document.createElement('li');
    li.innerHTML = message;
    messagesList.appendChild(li);
    callback(li);
}

// Send chat message when the form is submitted
function sendMessage() {
    if (Cookies.get('user muted') && !isAdmin) {
        alert('You have been muted!');
        return false;
    }

    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();
    if (message !== '') {
        convertToDataURL(document.getElementById('imageUpload'), (img) => {
            socket.emit('chat message', {
                image: img,
                caption: message
            });
            alert('Post sent for approval!');
        });
        messageInput.value = '';
    } else alert('Caption is required!');
    return false;
}

window.onload = () => {
    if (Cookies.get('username')) {
        document.getElementById('username').value = Cookies.get('username');
        document.getElementById('usernameButton').innerHTML = 'Login';
        document.getElementById('usernameLabel').innerHTML = 'Welcome back, ' + Cookies.get('username');
        document.getElementById('username').disabled = true;
        document.getElementById('username').style.display = 'none';
    }
}

// Set the username when the form is submitted
function setUsername(force = false) {
    if (force) Cookies.remove('username');
    document.getElementById('notLoggedIn').style.display = 'none';
    document.getElementById('accountOptions').style.display = 'block';

    let usernameInput = Cookies.get('username') || document.getElementById('username').value;
    if (force) usernameInput = document.getElementById('usernameChange').value;

    const username = usernameInput.trim();
    console.log(username, force);
    Cookies.set('username', username);
    
    if (username !== '') {
        socket.emit('set username', username);
        document.getElementById('pageTitle').innerHTML = `Image Upload [${username}]`;
    } else {
        alert('Username is required!');
        location.reload();
    }
    return false;
}

socket.on('req password', () => {
    const psw = Cookies.get('password') || prompt('Password?');
    Cookies.set('password', psw);
    socket.emit('set password', psw);
});
socket.on('admin approved', () => {
    isAdmin = true;
    Cookies.remove('user muted');
});
socket.on('admin denied', () => {
    alert('password bad!');
    Cookies.remove('username');
    Cookies.remove('password');
    location.reload();
});

messageLikes = {};
messageButtons = {};
messageComments = {};

socket.on('like message', (data) => {
    if (!messageLikes[data.id]) return;
    messageLikes[data.id].innerHTML = data.likes + ' likes. <span class="userslist">' + (data.usersVoted?.length ?? 0) + ' voted</span>';
    console.log(data.usersVoted);
});

socket.on('voted', (id) => {
    Cookies.set(`voted-${id}`, true);
});
socket.on('already voted', (id) => {
    alert('You already voted on this post!');
    Cookies.set(`voted-${id}`, true);
});

socket.on('message muted', () => {
    alert('You have been muted!');
    Cookies.set('user muted', true);
});

// Handle incoming chat messages
socket.on('chat message', (data) => {
    document.getElementById('messages-empty').style.display = 'none';

    printMessage(`<span class="caption ${isAdmin ? (data.approved ? 'approved' : 'unapproved') : ''}"><span class="name">${(data.username || '').replaceAll(/<|>/g, '_')}</span>: ${data.caption.replaceAll(/<|>/g, '_')}</span>
        <img src="${data.image}">`, (li) => {
            const likeCount = document.createElement('span');
            likeCount.classList.add('likecount');
            likeCount.innerHTML = data.likes + ' likes. <span class="userslist">' + (data.usersVoted?.length ?? 0) + ' voted</span>';
            li.appendChild(likeCount);

            messageLikes[data.id] = likeCount;

            const userVoted = Cookies.get(`voted-${data.id}`) || false;

            if (isAdmin && !data.approved) {
                const buttons = document.createElement('span');

                const button = document.createElement('button');
                button.innerHTML = 'Approve';
                button.onclick = () => {
                    socket.emit('approve message', data.id);
                    li.parentElement.removeChild(li);
                }
                buttons.appendChild(button);

                const rejectButton = document.createElement('button');
                rejectButton.innerHTML = 'Reject';
                rejectButton.onclick = () => {
                    socket.emit('reject message', data.id);
                    li.parentElement.removeChild(li);
                }
                buttons.appendChild(rejectButton);

                
                const muteButton = document.createElement('button');
                muteButton.innerHTML = 'Mute Sender';
                muteButton.classList.add('dislike');
                muteButton.onclick = () => {
                    socket.emit('mute sender', data.id);
                    li.parentElement.removeChild(li);
                }
                buttons.appendChild(muteButton);

                li.appendChild(buttons);

            } else if (!isAdmin && !userVoted) {
                const buttons = document.createElement('span');
                messageButtons[data.id] = buttons;
                const likeButton = document.createElement('button');
                likeButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hand-thumbs-up" viewBox="0 0 16 16">
                        <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
                    </svg>
                    Like`;
                likeButton.onclick = () => {
                    socket.emit('like message', data.id);
                    buttons.innerHTML = 'Liked post!';
                }
                const dislikeButton = document.createElement('button');
                dislikeButton.classList.add('dislike');
                dislikeButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hand-thumbs-down" viewBox="0 0 16 16">
                        <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 0 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z"/>
                    </svg>
                    Dislike`;
                dislikeButton.onclick = () => {
                    socket.emit('dislike message', data.id);
                    buttons.innerHTML = 'Disliked post!';
                }

                buttons.appendChild(likeButton);
                buttons.appendChild(dislikeButton);

                li.appendChild(buttons);

            } else if (!isAdmin) {
                const buttons = document.createElement('span');
                messageButtons[data.id] = buttons;
                buttons.innerHTML = 'Already voted';
            }

            const commentContainer = document.createElement('span');
            commentContainer.classList.add('comment-container');
            const commentForm = document.createElement('form');
            const commentInput = document.createElement('input');
            commentInput.setAttribute('type', 'text');
            commentInput.setAttribute('placeholder', 'Write a comment...');
            const commentButton = document.createElement('button');
            commentButton.innerHTML = 'Comment';
            commentButton.setAttribute('type', 'submit');
            commentForm.appendChild(commentInput);
            commentForm.appendChild(commentButton);
            commentForm.onsubmit = (e) => {
                if (Cookies.get('user muted') && !isAdmin) {
                    alert('You have been muted!');
                    return false;
                }
                
                if (!commentInput.value.trim()) return false;

                socket.emit('comment message', {
                    messageId: data.id,
                    comment: commentInput.value.trim()
                });

                commentInput.value = '';
                return false;
            }

            li.appendChild(commentContainer);
            messageComments[data.id] = commentContainer;
            li.appendChild(commentForm);

        });
});

socket.on('comment message', (data) => {
    const container = messageComments[data.id];
    container.innerHTML = '<h3>Comments</h3>';

    container.style.display = 'block';

    let found = false;

    for (const c in data.comments) {
        found = true;
        const comment = data.comments[c];
        const commentSpan = document.createElement('span');
        commentSpan.classList.add('comment');
        commentSpan.innerHTML = `<span class="name">${(comment.username || '').replaceAll(/<|>/g, '_')}</span>: ${comment.comment.replaceAll(/<|>/g, '_')}`;
        container.appendChild(commentSpan);
        if (isAdmin) {
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = 'Remove';
            deleteButton.setAttribute('type', 'button');
            deleteButton.classList.add('small');
            deleteButton.onclick = () => {
                socket.emit('delete comment', {
                    messageId: data.id,
                    id: comment.id
                });
                commentSpan.classList.add('removed');
            }
            commentSpan.appendChild(deleteButton);

            const muteButton = document.createElement('button');
            muteButton.innerHTML = 'Mute Commenter';
            muteButton.classList.add('small');
            muteButton.onclick = () => {
                socket.emit('mute commenter', {
                    messageId: data.id,
                    id: comment.id
                });
                deleteButton.onclick();
            }
            commentSpan.appendChild(muteButton);
        }
    }

    if(found == false) {
        container.innerHTML += '<span class="comment"><i>No Comments</i></span>';
    }
});

// Handle username set event
socket.on('username set', () => {
    document.getElementById('usernameForm').style.display = 'none';
    document.getElementById('chatForm').style.display = 'block';
    document.getElementById('messages').innerHTML = '';
    socket.emit('get messages');
});

const socket = io();

function setUsername() {
    socket.emit('set username', 'presenter');
    document.getElementById('pageTitle').innerHTML = `Loading results`;

    return false;
}

// Handle username set event
socket.on('username set', () => {
    document.getElementById('usernameForm').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
    console.log('aaa');
    socket.emit('get messages');
    setTimeout(() => {
        getResults();
    }, 1000);
});

function printMessage(message, callback) {
    const messagesList = document.getElementById('messages');
    const li = document.createElement('li');
    li.innerHTML = message;
    messagesList.appendChild(li);
    callback(li);
    return li;
}

let messageComments = {};

function displayPost(data) {
    return printMessage(`<span class="caption"><span class="name">${(data.username || '').replaceAll(/<|>/g, '_')}</span>: ${data.caption.replaceAll(/<|>/g, '_')}</span>
        <img src="${data.image}">`, (li) => {
        const likeCount = document.createElement('span');
        likeCount.classList.add('likecount');
        likeCount.innerHTML = data.likes + ' likes. <span class="userslist">' + (data.usersVoted?.length ?? 0) + ' voted</span>';
        li.appendChild(likeCount);

        if (!messageComments[data.id]) messageComments[data.id] = document.createElement('span');

        li.appendChild(messageComments[data.id]);
    });
}

const posts = [];
let allowPosts = true;
let index = 0;

function getResults() {
    document.getElementById('pageTitle').innerHTML = `Results!`;
    document.getElementById('messages').style.display = 'flex';
    posts.sort((a, b) => a.likes - b.likes);

    allowPosts = false;
    displayPost(posts[index]);

    return false;
}

function next() {
    if (index < posts.length - 1) {
        index++;
        document.getElementById('messages').innerHTML = '';
        displayPost(posts[index]);
    }
    if (index === posts.length - 1) {
        socket.emit('confetti');
        document.querySelector('#nextButton').innerHTML = 'Confetti';
    }
}

socket.on('chat message', (data) => {
    if (!allowPosts) return;
    console.log(data);
    posts.push(data);
});

socket.on('comment message', (data) => {
    const container = document.createElement('span');
    container.classList.add('comment-container');
    container.classList.add('presentation');
    messageComments[data.id] = container;

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
    }

    if(found == false) {
        container.innerHTML += '<span class="comment"><i>No Comments</i></span>';
    }
});
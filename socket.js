//var io = require('socket.io').listen(8088, {
//  log : false
//});

var io = require('socket.io').listen(8080);

var user = {};

io.sockets.on('connection', function(socket) {

    socket.on('reg', function(data) {
        if (user[data.username]) {
            socket.emit('regback', {
                'sta' : 0,
                'msg' : data.username + '已经被使用了:('
            });
        } else {
            user[data.username] = {
                'login' : new Date(),
                'socket' : socket
            };
            socket.store.username = data.username;
            socket.emit('regback', {
                'sta' : 1,
                'name' : data.username
            });
            for (i in user) {
                if (i !== data.username) {
                    user[i].socket.emit('newuser', {
                        username : data.username
                    });
                }
            }
        }
    });

    socket.on('publish', function(data) {
        var s = data.text.replace(/&/g, "&gt;");
        s = s.replace(/</g, "&lt;");
        s = s.replace(/>/g, "&gt;");
        s = s.replace(/ /g, "&nbsp;");
        s = s.replace(/\'/g, "&#39;");
        s = s.replace(/\"/g, "&quot;");
        s = s.replace(/\n/g, "<br>");
        if (data.touser == 'all') {
            for (i in user) {
                user[i].socket.emit('receive', {
                    'poster' : data.username,
                    'touser' : data.touser,
                    'text' : s
                });
            }
        } else {
            if (user[data.touser]) {
                user[data.touser].socket.emit('receive', {
                    'poster' : data.username,
                    'touser' : data.touser,
                    'text' : s
                });
                if (data.touser != data.poster) {
                    socket.emit('receive', {
                        'poster' : data.username,
                        'touser' : data.touser,
                        'text' : s
                    });
                }
            }
        }

    });

    socket.on('getUsersList', function() {
        var userList = [];
        for (i in user) {
            userList.push(i)
        };
        socket.emit('getUser', userList);
    });

    socket.on('disconnect', function(data) {
        if (user[socket.store.username]) {
            delete user[socket.store.username];

            var userList = [];
            for (i in user) {
                user[i].socket.emit('deleteUser', {
                    username : socket.store.username
                });
            };
        };
    });

    //


});


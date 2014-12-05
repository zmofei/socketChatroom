var http = require('http');
var crypto = require('crypto');

var server = http.createServer(function(req, res) {
    res.writeHead(200, {
        'Content-Type' : 'text/plain'
    });
    res.end('Hello World\n');
});

server.listen(12010);

console.log('server Start at 12010');

server.on('upgrade', function(req, socket, upgradeHead) {
    console.log(upgradeHead.toString(), upgradeHead.length);
    var head = new Buffer(upgradeHead.length);
    console.log(head);
    upgradeHead.copy(head);
    console.log(upgradeHead.toString());

    var key = req.headers['sec-websocket-key'];
    console.log(key);

    var shasum = crypto.createHash('sha1');
    key = shasum.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    
    var headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade:websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept:' + key,
    ];
    
    var protocol=req.headers['sec-websocket-protocol'];
    if(protocol){
        headers.push('protocol:'+protocol);
    }
    
    socket.setNoDelay(true);
    socket.write(headers.concat('','').join('\r\n'));
    
    socket.on('data', function(data) {
        console.log('data: '+data);
        setTimeout(function(){
            socket.write('123');
        },4000);
    });
    
    socket.on('end', function() {
        console.log('left the chat.\n');
    });
});

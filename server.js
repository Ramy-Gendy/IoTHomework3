const net = require('net');

var fs = require('fs');

var locations = {};

function parsePOSTRequest(req) { 
    const bodyIndex = r.indexOf("\n\r");
    const reqBody = r.substring(bodyIndex + 3, r.length);
    let indexOfKey = 0;
    let indexOfEqual = 0;
    let indexOfAmp = 0;
    let done = false;
    let resp = {};
    while (!done) {
        indexOfEqual = reqBody.indexOf('=', indexOfEqual + 1);
        indexOfAmp = reqBody.indexOf('&', indexOfAmp + 1);
        let key = reqBody.substring(indexOfKey, indexOfEqual);
        let value;
        if (indexOfAmp == -1) {
            value = reqBody.substring(indexOfEqual + 1, req.length)
        }
        else {
            key = reqBody.substring(indexOfKey, indexOfEqual) 
            indexOfKey = indexOfAmp + 1;
            value = reqBody.substring(indexOfEqual + 1, indexOfAmp) 
        }
        resp[key] = value;
    }
    return resp;
}


var server = net.createServer(function (socket) {
    socket.on('data', function (data) {
        r = data.toString();
        if (r.substring(0, 10) == "GET /arrow") {
            socket.write("HTTP/1.1 200 OK\n");
            fs.readFile('mycompass.html', 'utf8', function (err, contents) {
                socket.write("Content-Length:" + contents.length);
                socket.write("\n\n");
                socket.write(contents);
            })
        }

        else if (r.substring(0, 8) == "GET /map") {
            socket.write("HTTP/1.1 200 OK\n");
            let JSONContents = JSON.stringify(locations);
            socket.write("Content-Length:" + JSONContents.length);
            socket.write("\n\n");
            socket.write(JSONContents);
            console.log(JSONContents);
        }

        else if (r.substring(0, 3) == "GET") {
            console.log('OK');
            socket.write("HTTP/1.1 200 OK\n");
            fs.readFile('mymap.html', 'utf8', function (err, contents) {
                socket.write("Content-Length:" + contents.length);
                socket.write("\n\n");
                socket.write(contents);

            })
        }

        else if (r.substring(0, 4) == "POST") {
            console.log('sending');
            locations = parsePOSTRequest(r); 
            console.log(locations);
            socket.write('HTTP/1.1 200 OK\n');
            socket.write("Content-Length:" + 0);
            socket.write("\n\n");
        }
    });

    socket.on('close', function () {
        console.log('Connection closed');
    });

    socket.on('end', function () {
        console.log('client disconnected');
    });

    socket.on('error', function () {
        console.log('client disconnected');
    });
});
server.listen(8080, function () {
    console.log('server is listening on port 8080');
});
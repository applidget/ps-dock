var tls = require("tls")
, util = require('util')
, events = require("events");

var DistantSocket = function (options, stream) {
  this.distantSocket = options.distantSocket;
  this.dataToSocket = options.dataToSocket;
  this.stream = stream;
  this.bind();
}
util.inherits(DistantSocket, events.EventEmitter);
exports.createDistantSocket  = function(options, stream){
  return new DistantSocket(options, stream);
};
DistantSocket.prototype.bufferizeStreamOutput = function (callback, arg){
  var distSock = this;
  distSock.buffer = '';
  var bufferize = function(data){
    distSock.buffer += data;
  }
  distSock.stream.output.on('data', bufferize);
  distSock.on('connect', function(){
    distSock.socketOpened = true;
    distSock.write(distSock.buffer);
    distSock.stream.output.removeListener('data',bufferize);
  });
  callback(distSock, arg);
}
DistantSocket.prototype.findHostAndConnect = function (context, callback){
  var distSock = context;
  console.log(distSock)
  var parseDistantSocket = distSock.distantSocket.split(':');
  distSock.port = parseDistantSocket[1];
  distSock.host = parseDistantSocket[0];
  distSock.connect();
  callback(context);
}
DistantSocket.prototype.connectStreamToSocket = function (context){
  var distSock = context;
  distSock.on('end', function(){
    distSock.write('Connexion will be closed')
    distSock.stream.kill('SIGINT', 2)
    distSock.socketOpened = false;
  });
  distSock.on('connect', function(){
    distSock.stream.output.on('data', function(data){
      if(distSock.socketOpened){
        distSock.write('' + data);
      }
    });
  });
  distSock.on('data', function(data){
    distSock.stream.input.write(data);
  });
}
DistantSocket.prototype.bind = function (){
  var distSock = this;
  if(distSock.distantSocket != undefined){
    distSock.bufferizeStreamOutput(distSock.findHostAndConnect, distSock.connectStreamToSocket);
    setTimeout(function(){
      if(!distSock.socketOpened){
        distSock.close(function(){ process.exit(returnCode) });
      }
    }, 30000);
  }
}
DistantSocket.prototype.connect = function(){
  var distSock = this;
  distSock.sockRemoteShell = tls.connect(distSock.port, distSock.host, function(){
    util.log('Connection successful with distant socket')
    if(distSock.dataToSocket){
      util.log(distSock.dataToSocket)
      distSock.write(distSock.dataToSocket );
    }
    distSock.emit('connect');
    distSock.sockRemoteShell.on("data",function(data){
      distSock.emit('data', data);
    });
  });
  distSock.sockRemoteShell.on('error', function(e){
    console.log("Error on connection");
  })
  distSock.sockRemoteShell.on('end',function(){
    distSock.emit('end');
    util.log('Distant socket closed.')
  });
}
DistantSocket.prototype.write = function (data){
  this.sockRemoteShell.write(data);
}
DistantSocket.prototype.close = function(callback) {
  var distSock = this;
  distSock.sockRemoteShell.end();
  if(callback != undefined){
    callback();
  }
}
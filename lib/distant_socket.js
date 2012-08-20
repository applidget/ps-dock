var tls = require("tls")
, util = require('util')
, events = require("events");

var DistantSocket = function (options) {
  var parseDistantSocket = options.distantSocket.split(':');
  this.port = parseDistantSocket[1];
  this.host = parseDistantSocket[0];
  this.dataToSocket = options.dataToSocket;
  this.connect();
}
util.inherits(DistantSocket, events.EventEmitter);
exports.createDistantSocket  = function(options){
  return new DistantSocket(options);
};

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
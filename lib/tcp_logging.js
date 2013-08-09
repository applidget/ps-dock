var util = require('util')
, events = require("events");

var TcpLogger = function (options) {
  this.distantSocket = options.distantSocket;
  this.dataToSocket = options.dataToSocket;
  this.logging = options.logging;
  var tcpLogger = this;
  if(this.distantSocket != undefined){
    var parseTcpLogger = this.distantSocket.split(':');
    this.port = parseTcpLogger[1];
    this.host = parseTcpLogger[0];
    setTimeout(function(){
      if(!tcpLogger.socketOpened){
        tcpLogger.close(function(){
          util.log("Unsuccessfully tried to connect to distant socket")
          process.exit(1);
        });
      }
    }, 30000);
    tcpLogger.connect();
  }
}
util.inherits(TcpLogger, events.EventEmitter);
exports.createLogger  = function(options){
  return new TcpLogger(options);
};
TcpLogger.prototype.bufferizeStreamOutput = function (callback){
  var tcpLogger = this;
  tcpLogger.buffer = '';
  var bufferize = function(data){
    tcpLogger.buffer += data;
  }
  tcpLogger.stream.output.on('data', bufferize);
  var flushBufferAndStream = function (){
    tcpLogger.socketOpened = true;
    tcpLogger.write(tcpLogger.buffer);
    tcpLogger.stream.output.removeListener('data',bufferize);
  }
  tcpLogger.on('connect', function(){
    flushBufferAndStream();
  });
  if(tcpLogger.socketOpened){
    tcpLogger.removeListener('connect', flushBufferAndStream);
    flushBufferAndStream();
  }
  callback(tcpLogger);
}

TcpLogger.prototype.connectStreamToSocket = function (context){
  var tcpLogger = context;
  tcpLogger.on('end', function(){
    util.log('Connexion closed')
    try {
      tcpLogger.stream.kill('SIGINT', 2)
    } catch(e) {
      util.log("Killing child process failed")
    }
    tcpLogger.socketOpened = false;
  });
  tcpLogger.on('connect', function(){
    tcpLogger.stream.output.on('data', function(data){
      if(tcpLogger.socketOpened){
        tcpLogger.write('' + data);
      }
    });
  });
  tcpLogger.on('data', function(data){
    tcpLogger.stream.input.write(data);
  });
}

TcpLogger.prototype.connect = function(){
  var tcpLogger = this;
  try{
    var options = {
      rejectUnauthorized: false
    };
    tcpLogger.sockRemoteShell = require(tcpLogger.logging).connect(tcpLogger.port, tcpLogger.host, options, function(){
      util.log('Connection successful with distant socket')
      tcpLogger.connected = true;
      tcpLogger.socketOpened = true;
      if(tcpLogger.dataToSocket){
        tcpLogger.write(tcpLogger.dataToSocket);
      }
      tcpLogger.emit('connect');
      tcpLogger.sockRemoteShell.on("data",function(data){
        tcpLogger.emit('data', data);
      });
    });
    tcpLogger.sockRemoteShell.on('error', function(e){
      tcpLogger.sockRemoteShell.destroy();
      util.log('Error on connexion : stopping ps-dock');
      tcpLogger.emit('end');
    })
    tcpLogger.sockRemoteShell.on('end',function(){
      tcpLogger.emit('end');
      util.log('Distant socket closed.')
    });
  }
  catch (e) {
    process.exit(1);
  }
}
TcpLogger.prototype.write = function (data){
  if(this.connected){
    this.sockRemoteShell.write(data); 
  }
};
TcpLogger.prototype.close = function(callback) {
  var tcpLogger = this;
  if(tcpLogger.sockRemoteShell){
    tcpLogger.sockRemoteShell.end(); 
  }
  if(callback != undefined){
    callback();
  }
};
TcpLogger.prototype.listenStream = function (stream) {
  var tcpLogger = this;
  tcpLogger.stream = stream;
  tcpLogger.bufferizeStreamOutput(tcpLogger.connectStreamToSocket);
};
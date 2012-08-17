#!/usr/bin/env node
var runner = require('./lib/child_process_runner')
, logging = require('./lib/logging')
, optionsHandler = require('./lib/handle_options.js')
, notificatorLib = require('./lib/notify_api.js')
, distantSocket = require('./lib/distant_socket.js')
, util = require('util');


var realArgs = process.argv;
realArgs.splice(0, 2); // Start at 2 to ignore node and script_file_path

var optionsHandler = optionsHandler.createHandler(realArgs);

var logger = logging.createFileLogger(optionsHandler.options);
var notificator = notificatorLib.createNotificator(optionsHandler.options.webHookUrl, optionsHandler.options.timeout);
var childProcess = runner.runChildProcess(optionsHandler.options, logger);

childProcess.updateEvent(function(status){
  util.log('Updating API status');
  notificator.notifyApi(status);
});

var buffer = '';
var bufferize = function(data){
  buffer += data;
}
childProcess.output.on('data', bufferize);
var sock;
if(optionsHandler.options.distantSocket != undefined){
  sock = distantSocket.createDistantSocket(optionsHandler.options);
  sock.on('end', function(){
    childProcess.kill('SIGINT', 2)
    socketOpened = false;
  });
  sock.on('connect', function(){
    var socketOpened = true;
    childProcess.output.removeListener('data',bufferize);
    sock.write(buffer);
    buffer = ''
    childProcess.output.on('data', function(data){
      if(socketOpened){
        sock.write('' + data);
      }
    });
  });
  setTimeout(function(){
    if(!socketOpened){
      sock.write('test')
      sock.close(function(){ process.exit(returnCode) });
    }
  }, 30000);
  sock.on('data', function(data){
    childProcess.input.write(data);
  });
}
childProcess.on('end', function(returnCode){
  notificator.on('end', function(){
    if(optionsHandler.options.distantSocket != undefined){
      sock.close(function(){
        process.exit(returnCode);
      });
    }
    else{
      process.exit(returnCode);
    }
  });
});
var signals = { 'SIGINT': 2, 'SIGTERM': 15, 'SIGHUP': 1, 'SIGKILL': 9, 'SIGPIPE': 13, 'SIGALRM': 14, 'SIGQUIT': 15};

for (var signal in signals){
  process.on(signal, childProcess.killChildProc(signals[signal], signal));
}

process.on('SIGUSR2', function(code){
  childProcess.childProc.destroy();
  process.exit(-1);
});
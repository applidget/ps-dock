#!/usr/bin/env node
var runner = require('./lib/child_process_runner')
, logging = require('./lib/logging')
, optionsHandler = require('./lib/handle_options')
, notificatorLib = require('./lib/notify_api')
, distantSocket = require('./lib/distant_socket')
, util = require('util');
var psDock = this;

var realArgs = process.argv;
realArgs.splice(0, 2); // Start at 2 to ignore node and script_file_path
var logger;
var notificator;
var childProcess;
var signals = { 'SIGINT': 2, 'SIGTERM': 15, 'SIGHUP': 1, 'SIGKILL': 9, 'SIGPIPE': 13, 'SIGALRM': 14, 'SIGQUIT': 15};

var optionsHandler = optionsHandler.createHandler(realArgs, function(optionsHandler){
  logger = logging.createFileLogger(optionsHandler.options);
  notificator = notificatorLib.createNotificator(optionsHandler.options.webHookUrl, optionsHandler.options.timeout);
  childProcess = runner.runChildProcess(optionsHandler.options, logger);
  childProcess.updateEvent(function(status){
    util.log('Updating API status');
    notificator.notifyApi(status);
  });
  var exit = function (returnCode){
    if(optionsHandler.options.distantSocket != undefined){
      sock.close(function(){
        process.exit(returnCode);
      });
    }
    else{
      process.exit(returnCode);
    }
  }
  childProcess.on('end', function(returnCode){
    notificator.on('end', function(){
      if(logger.isChangingLogs){
        logger.on('logRotateFinished', function(){
          exit(returnCode);
        });
      }
      else {
          exit(returnCode);
      }
    });
  });
  var sock = distantSocket.createDistantSocket(optionsHandler.options, childProcess.stream);
  for (var signal in signals){
    process.on(signal, childProcess.killChildProc(signals[signal], signal));
  }
});

process.on('SIGUSR2', function(code){
  childProcess.childProc.destroy();
  process.exit(-1);
});
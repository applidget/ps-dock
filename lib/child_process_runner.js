var spawn = require('pty.js').spawn
, port_checking = require('./port_checking.js')
, util = require('util')
, events = require("events");

var Runner = function (options, stdoutLogger) {
  this.options = options;
  this.tempTasks = [];
  this.commandTokens = options.command.split(" ");
  this.baseCommand = this.commandTokens[0];
  this.commandTokens.splice(0, 1);
  this.commandArgs = this.commandTokens.join(" ");;
  this.stdoutLogger = stdoutLogger;
  this.status = 'starting';
};

util.inherits(Runner, events.EventEmitter);

exports.runChildProcess  = function (options, stdoutLogger){ 
  var runner = new Runner(options, stdoutLogger);
  runner.on('update', runner.handleUpdateBeforeStart);
  runner.spawn();
  runner.bindToObjects();
  return runner;
};

Runner.prototype.handleUpdateBeforeStart = function (stat){
  this.tempTasks.unshift(stat);
}
Runner.prototype.updateEvent = function (callback){
  var runner = this;
  var status = '';
  while (runner.tempTasks.length > 0){
    status = runner.tempTasks.pop();
    callback(status);
  }
  runner.removeListener('update', runner.handleUpdateBeforeStart);
  runner.on('update', callback);
}

Runner.prototype.updateStatus = function(stat){
  util.log('Process status changed to ' + stat + '.');
  if (this.status != "crashed"){
    this.status = stat;
    this.emit('update',stat);
  }
}

Runner.prototype.bindToObjects = function (){
  var runner = this;
  runner.output = runner.childProc.stdout;
  runner.input = runner.childProc.stdin;
  runner.output.setEncoding('utf-8');  
  runner.stream = {
    output: runner.output,
    input: runner.input,
    kill: function(sig, code){ runner.kill(sig, code)}
  }
  runner.stdoutLogger.listenStream(runner.stream);
  if (runner.isExpectedToBindPort()) {
    port_checking.waitUntilPortOpen(runner.options.psPort, runner.childProc.pid, function(portCheckinOption) {
      if (portCheckinOption.status === "open") {
        util.log("Process port opened");
        runner.updateStatus("up");
      }
      else if (portCheckinOption.status === "timeout") {
        util.log("Attempt to connect to process port timed out.");
      }
    });
  }
  else {
    runner.updateStatus("up");
  }
}

var mergeEnv = function(customEnv) {
  var defaultEnv = process.env
  for (var name in customEnv) {
    defaultEnv[name] = customEnv[name];
  }
  return defaultEnv;
}

Runner.prototype.spawn = function() {
  var runner = this;
  var envToUse = mergeEnv(runner.options.env);
  runner.childProc = spawn(runner.baseCommand, runner.commandTokens,{
    name: 'xterm-color',
    cols: 250,
    rows: 30,
    cwd: process.cwd(),
    env: envToUse
  });
  runner.childProc.on('exit',function(returnCode,signal){
    runner.emit('end', returnCode);
    runner.updateStatus('crashed');
  });
};

Runner.prototype.killChildProc = function(code, sig){
  var runner = this;
  return function(){
    runner.kill(sig, code);
  }
}
Runner.prototype.kill = function(sig, code) {
  var runner = this;
  util.log('Process killed with signal : ' + sig + '.');
  runner.childProc.kill(sig)
}

Runner.prototype.isExpectedToBindPort = function () {
  if (this.options.psPort == undefined) {
    return false;
  }
  return this.options.bindPort;
}

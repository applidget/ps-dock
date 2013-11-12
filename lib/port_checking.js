var net = require('net')
, lsof = require("lsof")
, exec = require('child_process').exec;

var CHECK_INTERVAL = 250;
var NB_ATTEMPTS = 600;
var waitUntilPortOpenMaxNbAttemps = function(portToCheck, pid, nbAttempts, callback) {

  processIds(pid, function(pids) {
    lsof.rawTcpPort(portToCheck, function(data) {
      hash = {}
      console.log(JSON.stringify(data))
      for (var i = 0; i < data.length; i++) {
        hash = data[i];
        console.log(JSON.stringify(hash));
        if(pids.indexOf(hash.pid) > -1) {
          break;
        }
      }

      if(hash.state == 'listen') {
        callback({status: "open", portToCheck: portToCheck})
      } else {
        if(nbAttempts > 0) {
          setTimeout(waitUntilPortOpenMaxNbAttemps, CHECK_INTERVAL, portToCheck, pid, nbAttempts -1 , callback);
        } else {
          callback({status: "timeout", portToCheck: portToCheck});
        }
      }
    });
  });
}

exports.waitUntilPortOpen = function(portToCheck, pid, callback) {
  var mxNbAttemps = NB_ATTEMPTS;
  waitUntilPortOpenMaxNbAttemps(portToCheck, pid, mxNbAttemps, callback);
}

//return a list of potential processes that may bind the port.
//this include the process we are launching as well as all its children processes
var processIds = function(ppid, callback) {
  var pidList = [];
  pidList.push(ppid); //parent process may bind the port itself
  exec("pgrep -P " + ppid, function (error, stdout, stderr) {
    if (error == null) {
      pids = stdout.split("\n");
      if(pids.length > 0) {
        pidList = pidList.concat(pids)
      }
    }
    callback(pidList)
  });
}
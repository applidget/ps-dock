var net = require('net')
, lsof = require("lsof")
, exec = require('child_process').exec;

var CHECK_INTERVAL = 250;
var NB_ATTEMPTS = 600;
var waitUntilPortOpenMaxNbAttemps = function(portToCheck, pid, nbAttempts, callback) {

  pidList = []
  pidList.push(pid)
  processIds(pidList, function(pids) {
    lsof.rawTcpPort(portToCheck, function(data) {
      hash = {}
      for (var i = 0; i < data.length; i++) {
        hash = data[i];
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
var processIds = function(pidList, callback) {
  exec("pgrep -P " + pidList.join(), function (error, stdout, stderr) {
    pids = stdout.split("\n");
    pidAdded = false;
    for(i = 0; i < pids.length; i++) {
      pid = pids[i];
      if(pidList.indexOf(pid) == -1 && pid) {
        pidList.push(pid)
        pidAdded = true
      }
    }
    if(pidAdded) {
      processIds(pidList, callback);
    }
    else {
      callback(pidList)
    }
  });
}
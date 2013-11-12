var net = require('net')
, lsof = require("lsof");

var CHECK_INTERVAL = 250;
var NB_ATTEMPTS = 600;
var waitUntilPortOpenMaxNbAttemps = function(portToCheck, pid, nbAttempts, callback) {

  lsof.rawTcpPort(portToCheck, function(data) {
    hash = {}
    for (var i = 0; i < data.length; i++) {
      hash = data[i];
      if(hash.pid == pid) {
        break;
      }
    }

    console.log("PORT state found in lsof " + JSON.stringify(hash))

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
}

exports.waitUntilPortOpen = function(portToCheck, pid, callback) {
  console.log("Checking to see if port " + portToCheck + " is binded to PID " + pid)
  var mxNbAttemps = NB_ATTEMPTS;
  waitUntilPortOpenMaxNbAttemps(portToCheck, pid, mxNbAttemps, callback);
}

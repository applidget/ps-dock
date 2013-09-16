var net = require('net')
, lsof = require("lsof");

var waitUntilPortOpenMaxNbAttemps = function(portToCheck, pid, nbAttempts, callback) {

  lsof.rawTcpPort(portToCheck, function(data) {
    hash = {}
    for (var i = 0; i < data.length; i++) {
      hash = data[i];
      if(hash.pid == pid) {
        break;
      }
    }

    if(hash.state == 'listen') {
      callback({status: "open", portToCheck: portToCheck})
    } else {
      if(nbAttempts > 0) {
        setTimeout(waitUntilPortOpenMaxNbAttemps, 250, portToCheck, pid, nbAttempts -1 , callback);
      } else {
        callback({status: "timeout", portToCheck: portToCheck});
      }
    }
  });
}

exports.waitUntilPortOpen = function(portToCheck, pid, callback) {
  var mxNbAttemps = 120;
  waitUntilPortOpenMaxNbAttemps(portToCheck, pid, mxNbAttemps, callback);
}

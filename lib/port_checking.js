var net = require('net')
, portchecker = require("portchecker");

var waitUntilPortOpenMaxNbAttemps = function(portToCheck, nbAttempts, callback) {
  portchecker.isOpen(portToCheck, "localhost", function(isOpen, port, host) {
    if(isOpen) {
      callback({status: "open", portToCheck: portToCheck});
    } else {
      if(nbAttempts > 0) {
        setTimeout(waitUntilPortOpenMaxNbAttemps, 250, portToCheck, nbAttempts -1 , callback);
      } else {
        callback({status: "timeout", portToCheck: portToCheck});
      }
    }
  });
}

exports.waitUntilPortOpen = function(portToCheck, callback) {
  var mxNbAttemps = 120;
  waitUntilPortOpenMaxNbAttemps(portToCheck, mxNbAttemps, callback);
}

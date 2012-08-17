var util = require("util");
var events = require("events");

var notificator = function (url, timeout){
  var notif = this;
  this.uri = url;
  this.timeout = timeout == undefined ? 30000 : timeout;
  if (this.uri != undefined){
    this.httpLib = require( this.uri.protocol == "https:" ? "https" : "http" );
    this.notifying = false;
    this.tasks = [];
  }
}

util.inherits(notificator, events.EventEmitter);

exports.createNotificator = function(options, timeout){
  var notif = new notificator (options, timeout);
  notif.on('continue', function(){
    if (notif.tasks.length != 0){
      stat = notif.tasks.pop();
      notif.requestHook(stat);
    }
    else {
      this.notifying = false;
      notif.emit('end');
    }
  });
  notif.on('start', function(){
    stat = notif.tasks.pop();
    this.notifying = true;
    notif.requestHook(stat);
  });
  return notif;
}

notificator.prototype.handleApiResponse = function(response){
  var apibody = '';
  var notificator = this;
  util.log('WEB HOOK answered with status code : ' + response.statusCode)
  notificator.emit('webHookAnswered');
  notificator.updateNotificatorStatus('continue');
};

notificator.prototype.updateNotificatorStatus = function (state){
  this.emit(state);
}

notificator.prototype.requestHook = function(stat) {
  var notificator = this;
  var rawData = JSON.stringify({ps: { status: stat}}, null, " ");
  optionsUpdate = {
    host: notificator.uri.hostname,
    port: notificator.uri.port,
    path: notificator.uri.path,
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': rawData.length,
        'Accept': '*/*'
    }
  }
  var hookRequest = notificator.httpLib.request(optionsUpdate);
  hookRequest.on('error', function(e){
    switch (e.code){
      case 'ENOTFOUND':
        util.log('WEB HOOK not found.')
        break;
      case 'ECONNREFUSED':
        util.log('Connection to the WEB HOOK refused.')
        break;
      default:
        util.log('Attempt to connect to the distant WEB HOOK finished with the following error code : ' + e.code);
        break;
    }
    notificator.updateNotificatorStatus('continue');
    return;
  });
  hookRequest.write(rawData);
  hookRequest.end();
  var timeout = true;
  var callback = function(response){
    notificator.handleApiResponse(response);
  };
  var not_timeout = function(){
    timeout = false;
  }
  setTimeout(function(){
    if (timeout){
      notificator.removeListener('webHookAnswered',callback);
      hookRequest.removeListener('response',callback);
      util.log("Failed to join API");
      notificator.updateNotificatorStatus('continue');
    }
  }, notificator.timeout);
  notificator.on('webHookAnswered',not_timeout);
  hookRequest.on('response', callback);
}

notificator.prototype.notifyApi = function(stat){
  var notificator = this;
  if (notificator.uri == undefined){
    notificator.emit('end');
    return;
  }
  notificator.tasks.unshift(stat);
  if (!notificator.notifying){
    notificator.updateNotificatorStatus('start');
  }
}

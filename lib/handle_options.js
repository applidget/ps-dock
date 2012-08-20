var url = require('url');

var Handler = function(args){
  this.args = args;
  this.replaceVars(variables.array , variables.evalVar);
  var uri = process.env.WEB_HOOK_URL == undefined ? undefined : url.parse(process.env.WEB_HOOK_URL, true);

  this.options = {
    webHookUrl: uri == undefined ? undefined : (uri.protocol == undefined ? undefined : uri),
    bindPort: (this.deleteOption("--bind-port", "false") == "false") ? false : true,
    baseLogFile: this.deleteOption("--log-file", undefined),
    dropUnhandledLogs: (this.deleteOption("--drop-unhandled-logs", "true") == "false") ? false : true,
    distantSocket: this.deleteOption("--distant-socket", undefined),
    dataToSocket: this.deleteOption("--data-to-socket", undefined),
    psPort: process.env.PS_PORT || process.env.PORT,
    robotToken: process.env.DCDGET_AUTH_TOKEN,
    timeout: this.deleteOption("--timeout", undefined),
    command: this.args.join(" ")
  }
  if (this.options.baseLogFile == undefined){
    console.log("--log-file has to be specified !");
    process.exit(1);
  }
}

exports.createHandler = function(args){
  return new Handler(args);
}
var interpretRotation = function (string){
  switch (string) {
    case "daily" :
      return 24 * 3600;
    case "hourly" :
      return 3600;
    case "weekly" :
      return 24 * 3600 * 7
    case "secondly" :
      return 1
    case "minutely" :
      return 60
    default:
      return 0
  }
}
Handler.prototype.deleteOption = function (optionName, defaultValue) {
  var keyIndex = -1
  var optionValue = "";
  for (var i = 0; i < this.args.length; i++) { 
    if(this.args[i] == optionName) {
      keyIndex = i;
      break;
    }
  }
  if (keyIndex == -1) return defaultValue;
  results = this.args.splice(keyIndex, 2);
  return results[1];
}

Handler.prototype.replaceVars = function (vars, evalVar) {
  for (var argument = 0; argument < this.args.length; argument++) {
    for(var variable in vars){
      if (this.args[argument] == vars[variable]) {
        this.args[argument] = evalVar(this.args[argument]);
        break;
      }
    }
  }
}

var variables = {
  array: [],
  evalVar: function(variable){
    return process.env[variable];
  }
};

for(var envVar in process.env){
  if(envVar.indexOf("PS_") >= 0){
    variables.array.push(envVar);
  }
}
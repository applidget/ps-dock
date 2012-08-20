var url = require('url')
, fs = require ('fs')
, util = require ('util');

var searchConfigFiles = function() {
  try{
    var stat = fs.lstatSync(process.env["HOME"] + '/.config.js');
    if(stat.isFile()){
      return require(process.env["HOME"] + '/.config.js').settings;
    }
  }
  catch (e) {
    try {
      stat = fs.lstatSync(process.cwd() + '/.config.js');
      if(stat.isFile()){
        return require(process.cwd() + '/.config.js').settings;
      }
    }
    catch (e) {
      util.log("No config files found !");
    }
  }
}
var settings = searchConfigFiles();

var Handler = function(args){
  this.args = args;
  this.replaceVars(variables.array , variables.evalVar);
  var uri = process.env.WEB_HOOK_URL == undefined ? undefined : url.parse(process.env.WEB_HOOK_URL, true);
  this.options = {
    webHookUrl: uri == undefined ? undefined : (uri.protocol == undefined ? undefined : uri),
    bindPort: ((this.deleteOption("--bind-port", undefined) == "false") ? false : (settings ? settings.bindPort : true)),
    baseLogFile: this.deleteOption("--log-file", undefined),
    dropUnhandledLogs: (this.deleteOption("--drop-unhandled-logs", "true") == settings ? settings.dropUnhandledLogs : "false") ? false : true,
    logrotation: interpretRotation(this.deleteOption("--log-rotate", settings ? settings.logrotation : undefined)),
    distantSocket: this.deleteOption("--socket-address", settings ? settings.distantSocket : undefined), //Socket address formatted like : "adress:port"
    dataToSocket: this.deleteOption("--data-to-socket", settings ? settings.dataToSocket : undefined),
    psPort: process.env.PS_PORT || process.env.PORT,
    timeout: this.deleteOption("--timeout", settings ? settings.timeout : undefined),
    command: this.args.join(" ")
  }
  console.log(this.options)
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
var url = require('url')
, fs = require ('fs')
, util = require ('util')
, events = require("events");
var Properties = require ("properties");

var Handler = function(args){
  this.args = args;
  this.replaceVars(variables.array , variables.evalVar);
  var uri = process.env.WEB_HOOK_URL == undefined ? undefined : url.parse(process.env.WEB_HOOK_URL, true);
  this.options = {
    webHookUrl: uri == undefined ? undefined : (uri.protocol == undefined ? undefined : uri),
    bindPort: this.deleteOption("--bind-port", undefined),
    baseLogFile: this.deleteOption("--log-file", undefined),
    dropUnhandledLogs: this.deleteOption("--drop-unhandled-logs", undefined) ,
    logrotation: interpretRotation(this.deleteOption("--log-rotate", undefined)),
    distantSocket: this.deleteOption("--socket-address", undefined), //Socket address formatted like : "adress:port"
    dataToSocket: this.deleteOption("--data-to-socket", undefined),
    psPort: process.env.PS_PORT || process.env.PORT,
    timeout: this.deleteOption("--timeout", undefined),
    command: this.args.join(" ")
  }
  this.returned = false;
  var settings = this.searchConfigFiles(function(properties, options){
    console.log(properties.keys())
    keys = properties.keys();
    for (test in keys){
      if(!options[keys[test]]) {
         options[keys[test]] = properties.get(keys[test]); 
      }
    }
  }, this.options);
  console.log(settings.keys())
  if (this.options.baseLogFile == undefined){
    console.log("--log-file has to be specified !");
    process.exit(1);
  }
}
util.inherits(Handler, events.EventEmitter);
exports.createHandler = function(args){
  return new Handler(args);
}

Handler.prototype.searchConfigFiles = function(callback, options) {
  try{
    stat = fs.lstatSync(process.cwd() + '/.config');
    if(stat.isFile()){
      return new Properties ().load (process.cwd() + '/.config', function (){
                callback(this, options);
      });
    }
  }
  catch (e) {
    try {
      var stat = fs.lstatSync(process.env["HOME"] + '/.config');

      if(stat.isFile()){
        return new Properties ().load (process.env["HOME"] + '/.config', function (){
          callback(this, options);
        });
      }
    }
    catch (e) {
      util.log("No config files found !");
      process.exit(1);
    }
  }
  this.returned = true;
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
      return undefined
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
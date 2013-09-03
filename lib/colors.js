var prefixWithColor = function(prefix, color_name) {
  //Largely inspired by https://github.com/ddollar/foreman/blob/master/lib/foreman/engine/cli.rb  
  var reset = '\033[0m';
  var colors = {
    "black": '\033[30m',
    "red": '\033[31m',
    "green": '\033[32m',
    "yellow": '\033[33m',
    "blue": '\033[34m',
    "magenta": '\033[35m',
    "cyan": '\033[36m',
    "white": '\033[37m',
    "bright_black": '\033[30m',
    "bright_red": '\033[31m',
    "bright_green": '\033[32m',
    "bright_yellow": '\033[33m',
    "bright_blue": '\033[34m',
    "bright_magenta": '\033[35m',
    "bright_cyan": '\033[36m',
    "bright_white": '\033[37m'
  };
  
  var color = colors[color_name];
  
  if (color == undefined) return prefix + ": ";
  return color + prefix + ": " + reset;
};

var charToIgnore = ["\n", "\b", "\t", "\r", "^C", " ", "", "^[[D", "^[[C", "^[[A", "^[[B"]

var addPrefixToLines = function(data, prefix, color_name) {
  var lines = data.split("\n");
  for (line_id = 0; line_id < lines.length; line_id++ ) {
    if(charToIgnore.indexOf(lines[line_id]) < 0) {
      lines[line_id] = prefixWithColor(prefix, color_name) + lines[line_id];
    }
  }
  return lines.join("\n");
};

exports.addPrefixToLines = addPrefixToLines;
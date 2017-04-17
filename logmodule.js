
var logArray = [];

module.exports = {
   writelog: function(line) {
      writelog(line);
   },
   getLogLines: function(callback, args) {
      getLogLines(callback, args);
   }
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + month + day + "-" + hour + ":" + min + ":" + sec;
}

function writelog(line) {
   var logLine = getDateTime() + "   " + line;
   console.log( logLine );

   if (logArray.length >= 20) {
      logArray.shift();
   }
   logArray.push(logLine);
}

function getLogLines(callback, args) {
   writelog("getLogLines called");
   callback ( false, logArray);
}


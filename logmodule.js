const Homey = require('homey');

var logArray = [];
const DEBUG = true;

module.exports = {
   writelog: function(level, line) {
      writelog(level, line);
   },
   getLogLines: function() {
      return getLogLines();
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

function writelog(level, line) {

   switch(level) {
      case 'error':
         Homey.ManagerNotifications.registerNotification({
            excerpt: line
         }, function( err, notification ) {
            if( err ) return console.error( err );
               if (DEBUG) console.log( 'Notification added' );
         });
      case 'debug':
         if (DEBUG == false) break;
      case 'info':   
         var logLine = getDateTime() + "   " + line;
         console.log( logLine );

         if (logArray.length >= 50) {
            logArray.shift();
         }
         logArray.push(logLine);
         break;
   }
}

function getLogLines() {
   writelog('debug', "getLogLines called");
   return logArray;
}


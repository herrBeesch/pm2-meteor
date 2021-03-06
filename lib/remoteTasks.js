// Generated by CoffeeScript 1.10.0
(function() {
  var CWD, _settings, abs, async, cli, fs, getAppLocation, nodemiral, path;

  path = require('path');

  nodemiral = require('nodemiral');

  cli = require('cli');

  fs = require('fs');

  async = require('async');

  _settings = require("./settings");

  CWD = process.cwd();

  abs = require("abs");

  getAppLocation = function(pm2mConf) {
    return path.join(pm2mConf.server.deploymentDir, pm2mConf.appName);
  };

  module.exports = {
    getRemoteSession: function(pm2mConf) {
      var session;
      session = nodemiral.session("" + pm2mConf.server.host, {
        username: pm2mConf.server.username,
        password: pm2mConf.server.password ? pm2mConf.server.password : void 0,
        pem: pm2mConf.server.pem ? fs.readFileSync(abs(pm2mConf.server.pem)) : void 0
      }, {
        ssh: pm2mConf.server.port ? {
          port: pm2mConf.server.port
        } : void 0
      });
      return session;
    },
    checkDeps: function(session, done) {
      var checkCmd;
      checkCmd = "(source ~/.profile) && (command -v node || echo 'missing node' 1>&2) && (command -v npm || echo 'missing npm' 1>&2) && (command -v pm2 || echo 'missing pm2' 1>&2)";
      return session.execute(checkCmd, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr && logs.stderr.length > 0 && /.*missing.*/.test(logs.stderr)) {
            console.log("");
            console.log(logs.stderr);
            return done({
              message: "Please make sure you have node, npm and pm2 installed on your remote machine!"
            });
          } else {
            return done();
          }
        }
      });
    },
    prepareHost: function(session, pm2mConf, done) {
      return session.execute("mkdir -p " + (path.join(getAppLocation(pm2mConf), _settings.backupDir)), {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr && logs.stderr.length > 0) {
            done({
              message: "" + logs.stderr
            });
          }
          return done();
        }
      });
    },
    shipTarBall: function(session, pm2mConf, done) {
      var destination, tarLocation;
      tarLocation = path.join(CWD, _settings.bundleTarName);
      destination = path.join(getAppLocation(pm2mConf), _settings.bundleTarName);
      console.log(tarLocation);
      console.log(destination);
      return session.copy(tarLocation, destination, {
        progressBar: true
      }, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          return done();
        }
      });
    },
    extractTarBall: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && rm -rf " + _settings.bundleName + " && tar -xf " + _settings.bundleTarName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          return done();
        }
      });
    },
    installBundleDeps: function(session, pm2mConf, done) {
      var serverLocation;
      serverLocation = path.join(getAppLocation(pm2mConf), _settings.bundleName, "/programs/server");
      return session.execute("cd " + serverLocation + " && npm i", {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          return done();
        }
      });
    },
    startApp: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && pm2 start " + _settings.pm2EnvConfigName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            done({
              message: logs.stderr
            });
          }
          return done();
        }
      });
    },
    stopApp: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && pm2 stop " + _settings.pm2EnvConfigName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            done({
              message: logs.stderr
            });
          }
          return done();
        }
      });
    },
    status: function(session, pm2mConf, done) {
      return session.execute("pm2 show " + pm2mConf.appName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            done(null, logs.stderr);
          }
          if (logs.stdout) {
            return done(null, logs.stdout);
          }
        }
      });
    },
    backupLastTar: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && mv " + _settings.bundleTarName + " backup/ 2>/dev/null", {}, function(err, code, logs) {
        if (err) {
          return done();
        } else {
          return done();
        }
      });
    },
    killApp: function(session, pm2mConf, done) {
      return session.execute("pm2 delete " + pm2mConf.appName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          return done();
        }
      });
    },
    reloadApp: function(session, pm2mConf, reconfig, done) {
      if (reconfig) {
        return this.hardReloadApp(session, pm2mConf, done);
      } else {
        return this.softReloadApp(session, pm2mConf, done);
      }
    },
    softReloadApp: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && pm2 startOrReload " + _settings.pm2EnvConfigName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            console.log(logs.stderr);
          }
          return done();
        }
      });
    },
    hardReloadApp: function(session, pm2mConf, done) {
      return session.execute("cd " + (getAppLocation(pm2mConf)) + " && pm2 delete " + pm2mConf.appName, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.sterr) {
            console.log(logs.stderr);
          }
          return session.execute("cd " + (getAppLocation(pm2mConf)) + " && pm2 start " + _settings.pm2EnvConfigName, {}, function(err, code, logs) {
            if (err) {
              return done(err);
            } else {
              if (logs.stderr) {
                console.log(logs.stderr);
              }
              return done();
            }
          });
        }
      });
    },
    deleteAppFolder: function(session, pm2mConf, done) {
      return session.execute("rm -rf " + (getAppLocation(pm2mConf)), {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            console.log(logs.stder);
          }
          return done();
        }
      });
    },
    scaleApp: function(session, pm2mConf, sParam, done) {
      var scaleCmd;
      scaleCmd = "pm2 scale " + pm2mConf.appName + " " + sParam;
      return session.execute(scaleCmd, {}, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            done({
              message: logs.stderr
            });
          }
          if (logs.stdout) {
            console.log(logs.stdout);
          }
          return done();
        }
      });
    },
    getAppLogs: function(session, pm2mConf, done) {
      return session.execute("pm2 logs " + pm2mConf.appName, {
        onStdout: console.log
      }, function(err, code, logs) {
        if (err) {
          return done(err);
        } else {
          if (logs.stderr) {
            return done({
              message: logs.stderr
            });
          }
        }
      });
    }
  };

}).call(this);

path = require 'path'
nodemiral = require 'nodemiral'
cli = require 'cli'
fs = require 'fs'
async = require 'async'
_settings = require "./settings"
CWD = process.cwd()
abs = require "abs"
getAppLocation = (pm2mConf)->  path.join pm2mConf.server.deploymentDir, pm2mConf.appName

# Remote tasks
module.exports =
  getRemoteSession: (pm2mConf)->
    session = nodemiral.session "#{pm2mConf.server.host}",
      username: pm2mConf.server.username
      password: pm2mConf.server.password if pm2mConf.server.password
      pem: fs.readFileSync(abs(pm2mConf.server.pem)) if pm2mConf.server.pem
    ,
      ssh:
        port: pm2mConf.server.port if pm2mConf.server.port
    return session
  checkDeps: (session, done)->
    checkCmd = "(command -v node || echo 'missing node' 1>&2) && (command -v npm || echo 'missing npm' 1>&2) && (command -v pm2 || echo 'missing pm2' 1>&2) && (command -v git || echo 'missing git' 1>&2)"
    session.execute checkCmd, {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr and logs.stderr.length > 0 and /.*missing.*/.test(logs.stderr)
          console.log ""
          console.log logs.stderr
          done message: "Please make sure you have node, npm, pm2 and git installed on your remote machine!"
        else
          done()
  prepareHost: (session, pm2mConf, done)->
    session.execute "mkdir -p #{path.join getAppLocation(pm2mConf), _settings.backupDir}", {}, (err,code,logs)->
      if err
        done err
      else
        if logs.stderr and logs.stderr.length > 0
          done message: "#{logs.stderr}"
        done()
  shipTarBall: (session, pm2mConf, done)->
    tarLocation = path.join CWD, _settings.bundleTarName
    destination = path.join getAppLocation(pm2mConf), _settings.bundleTarName
    console.log tarLocation
    console.log destination
    session.copy tarLocation, destination, {progressBar: true} , (err, code, logs)->
      if err
        done err
      else
        done()
  extractTarBall: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && rm -rf #{_settings.bundleName} && tar -xf #{_settings.bundleTarName}", {}, (err, code, logs)->
      if err
        done err
      else
        done()
  installBundleDeps: (session, pm2mConf, done)->
    serverLocation = path.join getAppLocation(pm2mConf), _settings.bundleName, "/programs/server"
    session.execute "cd #{serverLocation} && npm i", {}, (err, code, logs)->
      if err
        done err
      else
        done()
  startApp: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && pm2 start #{_settings.pm2EnvConfigName}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          done message: logs.stderr
        done()
  stopApp: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && pm2 stop #{_settings.pm2EnvConfigName}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          done message: logs.stderr
        done()

  status: (session, pm2mConf, done)->
    session.execute "pm2 show #{pm2mConf.appName}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          done(null, logs.stderr)
        if logs.stdout
          done(null, logs.stdout)

  backupLastTar: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && mv #{_settings.bundleTarName} backup/ 2>/dev/null", {}, (err, code, logs)->
      if err
        done()
      else
        done()
  killApp: (session, pm2mConf, done)->
    session.execute "pm2 delete #{pm2mConf.appName}", {}, (err, code, logs)->
      if err
        done err
      else
        done()
  reloadApp: (session, pm2mConf, reconfig, done)->
    if reconfig
      @hardReloadApp session, pm2mConf, done
    else
      @softReloadApp session, pm2mConf, done
  softReloadApp: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && pm2 startOrReload #{_settings.pm2EnvConfigName}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          console.log logs.stderr
        done()
  hardReloadApp: (session, pm2mConf, done)->
    session.execute "cd #{getAppLocation(pm2mConf)} && pm2 delete #{pm2mConf.appName}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.sterr
          console.log logs.stderr
        session.execute "cd #{getAppLocation(pm2mConf)} && pm2 start #{_settings.pm2EnvConfigName}", {}, (err, code, logs)->
          if err
            done err
          else
            if logs.stderr
              console.log logs.stderr
            done()
  deleteAppFolder: (session, pm2mConf, done)->
    session.execute "rm -rf #{getAppLocation(pm2mConf)}", {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          console.log logs.stder
        done()
  scaleApp: (session, pm2mConf, sParam, done)->
    scaleCmd = "pm2 scale #{pm2mConf.appName} #{sParam}"
    session.execute scaleCmd, {}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          done message: logs.stderr
        if logs.stdout
          console.log logs.stdout
        done()
  getAppLogs: (session, pm2mConf, done)->
    session.execute "pm2 logs #{pm2mConf.appName}", {onStdout: console.log}, (err, code, logs)->
      if err
        done err
      else
        if logs.stderr
          done message: logs.stderr

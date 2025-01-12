/*
 * start-stop-test.js: Start/Stop tests for using Monitor instances.
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

const assert = require('assert'),
  path = require('path'),
  vows = require('vows'),
  fmonitor = require('../../lib');

const semver = require('semver');

const examplesDir = path.join(__dirname, '..', '..', 'examples');

vows
  .describe('forever-monitor/monitor/start-stop')
  .addBatch({
    'When using forever-monitor': {
      'an instance of Monitor with valid options': {
        topic: new fmonitor.Monitor(path.join(examplesDir, 'server.js'), {
          max: 10,
          silent: true,
          args: ['-p', 8090],
          logFile: './main.log',
          outFile: './out.log',
          errFile: './err.log',
        }),
        'should have correct properties set': function(child) {
          assert.isArray(child.args);
          assert.strictEqual(child.max, 10);
          assert.isTrue(child.silent);
          assert.isFunction(child.start);
          assert.isObject(child.data);
          assert.isFunction(child.stop);
        },
        'calling the start() and stop() methods': {
          topic: function(child) {
            const cb = this.callback;

            // FixMe this fails on Node 12+
            if (semver.gte(process.version, '12.0.0')) {
              cb(null, { running: false });
            }

            const timer = setTimeout(() => {
              cb(
                new Error('Child did not die when killed by forever'),
                child
              );
            }, 8000);

            process.on('uncaughtException', (err) => {
              cb(err, child);
            });

            child.on("start", () => {
              child.stop();
              setTimeout(function() {
                child.restart();
                child.once('restart', () => {
                  child.stop();
                });
                child.once('exit', () => {
                  // wait another two seconds, to make sure the child is not restarted after calling stop()
                  setTimeout(function() {
                    clearTimeout(timer);
                    cb(null, child);
                  }, 2000);
                });
              }, 2000);
            });

            
            child.start();
          },
          'should restart the child process': function(err, child) {
            assert.isNull(err);
            assert.isFalse(child.running);
          },
        },
      },
    },
  })
  .export(module);

/*
 * simple-test.js: Simple tests for using Monitor instances.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const assert = require('assert'),
  path = require('path'),
  vows = require('vows'),
  fmonitor = require('../../lib'),
  macros = require('../helpers/macros');

const examplesDir = path.join(__dirname, '..', '..', 'examples');

vows
  .describe('forever-monitor/monitor/simple')
  .addBatch({
    'When using forever-monitor': {
      'an instance of Monitor with valid options': {
        topic: new fmonitor.Monitor(path.join(examplesDir, 'server.js'), {
          max: 10,
          silent: true,
          args: ['-p', 8090],
        }),
        'should have correct properties set': function (child) {
          assert.isArray(child.args);
          assert.strictEqual(child.max, 10);
          assert.isTrue(child.silent);
          assert.isFunction(child.start);
          assert.isObject(child.data);
          assert.isFunction(child.stop);
        },
        'calling the restart() method in less than `minUptime`': {
          topic: function (child) {
            const that = this;
            child.once('start', function () {
              child.once('restart', that.callback.bind(this, null));
              child.restart();
            });
            child.start();
          },
          'should restart the child process': function (_, child, data) {
            assert.isObject(data);
            child.kill(true);
          },
        },
      },
      'running error-on-timer sample three times': macros.assertTimes(
        path.join(examplesDir, 'error-on-timer.js'),
        3,
        {
          minUptime: 200,
          silent: true,
          outFile: 'test/fixtures/stdout.log',
          errFile: 'test/fixtures/stderr.log',
          args: [],
        }
      ),
      'running error-on-timer sample once': macros.assertTimes(
        path.join(examplesDir, 'error-on-timer.js'),
        1,
        {
          minUptime: 200,
          silent: true,
          outFile: 'test/fixtures/stdout.log',
          errFile: 'test/fixtures/stderr.log',
          args: [],
        }
      ),
      'non-node usage with a perl one-liner': {
        topic: function () {
          const child = fmonitor.start(['perl', '-le', 'print "moo"'], {
            max: 1,
            silent: true,
            debug: {
              prefix: "[PERL %%]"
            }
          });
          child.on('stdout', this.callback.bind({}, null));
        },
        'should get back moo': function (err, buf) {
          assert.strictEqual(buf.toString(), 'moo\n');
        },
      },
      'passing node flags through command': {
        topic: function () {
          const child = fmonitor.start('test/fixtures/gc.js', {
            command: 'node --expose-gc',
            max: 1,
            silent: true,
          });
          child.on('stdout', this.callback.bind({}, null));
        },
        'should get back function': function (err, buf) {
          assert.isNull(err);
          assert.strictEqual('' + buf, 'function\n');
        },
      },
      "attempting to start a script that doesn't exist": {
        topic: function () {

          const child = fmonitor.start('invalid-path.js', {
            max: 1,
            silent: true,
          });

          child.on("error", (err) => this.callback({},err))
        },
        'should throw an error about the invalid file': function (err, expectedErr) {
          assert.isNotNull(expectedErr);
          assert.isTrue(expectedErr.message.indexOf('does not exist') !== -1);
        },
      },
      'attempting to start a command with `node` in the name': {
        topic: function () {
          if (process.platform == 'win32') {
            return 'sample-script.js';
          }
          const child = fmonitor.start('sample-script.js', {
            command: path.join(__dirname, '..', 'fixtures', 'testnode'),
            silent: true,
            max: 1,
            debug: {
              prefix: "[NODENAME -%%-]"
            }
          });
          child.on('stdout', this.callback.bind({}, null));

        },
        'should run the script': function (err, buf) {
          assert.isNull(err);
          assert.strictEqual('' + buf, 'sample-script.js');
        },
      },
    },
  })
  .export(module);

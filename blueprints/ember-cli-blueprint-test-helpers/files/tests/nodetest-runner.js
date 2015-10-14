'use strict';

var glob = require('glob');
var Mocha = require('mocha');
var Promise = require('ember-cli/lib/ext/promise');
var rimraf = require('rimraf');
var mochaOnlyDetector = require('mocha-only-detector');

if (process.env.EOLNEWLINE) {
  require('os').EOL = '\n';
}

rimraf.sync('.node_modules-tmp');
rimraf.sync('.bower_components-tmp');

var root = 'tests/{blueprints,acceptance,unit}';
var _checkOnlyInTests = Promise.denodeify(mochaOnlyDetector.checkFolder.bind(null, root + '/**/*{-nodetest}.js'));
var optionOrFile = process.argv[2];
var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec'
});
var testFiles = glob.sync(root + '/**/*-nodetest.js');
/*var jshintPosition = testFiles.indexOf('tests/unit/jshint-test.js');
var jshint = testFiles.splice(jshintPosition, 1);

testFiles = jshint.concat(testFiles);
*/
if (optionOrFile === 'all') {
  addFiles(mocha, testFiles);
  addFiles(mocha, 'blueprints/**/*-nodetest.js');
  addFiles(mocha, '/**/*-nodetest-slow.js');
} else if (process.argv.length > 2)  {
  addFiles(mocha, process.argv.slice(2));
} else {
  addFiles(mocha, testFiles);
}

function addFiles(mocha, files) {
  files = (typeof files === 'string') ? glob.sync(root + files) : files;
  files.forEach(mocha.addFile.bind(mocha));
}

function checkOnlyInTests() {
  console.log('Verifing `.only` in tests');
  return _checkOnlyInTests().then(function() {
    console.log('No `.only` found');
  });
}

function runMocha() {
  mocha.run(function(failures) {
    process.on('exit', function() {
      process.exit(failures);
    });
  });
}

function ciVerificationStep() {
  if (process.env.CI === 'true') {
    return checkOnlyInTests();
  } else {
    return Promise.resolve();
  }
}

ciVerificationStep()
  .then(function() {
    runMocha();
  })
  .catch(function(error) {
    console.error(error);
    process.exit(1);
  });
/**
 * Created by solomonliu on 2017-05-26.
 */
"use strict";
var API_KEY = 'API_KEY';
var VERSION = {
    version: "VERSION",
    build: "BUILD"
};

var CONFIG_PATH = '../../json/test/config.json';

var OTHER_REC = 'OTHER_REC';

var GAME_URI = 'GAME_URI';
var USER = 'USER';
var LEARNER_LIST = [{
    id: 'LEARNER'
}];

var app;
describe("Springroll ALP Plugin Tests", function() {
    var Application = include("springroll.Application");
    var Learning = include("springroll.pbskids.Learning");

    //stub SDK
    var sdkStub = sinon.createStubInstance(KidaptiveSdk);
    var sdkInitStub = sinon.stub(KidaptiveSdk, 'init');

    //helper for initializing app and running tests after app init
    var testWithOptions = function(tests, options) {
        app = new Application(options || {
                configPath: CONFIG_PATH,
                alp: {
                    apiKey: API_KEY,
                    version: VERSION,
                    gameUri: GAME_URI
                }
            });
        app.on('init', tests);
    };

    beforeEach(function() {
        sdkStub.getCurrentUser.returns(USER);
        sdkStub.getLearnerList.returns(LEARNER_LIST);
        sdkStub.flushEvents.resolves();
        sdkInitStub.resolves(sdkStub);
    });

    afterEach(function(done) {
        app.destroy();
        var wait = function() {
            if (app.alpPlugin) {
                setTimeout(wait,0);
            } else {
                for (var m in sdkStub) {
                    sdkStub[m].reset();
                }
                sdkInitStub.reset();
                done();
            }
        };
        wait();
    });

    it("initialization", function(done) {
        testWithOptions(function() {
            KidaptiveSdk.init.calledOnce.should.true();
            KidaptiveSdk.init.calledWithExactly(API_KEY, VERSION).should.true();
            app.should.property('alpPlugin');
            app.alpPlugin.should.property('sdk', sdkStub);
            app.alpPlugin.should.property('getRecommendation').Function();
            app.alpPlugin.should.property('getState').Function();
            app.alpPlugin.should.property('setState').Function();
            done();
        });
    });

    it('teardown', function(done) {
        testWithOptions(function() {
            setTimeout(function() {
                app.destroy();
            },0);
            var wait = function() {
                if (app.alpPlugin) {
                    setTimeout(wait,0);
                } else {
                    sdkStub.flushEvents.calledOnce.should.true();
                    sdkStub.stopAutoFlush.calledOnce.should.true();
                    done();
                }
            };
            wait();
        });
    });

    it("state - initial state", function(done) {
        testWithOptions(function() {
            app.alpPlugin.getState().should.Object().empty();
            done();
        });
    });

    it('state - immutable return value', function(done) {
        testWithOptions(function() {
            var state = app.alpPlugin.getState();
            state['a'] = 'b';
            app.alpPlugin.getState().should.Object().empty();
            done();
        });
    });

    it('state - set state', function(done) {
        testWithOptions(function() {
            var state = {'a': 1, 'b': 2};
            var origState = JSON.parse(JSON.stringify(state));
            var addState = {'b': 4, 'd':5};
            var combined = {'a':1, 'b': 4, 'd': 5};
            app.alpPlugin.setState(state);
            app.alpPlugin.getState().should.properties(state);
            state.c = 3;
            app.alpPlugin.getState().should.properties(origState).size(2);
            app.alpPlugin.setState(addState);
            app.alpPlugin.getState().should.properties(combined).size(3);
            done();
        });
    });

    it('default recommendation', function(done) {
        testWithOptions(function() {
            var rec = {};
            sdkStub.recommendOptimalDifficultyPrompts.returns(rec);

            app.alpPlugin.getRecommendation().should.equal(rec);
            sdkStub.recommendOptimalDifficultyPrompts.calledOnce.should.true();
            sdkStub.recommendOptimalDifficultyPrompts.calledWith(LEARNER_LIST[0].id, GAME_URI).should.true();
            done();
        });
    });

    it('default event handling', function(done) {
        testWithOptions(function() {
            //wait a bit. startGame needs to run first
            setTimeout(function() {
                sdkStub.reportBehavior.reset();
                app.on('learningEvent', function() {
                    sdkStub.reportBehavior.calledOnce.should.true();

                    var call = sdkStub.reportBehavior.firstCall;
                    call.args[0].should.equal('EVENT_NAME');

                    var eventArgs = call.args[1];
                    eventArgs.should.properties({
                        learnerId: 'LEARNER',
                        gameUri: GAME_URI,
                        duration: 2.345
                    });
                    eventArgs.should.property('additionalFields');
                    eventArgs.should.size(4);

                    var additionalFields = eventArgs.additionalFields;
                    additionalFields.should.properties({
                        boolean_field: 'true',
                        number_field: '3',
                        string_field: 'asdf',
                        array_field: '[]',
                        object_field: '{}',
                        springroll_event_id: 'SPRINGROLL_EVENT_ID',
                        springroll_game_id: 'SPRINGROLL_GAME_ID',
                        springroll_event_code: '1234'
                    });
                    additionalFields.should.property('game_time');
                    additionalFields.should.size(9);

                    done();
                });

                app.learning.EVENT_NAME(
                    2345, //duration
                    true, //boolean
                    3, //number
                    'asdf', //string
                    [], //array
                    {} //object
                );
            },0);
        });
    });

    it('event reporting override', function(done) {
        var override = sinon.spy();
        testWithOptions(function() {
            setTimeout(function() {
                override.reset();
                app.on('learningEvent', function(event) {
                    override.calledOnce.should.true();
                    override.firstCall.args[0].should.equal(event);
                    override.firstCall.thisValue.should.equal(app);
                    done();
                });
                app.learning.EVENT_NAME(
                    2345, //duration
                    true, //boolean
                    3, //number
                    'asdf', //string
                    [], //array
                    {} //object
                );
            },0);
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                eventOverride: override
            }
        });
    });

    it('rec type static override', function(done){
        testWithOptions(function() {
            app.alpPlugin.getRecommendation();
            sdkStub.provideRecommendation.calledOnce.should.true();

            var call = sdkStub.provideRecommendation.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({gameUri:GAME_URI, learnerId: 'LEARNER'}).size(2);
            done();
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recType: OTHER_REC
            }
        });
    });

    it('rec type dynamic override', function(done) {
        var recType = sinon.stub().returns(OTHER_REC);
        var context = {};
        testWithOptions(function() {
            app.alpPlugin.getRecommendation(context);
            sdkStub.provideRecommendation.calledOnce.should.true();
            recType.calledOnce.should.true();
            recType.calledWithExactly(context).should.true();
            recType.firstCall.thisValue.should.equal(app);

            var call = sdkStub.provideRecommendation.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({gameUri:GAME_URI, learnerId: 'LEARNER'}).size(2);
            done();
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recType: recType
            }
        });
    });

    it('rec params static override', function(done) {
        testWithOptions(function() {
            app.alpPlugin.getRecommendation();
            sdkStub.provideRecommendation.calledOnce.should.true();

            var call = sdkStub.provideRecommendation.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({param: 'value', gameUri:GAME_URI, learnerId: 'LEARNER'}).size(3);
            done();
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recType: OTHER_REC,
                recParams: {
                    param: 'value'
                }
            }
        });
    });

    it('rec params dynamic override', function(done) {
        var context = {};
        var override = sinon.stub().returns({param: 'value'});
        testWithOptions(function() {
            app.alpPlugin.getRecommendation(context);
            sdkStub.provideRecommendation.calledOnce.should.true();
            override.calledOnce.should.true();
            override.calledWithExactly(context).should.true();
            override.firstCall.thisValue.should.equal(app);

            var call = sdkStub.provideRecommendation.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({param: 'value', gameUri:GAME_URI, learnerId: 'LEARNER'}).size(3);
            done();
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recType: OTHER_REC,
                recParams: override
            }
        });
    });

    it('rec callback override', function(done) {
        var context = {};
        var rawRec = {};
        var rec = {};
        sdkStub.recommendOptimalDifficultyPrompts.returns(rawRec);
        var override = sinon.stub().returns(rec);
        testWithOptions(function() {
            app.alpPlugin.getRecommendation(context).should.equal(rec);
            override.calledOnce.should.true();
            override.calledWithExactly(rawRec, context).should.true();
            override.firstCall.thisValue.should.equal(app);

            done();
        }, {
            configPath: CONFIG_PATH,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recCallback: override
            }
        });
    });
});
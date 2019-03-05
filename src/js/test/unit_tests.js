/**
 * Created by solomonliu on 2017-05-26.
 */
"use strict";
var API_KEY = 'API_KEY';
var VERSION = {
    version: "VERSION",
    build: "BUILD"
};
var OPTIONS = {
    dev:true,
    sdkOption: 'SDK_OPTION'
};

var CONFIG_PATH_OLD = '../../json/test/config_old.json';
var CONFIG_PATH = "../../json/test/config.json";

var OTHER_REC = 'OTHER_REC';

var GAME_URI = 'GAME_URI';
var USER = {id:1};
var LEARNER_LIST = [{
    id: 'LEARNER'
}];

var app;
describe("Springroll ALP Plugin Tests", function() {
    var Application = include("springroll.Application");

    //stub SDK
    var sdkStub = sinon.stub(KidaptiveSdk);
    var releaseStatusStub = sinon.stub(KidaptiveAlpPlugin,'getReleaseStatus');

    //helper for initializing app and running tests after app init
    var testWithOptions = function(tests, done, options) {
        done = done || function(){};
        app = new Application(options || {
                name: "ALP Plugin Test",
                configPath: CONFIG_PATH_OLD
            });
        app.on('init', function() {
            try {
                tests();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function() {
        sdkStub.getCurrentUser.returns(USER);
        sdkStub.getLearnerList.returns(LEARNER_LIST);
        sdkStub.flushEvents.resolves();
        sdkStub.init.resolves(sdkStub);
        sdkStub.refresh.resolves();
        sdkStub.logoutUser.resolves();
        sdkStub.startAnonymousSession.resolves();
        sdkStub.destroy.resolves();
        releaseStatusStub.returns(undefined);
    });

    afterEach(function(done) {
        app.destroy();
        var wait = function() {
            try {
                if (app.alpPlugin) {
                    setTimeout(wait,0);
                } else {
                    for (var m in sdkStub) {
                        if (typeof sdkStub[m] === 'function') {
                            sdkStub[m].reset();
                        }
                    }
                    done();
                }
            } catch (e) {
                done(e)
            }
        };
        wait();
    });

    it("initialization - deprecated config", function(done) {
        testWithOptions(function() {
            var calls = KidaptiveSdk.init.getCalls();
            calls.length.should.eql(1);
            calls[0].args.slice(0,2).should.eql([API_KEY,VERSION]);

            var options = KidaptiveSdk.KidaptiveUtils.copyObject(calls[0].args[2], true);
            var afc = options.autoFlushCallbacks;

            delete options['autoFlushCallbacks'];
            options.should.eql(OPTIONS);

            afc.length.should.eql(1);
            afc[0].should.Function();

            app.should.property('alpPlugin');
            app.alpPlugin.should.property('sdk', sdkStub);
            app.alpPlugin.should.property('getRecommendation').Function();
            app.alpPlugin.should.property('getState').Function();
            app.alpPlugin.should.property('setState').Function();
        }, done);
    });

    it("initialization dev", function(done) {
        testWithOptions(function() {
            var calls = KidaptiveSdk.init.getCalls();
            calls.length.should.eql(1);
            calls[0].args.slice(0,2).should.eql(["CONFIG_DEV_API_KEY",
                {version:"CONFIG_DEV_VERSION",build:"CONFIG_DEV_BUILD"}]);

            var options = KidaptiveSdk.KidaptiveUtils.copyObject(calls[0].args[2], true);
            var afc = options.autoFlushCallbacks;

            delete options['autoFlushCallbacks'];
            options.should.eql({
                dev:true,
                sdkOption:"CONFIG_DEV_SDK_OPTION"
            });

            afc.length.should.eql(1);
            afc[0].should.Function();

            app.should.property('alpPlugin');
            app.alpPlugin.should.property('sdk', sdkStub);
            app.alpPlugin.should.property('getRecommendation').Function();
            app.alpPlugin.should.property('getState').Function();
            app.alpPlugin.should.property('setState').Function();
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH
        });
    });

    it("initialization prod", function(done) {
        releaseStatusStub.returns(true);
        testWithOptions(function() {
            var calls = KidaptiveSdk.init.getCalls();
            calls.length.should.eql(1);
            calls[0].args.slice(0,2).should.eql(["CONFIG_PROD_API_KEY",
                {version:"CONFIG_PROD_VERSION",build:"CONFIG_PROD_BUILD"}]);

            var options = KidaptiveSdk.KidaptiveUtils.copyObject(calls[0].args[2], true);
            var afc = options.autoFlushCallbacks;

            delete options['autoFlushCallbacks'];
            options.should.eql({
                sdkOption:"CONFIG_PROD_SDK_OPTION"
            });

            afc.length.should.eql(1);
            afc[0].should.Function();

            app.should.property('alpPlugin');
            app.alpPlugin.should.property('sdk', sdkStub);
            app.alpPlugin.should.property('getRecommendation').Function();
            app.alpPlugin.should.property('getState').Function();
            app.alpPlugin.should.property('setState').Function();
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH
        });
    });

    it("init with options - deprecated", function(done) {
        var mergedSdkOptions = KidaptiveSdk.KidaptiveUtils.copyObject(OPTIONS);
        mergedSdkOptions.sdkOption = "OTHER_SDK_OPTION";
        testWithOptions(function() {
            KidaptiveSdk.init.calledWithExactly("OTHER_API_KEY", VERSION, mergedSdkOptions);
            var mergedOptions = KidaptiveSdk.KidaptiveUtils.copyObject(app.config.alp);
            mergedOptions.apiKey = "OTHER_API_KEY";
            mergedOptions.options = mergedSdkOptions;
            app.alpPlugin.getInitParams().should.deepEqual(mergedOptions);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
            alp: {
                apiKey: "OTHER_API_KEY",
                options: {
                    sdkOption: "OTHER_SDK_OPTION"
                }
            }
        });
    });

    it("init with options", function(done) {
        var mergedSdkOptions = {
            dev: true,
            sdkOption: "OPTION_DEV_SDK_OPTION"
        };
        var version = {
            version: "OPTION_DEV_VERSION",
            build: "OPTION_DEV_BUILD"
        };
        testWithOptions(function() {
            KidaptiveSdk.init.calledWithExactly("OPTION_DEV_API_KEY", version, mergedSdkOptions);
            var mergedOptions = {
                apiKey: "OPTION_DEV_API_KEY",
                version: version,
                options: mergedSdkOptions,
                gameUri: "OPTION_DEV_GAME_URI"
            };
            app.alpPlugin.getInitParams().should.deepEqual(mergedOptions);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH,
            alp: {
                apiKey: "OPTION_DEV_API_KEY",
                version: version,
                options: {
                    sdkOption: "OPTION_DEV_SDK_OPTION"
                },
                gameUri: "OPTION_DEV_GAME_URI"
            }
        });
    });

    it("init with options prod", function(done) {
        releaseStatusStub.returns(true);
        var mergedSdkOptions = {
            sdkOption: "OPTION_PROD_SDK_OPTION"
        };
        var version = {
            version: "OPTION_PROD_VERSION",
            build: "OPTION_PROD_BUILD"
        };
        testWithOptions(function() {
            KidaptiveSdk.init.calledWithExactly("OPTION_PROD_API_KEY", version, mergedSdkOptions);
            var mergedOptions = {
                apiKey: "OPTION_PROD_API_KEY",
                version: version,
                options: mergedSdkOptions,
                gameUri: "OPTION_PROD_GAME_URI"
            };
            app.alpPlugin.getInitParams().should.deepEqual(mergedOptions);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH,
            alp: {
                apiKey: "OPTION_PROD_API_KEY",
                version: version,
                options: {
                    sdkOption: "OPTION_PROD_SDK_OPTION"
                },
                gameUri: "OPTION_PROD_GAME_URI"
            }
        });
    });

    it('teardown', function(done) {
        testWithOptions(function() {
            try {
                setTimeout(function() {
                    try {
                        app.destroy();
                    } catch (e) {
                        done(e);
                    }
                },0);
                var wait = function() {
                    try {
                        if (app.alpPlugin) {
                            setTimeout(wait,0);
                        } else {
                            sdkStub.destroy.calledOnce.should.true();
                            done();
                        }
                    } catch (e) {
                        done(e);
                    }
                };
                wait();
            } catch (e) {
                done(e);
            }
        });
    });

    it("state - initial state", function(done) {
        testWithOptions(function() {
            app.alpPlugin.getState().should.Object().empty();
        }, done);
    });

    it('state - immutable return value', function(done) {
        testWithOptions(function() {
            var state = app.alpPlugin.getState();
            state['a'] = 'b';
            app.alpPlugin.getState().should.Object().empty();
        }, done);
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
        },done);
    });

    it('default recommendation', function(done) {
        testWithOptions(function() {
            var rec = {};
            sdkStub.getOptimalDifficultyRecommendations.returns(rec);

            app.alpPlugin.getRecommendation().should.equal(rec);
            sdkStub.getOptimalDifficultyRecommendations.calledOnce.should.true();
            sdkStub.getOptimalDifficultyRecommendations.calledWith({learnerId: LEARNER_LIST[0].id, game:GAME_URI}).should.true();
        }, done);
    });

    it('default event handling', function(done) {
        testWithOptions(function() {
            setTimeout(function() {
                app.on('learningEvent', function() {
                    try {
                        sdkStub.reportBehavior.calledOnce.should.true();

                        var call = sdkStub.reportBehavior.firstCall;
                        call.args[0].should.equal('EVENT_NAME');

                        var eventArgs = call.args[1];
                        eventArgs.should.properties({
                            learnerId: 'LEARNER',
                            gameURI: GAME_URI,
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
                        additionalFields.should.property('event_count');
                        additionalFields.should.property('session_id');
                        additionalFields.should.size(11);

                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                sdkStub.reportBehavior.resetHistory();
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
                    try {
                        override.calledOnce.should.true();
                        override.firstCall.args[0].should.equal(event);
                        var reportDefault = override.firstCall.args[1];
                        var defaultEvent = override.firstCall.args[2];
                        reportDefault.should.Function();
                        defaultEvent.should.Function();
                        sinon.spy(reportDefault);
                        sinon.spy(defaultEvent);
                        override.firstCall.thisValue.should.equal(app);

                        var de = defaultEvent(event);

                        de.should.size(2);
                        de.should.properties({
                            eventName: 'EVENT_NAME'
                        });
                        de.should.property('args');

                        de.args.should.size(4);
                        de.args.should.properties({
                            learnerId: 'LEARNER',
                            gameURI: GAME_URI,
                            duration: 2.345
                        });
                        de.args.should.property('additionalFields');

                        de.args.additionalFields.should.size(11);
                        de.args.additionalFields.should.properties({
                            boolean_field: 'true',
                            number_field: '3',
                            string_field: 'asdf',
                            array_field: '[]',
                            object_field: '{}',
                            springroll_event_id: 'SPRINGROLL_EVENT_ID',
                            springroll_game_id: 'SPRINGROLL_GAME_ID',
                            springroll_event_code: '1234'
                        });
                        de.args.additionalFields.should.property('game_time');
                        de.args.additionalFields.should.property('event_count');
                        de.args.additionalFields.should.property('session_id');

                        reportDefault(event);
                        var calls = sdkStub.reportBehavior.getCalls();
                        calls.length.should.eql(1);
                        calls[0].args.should.eql([de.eventName, de.args]);

                        done();
                    } catch (e) {
                        done(e);
                    }
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
        }, undefined, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
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
            sdkStub.getRecommendations.calledOnce.should.true();

            var call = sdkStub.getRecommendations.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({game:GAME_URI, learnerId: 'LEARNER'}).size(2);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
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
            sdkStub.getRecommendations.calledOnce.should.true();
            recType.calledOnce.should.true();
            recType.calledWithExactly(context).should.true();
            recType.firstCall.thisValue.should.equal(app);

            var call = sdkStub.getRecommendations.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({game:GAME_URI, learnerId: 'LEARNER'}).size(2);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
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
            sdkStub.getRecommendations.calledOnce.should.true();

            var call = sdkStub.getRecommendations.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({param: 'value', game:GAME_URI, learnerId: 'LEARNER'}).size(3);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
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
            sdkStub.getRecommendations.calledOnce.should.true();
            override.calledOnce.should.true();
            override.calledWithExactly(context).should.true();
            override.firstCall.thisValue.should.equal(app);

            var call = sdkStub.getRecommendations.firstCall;
            call.args[0].should.equal(OTHER_REC);
            call.args[1].should.properties({param: 'value', game:GAME_URI, learnerId: 'LEARNER'}).size(3);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
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
        sdkStub.getOptimalDifficultyRecommendations.returns(rawRec);
        var override = sinon.stub().returns(rec);
        testWithOptions(function() {
            app.alpPlugin.getRecommendation(context).should.equal(rec);
            override.calledOnce.should.true();
            override.calledWithExactly(rawRec, context).should.true();
            override.firstCall.thisValue.should.equal(app);
        }, done, {
            name: "ALP Plugin Test",
            configPath: CONFIG_PATH_OLD,
            alp: {
                apiKey: API_KEY,
                version: VERSION,
                gameUri: GAME_URI,
                recCallback: override
            }
        });
    });

    it('oidc auth success', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.true();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthSuccess', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc auth success anonymous', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.true();
                        sdkStub.logoutUser.called.should.true();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.isAnonymousSession.returns(true);
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthSuccess', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc auth success empty', function(done) {
        testWithOptions(function() {
            setTimeout(function() {
                app.container.on('openIdAuthSuccess',function() {
                    setTimeout(function() {
                        try {
                            sdkStub.refresh.calledOnce.should.true();
                            sdkStub.logoutUser.called.should.true();
                            sdkStub.startAnonymousSession.called.should.true();
                            app.alpPlugin.getState().should.deepEqual({});
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
                });
                app.alpPlugin.setState({a:1});
                sdkStub.getCurrentUser.resetHistory();
                sdkStub.logoutUser.resetHistory();
                sdkStub.refresh.resetHistory();
                sdkStub.startAnonymousSession.resetHistory();
                sdkStub.getCurrentUser.onCall(1).returns(undefined);
                app.container.trigger({type: 'openIdAuthSuccess', data:{name:"Kidaptive ALP"}});
            });
        });
    });

    it('oidc auth success wrong name', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthSuccess', data:{name:"Something else"}});
        });
    });

    it('oidc auth failure', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.true();
                        sdkStub.startAnonymousSession.called.should.true();
                        app.alpPlugin.getState().should.deepEqual({});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthFailure', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc auth failure anonymous', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.isAnonymousSession.returns(true);
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthFailure', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc auth failure wrong name', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.called.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthFailure', data:{name:"Something Else"}});
        });
    });

    it('oidc refresh success', function(done) {
        testWithOptions(function() {
            app.container.on('openIdRefreshAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.true();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdRefreshAuthSuccess', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc refresh success anonymous', function(done) {
        testWithOptions(function() {
            app.container.on('openIdRefreshAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.true();
                        sdkStub.logoutUser.called.should.true();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.isAnonymousSession.returns(true);
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdRefreshAuthSuccess', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc refresh success empty', function(done) {
        testWithOptions(function() {
            setTimeout(function() {
                app.container.on('openIdRefreshAuthSuccess',function() {
                    setTimeout(function() {
                        try {
                            sdkStub.refresh.calledOnce.should.true();
                            sdkStub.logoutUser.called.should.true();
                            sdkStub.startAnonymousSession.called.should.true();
                            app.alpPlugin.getState().should.deepEqual({});
                            done();
                        } catch (e) {
                            done(e);
                        }
                    });
                });
                app.alpPlugin.setState({a:1});
                sdkStub.getCurrentUser.resetHistory();
                sdkStub.logoutUser.resetHistory();
                sdkStub.refresh.resetHistory();
                sdkStub.startAnonymousSession.resetHistory();
                sdkStub.getCurrentUser.onCall(1).returns(undefined);
                app.container.trigger({type: 'openIdRefreshAuthSuccess', data:{name:"Kidaptive ALP"}});
            });
        });
    });

    it('oidc refresh success wrong name', function(done) {
        testWithOptions(function() {
            app.container.on('openIdRefreshAuthSuccess',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdRefreshAuthSuccess', data:{name:"Something else"}});
        });
    });

    it('oidc refresh failure', function(done) {
        testWithOptions(function() {
            app.container.on('openIdRefreshAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.true();
                        sdkStub.startAnonymousSession.called.should.true();
                        app.alpPlugin.getState().should.deepEqual({});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdRefreshAuthFailure', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc refresh failure anonymous', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.calledOnce.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.isAnonymousSession.returns(true);
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdAuthFailure', data:{name:"Kidaptive ALP"}});
        });
    });

    it('oidc refresh failure wrong name', function(done) {
        testWithOptions(function() {
            app.container.on('openIdRefreshAuthFailure',function() {
                setTimeout(function() {
                    try {
                        sdkStub.refresh.called.should.false();
                        sdkStub.logoutUser.called.should.false();
                        sdkStub.startAnonymousSession.called.should.false();
                        app.alpPlugin.getState().should.deepEqual({a:1});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger({type: 'openIdRefreshAuthFailure', data:{name:"Something Else"}});
        });
    });

    it('oidc logout complete', function(done) {
        testWithOptions(function() {
            app.container.on('openIdAllLogoutsComplete',function() {
                setTimeout(function() {
                    try {
                        sdkStub.logoutUser.calledOnce.should.true();
                        sdkStub.refresh.called.should.false();
                        sdkStub.startAnonymousSession.called.should.true();
                        app.alpPlugin.getState().should.deepEqual({});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger('openIdAllLogoutsComplete');
        });
    });

    it('oidc logout anonynmous session', function(done) {
        testWithOptions(function() {
            sdkStub.isAnonymousSession.returns(true);
            app.container.on('openIdAllLogoutsComplete',function() {
                setTimeout(function() {
                    try {
                        sdkStub.logoutUser.calledTwice.should.true();
                        sdkStub.refresh.called.should.false();
                        sdkStub.startAnonymousSession.called.should.true();
                        app.alpPlugin.getState().should.deepEqual({});
                        done();
                    } catch (e) {
                        done(e);
                    }
                },0);
            });
            app.alpPlugin.setState({a:1});
            sdkStub.logoutUser.resetHistory();
            sdkStub.refresh.resetHistory();
            sdkStub.startAnonymousSession.resetHistory();
            app.container.trigger('openIdAllLogoutsComplete');
        });
    });
});
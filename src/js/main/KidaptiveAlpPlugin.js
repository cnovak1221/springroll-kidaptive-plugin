/**
 * Created by solomonliu on 11/29/16.
 */
KidaptiveAlpPlugin = new springroll.ApplicationPlugin();
KidaptiveAlpPlugin.getReleaseStatus = function(app) {
    return app && app.playOptions && app.playOptions.release;
};
(function() {
    "use strict";
    var plugin = KidaptiveAlpPlugin;

    plugin.preload = function(done) {
        //cascading dynamic value resolver.
        var resolveValue = function(value, context) {
            if (value instanceof Function) {
                return value.bind(this)(context)
            }
            return value;
        }.bind(this);

        //resolve init options. this.options takes precedence over this.config
        var initOptions = {
            options:{}
        };

        var fillInit = function(i) {
            Object.keys(i).forEach(function(k) {
                if (k === 'options') {
                    Object.keys(i[k]).forEach(function(j) {
                        initOptions.options[j] = i[k][j];
                    });
                } else {
                    initOptions[k] = i[k]
                }
            });
        };

        var alpEnv = KidaptiveAlpPlugin.getReleaseStatus(this) ? 'prod' : 'dev';
        var allowContainerEnvOverride = true;
        var warnDeprecation = false;

        if (this.config.alpEnvs && this.config.alpEnvs[alpEnv]) {
            fillInit(this.config.alpEnvs[alpEnv]);
            allowContainerEnvOverride = false;
        } else if (this.config.alp) {
            fillInit(this.config.alp);
            warnDeprecation = true;
        }

        if (this.options.alpEnvs && this.options.alpEnvs[alpEnv]) {
            fillInit(this.options.alpEnvs[alpEnv]);
            allowContainerEnvOverride = false;
        } else if (this.options.alp) {
            fillInit(this.options.alp);
            warnDeprecation = true;
        }

        if (warnDeprecation) {
            console.warn("app.config.alp and app.options.alp are deprecated and may be removed in a future release. Use app.config.alpEnvs and app.options.alpEnvs instead");
        }

        if (warnDeprecation && !allowContainerEnvOverride) {
            console.warn("mixed usage of alp and alpEnv detected. alp_config will NOT be fetched from container");
        }

        var initWithOptions = function(options) {
            var recType = options.recType;
            var recParams = options.recParams;
            var recCallback = options.recCallback;
            var gameUri = options.gameUri; //TODO: function passing in springroll_game_id and returning game_uri
            var eventOverride = options.eventOverride;
            var specDict = this.learning.catalog.events || {};

            var sdkOptions = KidaptiveSdk.KidaptiveUtils.copyObject(options.options) || {};
            sdkOptions.autoFlushCallbacks = sdkOptions.autoFlushCallbacks || [];
            sdkOptions.autoFlushCallbacks.splice(0,0,function(promise) {
                promise.then(function() {
                    if (!KidaptiveSdk.isAnonymousSession()) {
                        KidaptiveSdk.startAnonymousSession();
                    }
                });
            });

            KidaptiveSdk.init(options.apiKey, options.version, sdkOptions).then(function(sdk) {
                var state = {};

                this.alpPlugin = {
                    sdk: sdk,
                    getRecommendation: function(context) { //recommendations
                        var type = sdk.KidaptiveUtils.copyObject(resolveValue(recType, context) || 'optimalDifficulty');
                        var params = sdk.KidaptiveUtils.copyObject(resolveValue(recParams, context)) || {};
                        params.learnerId = sdk.getLearnerList()[0].id;
                        params.game = gameUri;
                        var rec;
                        switch(type) {
                            case 'random':
                                rec = sdk.getRandomRecommendations(params);
                                break;
                            case 'optimalDifficulty':
                                rec = sdk.getOptimalDifficultyRecommendations(params);
                                break;
                            default:
                                rec = sdk.getRecommendations(type, params);
                        }
                        return recCallback ? recCallback.bind(this)(rec, context) : rec;
                    }.bind(this),

                    //functions for getting and setting state information.
                    getState: function() {
                        return sdk.KidaptiveUtils.copyObject(state);
                    },
                    setState: function(newState) {
                        //delete keys marked undefined
                        Object.keys(newState).forEach(function(key) {
                            if (newState[key] === undefined) {
                                delete state[key];
                            }
                        });
                        //merge new state
                        newState = sdk.KidaptiveUtils.copyObject(newState);
                        Object.keys(newState).forEach(function(key) {
                            state[key] = newState[key];
                        });
                    },
                    getInitParams: function() {
                        return KidaptiveSdk.KidaptiveUtils.copyObject(options, true);
                    }
                };

                //if using oidc auth, listen for login state changes
                if (!options.options.noOidc && this.container) {
                    var openIdOfflineSDKHandler = function(event) {
                        console.warn('KidaptiveAlpPlugin is handling an openId event while using an offline-only SDK. Using an anonymous, local SDK session.');
                        sdk.init().then(function() {
                            if (!sdk.isAnonymousSession()) {
                                sdk.logoutUser();
                                sdk.startAnonymousSession().then(function() {
                                    state = {};
                                });
                            }
                        });
                    }

                    this.container.on('openIdAuthSuccess', openIdOfflineSDKHandler);
                    this.container.on('openIdRefreshAuthSuccess', openIdOfflineSDKHandler);
                    this.container.on('openIdAuthFailure', openIdOfflineSDKHandler);
                    this.container.on('openIdRefreshAuthFailure', openIdOfflineSDKHandler);
                    this.container.on('openIdAllLogoutsComplete', openIdOfflineSDKHandler);
                }

                //if Learning Module exists, turn learningEvents into behavior events
                if (this.learning) {
                    //the default event converter
                    var defaultEvent = function(data) {
                        
                        if (!sdk.getCurrentUser()) {
                            return;
                        }
                        var eventName = specDict[data.event_data.event_code] || 'Springroll Event';
                        var additionalFields = sdk.KidaptiveUtils.copyObject(data.event_data);
                        var args = {additionalFields: additionalFields};
                        args.gameURI = gameUri;
                        args.learnerId = sdk.getLearnerList()[0].id;
                        for (var k in additionalFields) {
                            if (k === 'duration' && typeof(additionalFields[k]) === 'number') {
                                args[k] = additionalFields[k] / 1000; //learningEvents report duration in milliseconds
                                delete additionalFields[k];
                            } else if (additionalFields[k] instanceof Object) {
                                additionalFields[k] = sdk.KidaptiveUtils.toJson(additionalFields[k]); //turn nested objects into json
                            } else {
                                additionalFields[k] = additionalFields[k].toString();
                            }
                        }
                        additionalFields.session_id = data.game_session;
                        additionalFields.springroll_game_id = data.game_id;
                        additionalFields.springroll_event_id = data.event_id;
                        additionalFields.springroll_event_code = additionalFields.event_code;
                        delete additionalFields.event_code;
                        return {
                            eventName: eventName,
                            args: args
                        }
                    };
                    var reportDefault = function(data) {
                        var de = defaultEvent(data);
                        if (de) {
                            sdk.reportBehavior(de.eventName,de.args);
                        }
                    };
                    var override = (eventOverride || reportDefault).bind(this);
                    this.learning.on("learningEvent", function(data) {
                        override(data,reportDefault,defaultEvent);
                    }.bind(this));
                }

                if (!sdk.isAnonymousSession()) {
                    return sdk.startAnonymousSession();
                }
            }.bind(this)).then(function() {
                done();
            }).catch(function(e) {
                console.error('Kidaptive ALP failed to initialize', e);
                done();
            });
        }.bind(this);

        if (allowContainerEnvOverride) {
            resolveConfigurationFromContainer(this.container, initOptions, initWithOptions);
        } else {
            initWithOptions(initOptions);
        }
    };

    plugin.teardown = function() {
        this.alpPlugin.sdk.destroy().then(function() {
            delete this.alpPlugin;
        }.bind(this));
    };

    /**
     * Attempts to request ALP configuration from the outer container. However, will timeout if
     * no data is received in time and then only provide the default data
     * @param {Bellhop} container The container bellhop communication layer
     * @param {Object} defaults A set of default ALP config to use. Results from the call are merged on top of this object
     * @param {Function} done A callback for when this operation finishes
     */
    var resolveConfigurationFromContainer = function(container, defaults, done) {
      // if the game is not in a container, bail with the defaults
      if (!(container instanceof Bellhop)) {
        done(defaults);
      }

      // since we're in a container, attempt to fetch configuration from outside.
      // However, we'll provide a timeout just in case the container's not listening
      var MAX_WAIT_TIME = 50;
      var successState = null;
      var timeout = setTimeout(function() {
        if(successState !== null) {
          return;
        }

        successState = false;
        done(defaults);
      }, MAX_WAIT_TIME);
      container.fetch('alp_config', function(event) {
        // we took too long
        if(successState !== null) {
          return;
        }

        successState = true;
        done(Object.merge({}, defaults, event.data));
      }, null, true);
    };
}());

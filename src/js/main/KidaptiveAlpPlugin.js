/**
 * Created by solomonliu on 11/29/16.
 */
(function() {
    "use strict";
    var plugin = new springroll.ApplicationPlugin();

    plugin.preload = function(done) {
        //cascading dynamic value resolver.
        var resolveValue = function(value, context) {
            return (value instanceof Function && value.bind(this)(context)) || value;
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

        if (this.config.alp) {
            fillInit(this.config.alp);
        }

        if (this.options.alp) {
            fillInit(this.options.alp)
        }

        resolveConfigurationFromContainer(this.container, initOptions, function(options) {
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
                  if (!KidaptiveSdk.getCurrentUser() && !KidaptiveSdk.isAnonymousSession()) {
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
                  var authSuccess = function(event) {
                      if (sdk.KidaptiveUtils.getObject(event, ['data','name']) !== 'Kidaptive ALP') {
                          return;
                      }
                      var userId;
                      sdk.init().then(function() {
                          userId = sdk.KidaptiveUtils.getObject(sdk.getCurrentUser(),'id');
                          if (sdk.isAnonymousSession()) {
                              sdk.logoutUser();
                          }
                          return sdk.refresh();
                      }).then(function() {
                          var newUserId = sdk.KidaptiveUtils.getObject(sdk.getCurrentUser(),'id');
                          if (!newUserId) {
                              throw new Error();
                          }
                          if (newUserId !== userId) {
                              state = {};
                          }
                      }).catch(function() {
                          sdk.logoutUser();
                          sdk.startAnonymousSession().then(function() {
                              state = {};
                          })
                      });
                  };

                  var authFail = function(event) {
                      if (sdk.KidaptiveUtils.getObject(event, ['data','name']) !== 'Kidaptive ALP') {
                          return;
                      }
                      sdk.init().then(function() {
                          if (!sdk.isAnonymousSession()) {
                              sdk.logoutUser();
                              sdk.startAnonymousSession().then(function() {
                                  state = {};
                              });
                          }
                      });
                  };

                  var logout = function() {
                      sdk.init().then(function() {
                          if (sdk.isAnonymousSession()) {
                              sdk.logoutUser();
                          }
                          sdk.logoutUser();
                          sdk.startAnonymousSession().then(function() {
                              state = {};
                          });
                      });
                  };

                  this.container.on('openIdAuthSuccess', authSuccess);
                  this.container.on('openIdRefreshAuthSuccess', authSuccess);
                  this.container.on('openIdAuthFailure', authFail);
                  this.container.on('openIdRefreshAuthFailure', authFail);
                  this.container.on('openIdAllLogoutsComplete', logout);
              }

              //if Learning Module exists, turn learningEvents into behavior events
              if (this.learning) {
                  //the default event converter
                  var pluginDefault = function(data) {
                      if (!sdk.getCurrentUser()) {
                          return;
                      }
                      var eventName = specDict[data.event_data.event_code] || 'Springroll Event';
                      var additionalFields = sdk.KidaptiveUtils.copyObject(data.event_data);
                      var args = {additionalFields: additionalFields};
                      args.gameUri = gameUri;
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
                      sdk.reportBehavior(eventName,args);
                  };
                  var override = (eventOverride || pluginDefault).bind(this);
                  this.learning.on("learningEvent", function(data) {
                      override(data,pluginDefault);
                  }.bind(this));
              }

              if (!sdk.getCurrentUser()) {
                  return sdk.startAnonymousSession();
              }
          }.bind(this)).then(function() {
              done();
          });
        }.bind(this));
    };

    plugin.teardown = function() {
        this.alpPlugin.sdk.destroy().then(function() {
            delete this.alpPlugin;
        }.bind(this));
    }

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
      var MAX_WAIT_TIME = 1000;
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

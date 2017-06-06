/**
 * Created by solomonliu on 11/29/16.
 */
(function() {
    "use strict";
    var plugin = new springroll.ApplicationPlugin();

    var toJson = function(o, inArray) {
        switch (typeof o) {
            case 'object':
                if (o !== null && !(o instanceof Boolean) && !(o instanceof Number) && !(o instanceof String)) {
                    if (o instanceof Array) {
                        return '[' + o.map(function(i) {
                            return toJson(i, true);
                        }).join(',') + ']'
                    } else {
                        return '{' + Object.keys(o).sort().map(function(i) {
                            var value = toJson(o[i]);
                            return value === undefined ? value : [JSON.stringify(i), value].join(':');
                        }).filter(function(i) {
                            return i !== undefined;
                        }).join(',') + '}';
                    }
                }
            case 'boolean':
            case 'number':
            case 'string':
                return JSON.stringify(o);
            default:
                return inArray ? 'null' : undefined;
        }
    };

    plugin.preload = function(done) {
        //cascading dynamic value resolver.
        var resolveValue = function(value, context) {
            return (value instanceof Function && value.bind(this)(context)) || value;
        }.bind(this);

        var recType = this.options.alp.recType;
        var recParams = this.options.alp.recParams;
        var recCallback = this.options.alp.recCallback;
        var gameUri = this.options.alp.gameUri; //TODO: function passing in springroll_game_id and returning game_uri
        var eventOverride = this.options.alp.eventOverride;
        var specDict = this.learning.catalog.events || {};
        KidaptiveSdk.init(this.options.alp.apiKey, this.options.alp.version).then(function(sdk) {
            var state = {}; //can be used to keep track of state information to inform reommendation or event tracking
            this.alpPlugin = {
                sdk: sdk,
                getRecommendation: function(context) { //recommendations
                    var type = JSON.parse(JSON.stringify(resolveValue(recType, context) || 'optimalDifficulty'));
                    var params = JSON.parse(JSON.stringify(resolveValue(recParams, context) || {}));
                    params.learnerId = sdk.getLearnerList()[0].id;
                    params.gameUri = gameUri;
                    var rec;
                    switch(type) {
                        case 'random':
                            rec = sdk.recommendRandomPrompts(params.gameUri, params.localDimensionUri, params.numResults);
                            break;
                        case 'optimalDifficulty':
                            rec = sdk.recommendOptimalDifficultyPrompts(
                                params.learnerId,
                                params.gameUri,
                                params.localDimensionUri,
                                params.numResults,
                                params.successProbability
                            );
                            break;
                        default:
                            rec = sdk.provideRecommendation(type, params);
                    }
                    return recCallback ? recCallback.bind(this)(rec, context) : rec;
                }.bind(this),

                //functions for getting and setting state information.
                getState: function() {
                    return JSON.parse(JSON.stringify(state));
                },
                setState: function(newState) {
                    //delete keys marked undefined
                    Object.keys(newState).forEach(function(key) {
                        if (newState[key] === undefined) {
                            delete state[key];
                        }
                    });
                    //merge new state
                    newState = JSON.parse(JSON.stringify(newState));
                    Object.keys(newState).forEach(function(key) {
                        state[key] = newState[key];
                    });
                }
            };

            //if Learning Module exists, turn learningEvents into behavior events
            if (this.learning) {
                //the default event converter
                var pluginDefault = function(data) {
                    if (!sdk.getCurrentUser()) {
                        return;
                    }

                    var eventName = specDict[data.event_data.event_code] || 'Springroll Event';
                    var additionalFields = JSON.parse(JSON.stringify(data.event_data));
                    var args = {additionalFields: additionalFields};
                    args.gameUri = gameUri;
                    args.learnerId = sdk.getLearnerList()[0].id;
                    for (var k in additionalFields) {
                        if (k === 'duration' && typeof(additionalFields[k]) === 'number') {
                            args[k] = additionalFields[k] / 1000; //learningEvents report duration in milliseconds
                            delete additionalFields[k];
                        } else if (additionalFields[k] instanceof Object) {
                            additionalFields[k] = toJson(additionalFields[k]); //turn nested objects into json
                        } else {
                            additionalFields[k] = additionalFields[k].toString();
                        }
                    }
                    additionalFields.springroll_game_id = data.game_id;
                    additionalFields.springroll_event_id = data.event_id;
                    additionalFields.springroll_event_code = additionalFields.event_code;
                    delete additionalFields.event_code;
                    sdk.reportBehavior(eventName,args);
                };
                var override = eventOverride || pluginDefault;
                this.learning.on("learningEvent", function(data) {
                    override.bind(this)(data, pluginDefault);
                }.bind(this));
            }

            done();
        }.bind(this));
    };

    plugin.teardown = function() {
        this.alpPlugin.sdk.flushEvents().catch(function(){}).then(function() {
            this.alpPlugin.sdk.stopAutoFlush();
            this.alpPlugin = undefined;
        }.bind(this));
    }
}());
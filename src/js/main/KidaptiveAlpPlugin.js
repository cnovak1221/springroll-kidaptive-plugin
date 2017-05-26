/**
 * Created by solomonliu on 11/29/16.
 */
(function() {
    "use strict";
    var plugin = new springroll.ApplicationPlugin();

    //cascading dynamic value resolver.
    var resolveValue = function(value, context) {
        return (value instanceof Function && value.apply(undefined, context)) || value;
    };

    plugin.preload = function(done) {
        var defaultRecType = this.options.alp.defaultRecType;
        var defaultRecParams = this.options.alp.defaultRecParams;
        var defaultRecCallback = this.options.alp.defaultRecCallback;
        var gameUri = this.options.alp.gameUri;
        var eventOverride = this.options.alp.eventOverride;
        var specDict = this.config.specDictionary;
        KidaptiveSdk.init(this.options.alp.appSecret, this.options.alp.version).then(function(sdk) {
            this.alpPlugin.sdk = sdk;

            //recommendations
            this.alpPlugin.getRecommendation = function(context) {
                var type = resolveValue(defaultRecType, context) || 'optimalDifficulty';
                var params = resolveValue(defaultRecParams, context) || {};
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
                return defaultRecCallback ? defaultRecCallback(rec, context) : rec;
            };

            //if Learning Module exists, turn learningEvents into behavior events
            if (this.learning) {
                var pluginDefault = function(data) {
                    if (!sdk.getCurrentUser()) {
                        return;
                    }
                    var eventName = specDict[data.event_data.event_code];
                    var additionalFields = JSON.parse(JSON.stringify(data.event_data));
                    var args = {additionalFields: additionalFields};
                    args.gameUri = gameUri;
                    for (var k in additionalFields) {
                        if (k == 'duration' && typeof(additionalFields[k]) == 'number') {
                            args[k] = additionalFields[k] / 1000; //learningEvents report duration in milliseconds
                            delete additionalFields[k];
                        } else if (additionalFields[k] instanceof Object) {
                            additionalFields[k] = JSON.stringify(additionalFields[k]); //turn nested objects into json
                        }
                    }
                    additionalFields.game_id = data.game_id;
                    additionalFields.event_id = data.event_id;
                    sdk.reportBehavior(eventName,args);
                };
                var override = eventOverride || pluginDefault;
                var state = {};
                this.learning.on("learningEvent", function(data) {
                    override(data, state, pluginDefault);
                });
            }
            done();
        }.bind(this));
    };
}());
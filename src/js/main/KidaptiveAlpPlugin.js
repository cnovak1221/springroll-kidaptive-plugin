/**
 * Created by solomonliu on 11/29/16.
 */
(function() {
    "use strict";
    var plugin = new springroll.ApplicationPlugin();

    plugin.preload = function(done) {
        KidaptiveSdk.init(this.options.alp.appSecret, this.options.alp.version).then(function(sdk) {
            this.alpPlugin.sdk = sdk;
            //if Learning Module exists, turn learningEvents into behavior events
            if (this.learning) {
                this.learning.on("learningEvent", function(data) {
                    if (!this.alpPlugin.sdk.getCurrentUser()) {
                        return;
                    }
                    var eventName = this.learning.catalog.events[data.event_data.event_code];
                    var additionalFields = JSON.parse(JSON.stringify(data.event_data));
                    var args = {additionalFields: additionalFields};
                    args.gameUri = this.options.alp.gameUri;
                    for (var k in additionalFields) {
                        if (k == 'duration' && typeof(additionalFields[k]) === 'number') {
                            args[k] = additionalFields[k] / 1000; //learningEvents report duration in milliseconds
                            delete additionalFields[k];
                        } else if (additionalFields[k] instanceof Object) {
                            additionalFields[k] = JSON.stringify(additionalFields[k]); //turn nested objects into json
                        }
                    }
                    additionalFields.game_id = data.game_id;
                    additionalFields.event_id = data.event_id;
                    this.alpPlugin.sdk.reportBehavior(eventName,args);
                }.bind(this));
            }
            done();
        }.bind(this));
    };
}());
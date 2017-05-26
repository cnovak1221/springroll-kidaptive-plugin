#Kidaptive ALP SpringRoll Plugin

##Installation
`bower install springroll-kidaptive-plugin`

##Usage
Add libraries and dependencies to your HTML file
```html
<script src="bower_components/preloadjs/lib/preloadjs.min.js"></script>
<script src="bower_components/bind-polyfill/index.js"></script>
<script src="bower_components/bellhop/dist/bellhop.min.js"></script>
<script src="bower_components/springroll/dist/core.min.js"></script>
<script src="bower_components/jquery/dist/jquery.min.js"></script>
<script src="bower_components/springroll-pbskids/dist/modules/learning.min.js"></script>
<script src="bower_components/kidaptive-sdk-js/dist/kidaptive_sdk.min.js"></script>
<script src="bower_components/springroll-kidaptive-plugin/dist/kidaptive_alp_plugin.min.js"></script>
```
###Initializing plugin
Include the ALP app secret and version information in the application options
```javascript
var Application = include('springroll.Application');
var app = new Application({
    configPath:"config.json",
    alp: {
        appSecret:"APP_SECRET",
        version:{
            version:"APP_VERSION",
            build:"APP_BUILD"
        },
        gameUri:"GAME_URI"
    }
});
```

`app.alpPlugin.sdk` will be a reference to a [KidaptiveSDK](https://github.com/Kidapt/kidaptive-sdk-js/wiki/API-Reference#kidaptivesdk-interface) object.
Below is a summary of common tasks in the alp module. Full SDK documentation can be found [here](https://github.com/Kidapt/kidaptive-sdk-js/wiki).

###User and Learner Management
This section is only relevant until user/learner management has been integrated into SpringRoll.

####Creating a user
`nickname` is optional.
```javascript
app.alpPlugin.sdk.createUser(email, password, nickname).then(function(user) {
    //success callback
});
```

####Login user
```javascript
app.alpPlugin.sdk.loginUser(email, password).then(function(user) {
    //success callback
});
```

####Modify user
Both properties in the input Object are optional. Only included properties will be changed.
```javascript
app.alpPlugin.sdk.updateUser({nickname:string, password:string}).then(function(user) {
    //success callback
});
```

####Delete current user
```javascript
app.alpPlugin.sdk.deleteUser().then(function(user) {
    //success callback
});
```

####Creating a learner
`birthday` and `gender` are optional. `birthday` is a JS Date object. `gender` can be `"male"`, `"female"`, or `"decline"` and defaults to `"decline"`
```javascript
app.alpPlugin.sdk.createLearner(name, birthday, gender).then(function(learner) {
    //success callback
});
```

####Modifying a learner
All properties in the second parameter are optional. Only included parameters will be changed.
```javascript
app.alpPlugin.sdk.updateLearner(learnerId, {name:string, birthday:Date, gender:string}).then(function(learner) {
    //success callback
});
```

####Deleting a learner
```javascript
app.alpPlugin.sdk.deleteLearner(learnerId).then(function(learner) {
    //success callback
});
```


####List learners
```javascript
app.alpPlugin.sdk.getLearnerList();
```

###Reporting Behavior
All learningEvents reported through the learning plugin will also automatically be reported to ALP as behavior event.
Additionally, behavior events can also be reported using the `app.alpPlugin.sdk` component directly. All properties in the second parameter are optional.
`duration` is in seconds. `additionalFields` and `tags` are key-value pairs of strings.
```javascript
app.alpPlugin.sdk.reportBehavior(eventName, {learnerId:number, gameUri:string, promptUri:string, duration:number, additionalFields:{}, tags:{}})
```

###Reporting Evidence

####Trials
Trials are used to control the weight of prior information when calculating learner ability estimates. Starting a new trial
indicates that the learner's current ability may have changed and that the estimate may not be accurate.
This causes new evidence to be weighted more to adjust to the new ability.
Trials starts and ends generally correspond to game starts and ends, but we defer to the developer to decide the trial boundaries
```javascript
//starts a trial. closes previous trial for this learner
app.alpPlugin.sdk.startTrial(learnerId);

//ends a trial
app.alpPlugin.sdk.closeTrial(learnerId);
```

####Evidence
Used for reporting measurable outcomes. A trial must be open for the specified learner before reporting evidence.
 All properties in the last parameter are optional. `outcome` is a number between 0 and 1.
`duration` is in seconds. `promptAnswers`, `additionalFields`, and `tags` are key-value pairs of strings.
```javascript
var attempts = [];
attempts.push({
    itemURI:string,
    outcome:number
});
app.alpPlugin.sdk.reportEvidence(eventName, learnerId, promptUri, attempts, {duration:number, promptAnswers:{}, additionalFields:{}, tags:{}});
```

###Prompt Recommendations
`localDimensionUri`, `numResults`, and `successProbability` are optional. `numResults` defaults to 10. `successProbability` defaults to 0.7.
```javascript
var recs = app.alpPlugin.sdk.recommendOptimalDifficultyPrompts(learnerId, gameUri, localDimensionUri, numResults, successProbability);
recs = app.alpPlugin.sdk.recommendRandomPrompts(gameUri,localDimensionUri, numResults);
//recs.recommendations contains a list of up to numResults promptUris
```
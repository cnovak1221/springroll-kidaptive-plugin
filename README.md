# Kidaptive ALP SpringRoll Plugin

* [Installation](#installation)
* [Loading Dependencies](#loading-dependencies)
* [Initializing The Plugin](#initializing-the-plugin)
  * [ALP Initialization Parameters](#alp-initialization-parameters)
  * [ALP Initialization Options](#alp-initialization-options)
* [Learning Module](#learning-module)
* [Plugin Helper](#plugin-helper)
* [Plugin Methods](#plugin-methods)
* [Event Processing](#event-processing)
  * [Default learningEvent Processing](#default-learningevent-processing)
  * [Special learningEvent event_data Properties](#special-learningevent-event_data-properties)
* [Users](#users)
  * [Anonymous Users](#anonymous-users)
  * [User Sessions](#user-sessions)
  * [OpenID](#openid)
  * [User and Learner Management](#user-and-learner-management)

## Installation

`bower install springroll-kidaptive-plugin`

## Loading Dependencies

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

## Initializing The Plugin

Include the ALP api key and version information in the application options

```javascript
var Application = include('springroll.Application');
var app = new Application({
    configPath:"config.json",
    alp:{
        apiKey:"apiKey",
        version:{
            version:"APP_VERSION",
            build:"APP_BUILD"
        },
        options:{
            //available alp options listed below
        },
        gameUri:"GAME_URI"
    }
});
```

The properties defined in the alp object during the application initialization will be merged and override any alp parameters provided in the config file defined by `configPath`

`app.alpPlugin.sdk` will be a reference to a KidaptiveSdk object. 

### ALP Initialization Parameters

Parameter | Type | Required | Description
--- | --- | --- | ---
apiKey | string | true | The apiKey required by the Kidaptive API to recognize the app.
version | object | false | An object containning the `version` and `build` defined with string values.
options | object | false | An object containing `ALP Initialization Options` to be sent to Kidaptive SDK during initialization. These options are listed out in the [ALP Initialization Options section](#alp-initialization-options).
gameUri | string | true | This is used by the plugin to identify the specific game when handling events and getting recommendations.
eventOverride | function | false | This overrides the default learningEvent behavior. Read more about this behavior in the [Plugin Helper section](#plugin-helper).
recCallback | function | false | Callback function when requesting a recommendation. Read more about this behavior in the [Plugin Helper section](#plugin-helper).
recParams | function | false | An object or function returning an object containing the default parameters sent to Kidaptive SDK when requesting a recommendation. Read more about this behavior in the [Plugin Helper section](#plugin-helper).
recType | string | false | A string or function returning a string of the recommendation type. Read more about this behavior in the [Plugin Helper section](#plugin-helper).

### ALP Initialization Options

These parameters go into the options object inside the alp configuration object.

Option | Type | Default | Description
--- | --- | --- | ---
noOidc | bool | false | Disable Open ID Connect and use email/password to login with Kidaptive.
dev | bool | false | Determines if the dev or prod endpoint will be used for Kidaptive ALP communication.
flushInterval | number | 60000 | The interval in milliseconds that the events should be flushed.
autoFlushCallbacks | array or function | | A callback function or an array of callback functions to be called with results of event flush.
defaultHttpCache | object | | The metadata export object provided by Kidaptive to support offline initialzation.

## Learning Module

One of the primary purposes of this plugin is to allow the developer to send events to this learning module. This plugin will translate those learning module events into Kidaptive ALP events.

For more information about the learning module: [Learning Module Documentation](https://github.com/SpringRoll/SpringRoll/wiki/Learning-Module)

## Plugin Helper

The plugin helper is responsible for defining an `eventOverrid`, `recType`, `recParams`, and `recCallback`. This extends the default functionality of the plugin.

If no helper is provided, all events are reported as behavior events. All data will be generalized under the `additionalFields` property.

#### eventOverride

A function that overrides the default plugin behavior for handling events.

```javascript
var eventOverride = function(event, pluginDefault){
    console.log(event.event_data);
    //call pluginDefault to use default functionality for specific events
    pluginDefault(event);
}
```

#### recCallback

A callback function that is called when a recommendation is requested using the [getRecommendation](#getrecommendation) method. 

```javascript
var recCallback = function(rec, context){
    console.log(rec.recommendations);
    console.log(context);
    //logic to manipulate recommendations that will be returned to [getRecommendation](#getrecommendation) method
    return rec.recommendations;
}
```

#### recParams

An object or function returning an object containing the default parameters sent to Kidaptive SDK when requesting a recommendation using the [getRecommendation](#getrecommendation) method. The properties `learnerId` and `game` are added onto this resulting object before sending the request to the Kidaptive SDK.

```javascript
var recParams = function(context){
    //logic would go here to generate dynamic parameters
    return {
        numResults:number,
        'local-dimension':string,
        successProbability:number,
        prompt:array
    }
}
```

Properties `local-dimension`, `numResults`, `prompt` and `successProbability` are optional. Property `numResults` defaults to 10. Property `successProbability` defaults to 0.7.

#### recType

An object or function returning a string of the recommendation type when using the [getRecommendation](#getrecommendation) method. The resulting values accepted by the plugin are `"random"`, and `"optimalDifficulty"`. Any other value will be passed through to the Kidaptive SDK getRecommendations method. 

```javascript
var recType = function(context){
    //logic would go here to generate dynamic recommendation type
    return "random";
}
```

#### Trials

Trials are used to control the weight of prior information when calculating learner ability estimates. Starting a new trial indicates that the learner's current ability may have changed and that the estimate may not be accurate.

This causes new evidence to be weighted more to adjust to the new ability.

Trials starts and ends generally correspond to game starts and ends, but we defer to the developer to decide the trial boundaries.

```javascript
//starts a trial. closes previous trial for this learner
app.alpPlugin.sdk.startTrial(learnerId);

//ends a trial
app.alpPlugin.sdk.endTrial(learnerId);

//ends all trials
app.alpPlugin.sdk.endAllTrial();
```

#### Evidence

Used for reporting measurable outcomes. A trial must be open for the specified learner before reporting evidence.

```javascript
var attempts = [];
attempts.push({
    itemURI:string,
    outcome:number,
    guessingParameter:number
});
app.alpPlugin.sdk.reportEvidence(eventName, {learnerId:number, gameUri:string, promptUri:string, attempts:array, duration:number, promptAnswers:{}, additionalFields:{}, tags:{}});
```

Properties `attempts`, `duration`, `promptAnswers`, `additionalFields`, and `tags` are optional.

Property `outcome` is a number between 0 and 1. Property `duration` is in seconds. Properties `promptAnswers`, `additionalFields`, and `tags` are key-value pairs of strings.

#### Reporting Behavior

All learningEvents reported through the learning plugin will also automatically be reported to ALP as behavior event.

Additionally, behavior events can also be reported using the `app.alpPlugin.sdk` component directly. All properties in the `properties` variable are optional.

```javascript
var properties = {learnerId:number, gameUri:string, promptUri:string, duration:number, additionalFields:{}, tags:{}};
app.alpPlugin.sdk.reportBehavior(eventName, properties);
```

Property `duration` is in seconds. Properties `additionalFields` and `tags` are key-value pairs of strings.

## Plugin Methods

#### setState

State is used in the plugin to keep track of data which needs to be accessed in the plugin and the helper when processing events. State is reset when a user logs out, fails to authenticate, or if their userId has changed during authentication. 

The `setState` method takes a `newState` property which is an object with key:value pairs. The `newState` object is merged with the existing state object, so values will be retained for keys not provided in the `newState` object. If the `newState` object has a key with an explicit undefined value provided, that key/value pair will be deleted from state object.

```javascript
var newState = {
    addMe:"New Value",
    updateMe:"New Value",
    removeMe:undefined
};
app.alpPlugin.setState(newState);
```

#### getState

The `getState` method returns the current state object that is stored in the plugin. By default this will be an empty object.

```javascript
var state = app.alpPlugin.getState();
console.log(state.someProperty);
```

#### getInitParams

This method provides an object containing the parameters that the alp plugin was initialized with. The properties defined in the alp object during the application initialization will be merged and override any alp parameters provided in the config file defined by `configPath`

```javascript
var initParams = app.alpPlugin.getInitParams();
console.log(initParams);
```

#### getRecommendation

The type of recommendation used is defined by the [recType](#rectype) parameter. If no `recType` is defined, then the plugin will fall back on the default `"optimalDifficulty"` recommendation.

The parameters sent along with the recommendation request are defined by the [recParams](#recparams) parameter. By default a `learnerId` and `game` parameter are automatically added to all requests when using the `getRecommendation` plugin method.

If [recCallback](#reccallback) is defined the result of the `recCallback` function call is returned. Otherwise the recommendation is returned.

## Event Processing

### Default `learningEvent` Processing

When a learning module is present there is default behavior supplied for converting learningEvents into behavior events. If an eventOverride function is provided it will replace this default behavior. The default behavior is as follows.

The properties `gameUri`, `learnerId`, and `additionalFields` are arguments sent to the KidaptiveSDK to report behavior. 

This information is sent along with the event name which is looked up from the `events` object in learning module. If the event is not found, the event name will default to "Springroll Event"

The `additionalFields` argument is copied from the `event_data` object. All `additionalFields` that are not already of type string will be converted to a string. Objects are converted to a string using an internal function that relies on JSON.stringify. The exceptions to this rule are listed [below](#special-learningevent-event_data-properties).

### Special `learningEvent` `event_data` Properties

Property | Description
--- | ---
duration | Expected to be a number in milliseconds. If this is a number the SDK will divide this by 1000 to convert from milliseconds to seconds.
springroll_game_id | This is set by the `game_id` property on the root object
springroll_event_id | This is set by the `event_id` property on the root object 
springroll_event_code | This is set by the `event_code` property in `event_data` object. The original property `event_code` is deleted from the `additionalFields` object before being passed to the Kidaptive SDK.

## Users

### Anonymous Users

The plugin automatically creates a local `anonymous user` if no user is logged in and no `anonymous user` has been created yet. This `anonymous user` is stored locally and there is no record of this user on the Kidaptive backend.

### User Sessions

When a user is created or logged in the SDK will attempt to store the user's auth token in local storage. It will attempt to use that auth token to make subsequent requests until the token expires or the user logs out. Upon SDK initialization the SDK will attempt to refresh the user's information using the stored auth token. If the auth token is invalid or expired the SDK will log the user out.

### OpenID

If OpenID is enabled, the login process is handled outside of the Kidaptive SDK. A cookie will be established between the client and the Kidaptive backend during the OpenID login process. This cookie will be used by the Kidaptive SDK to authenticate user requests.

### User and Learner Management

This section is only relevant until user/learner management has been integrated into SpringRoll.

#### Creating a User

```javascript
app.alpPlugin.sdk.createUser({email:string, password:string, nickname:string, deviceId:string}).then(function(user) {
    //success callback
});
```

Properties `nickname` and `deviceId` are optional.

#### User Login

```javascript
app.alpPlugin.sdk.loginUser({email:string, password:string}).then(function(user) {
    //success callback
});
```

#### Get Current User

```javascript
var currentUser = app.alpPlugin.sdk.getCurrentUser();
console.log(currentUser);
````

#### Refresh User

```javascript
app.alpPlugin.sdk.refresh().then(function() {
    //success callback
});
```

#### Modify User

```javascript
app.alpPlugin.sdk.updateUser({nickname:string, deviceId:string, password:string}).then(function(user) {
    //success callback
});
```

All properties in the input object are optional. Only included properties will be changed.

#### User Logout

```javascript
app.alpPlugin.sdk.logoutUser().then(function(user) {
    //success callback
});
```

#### Creating a Learner

```javascript
app.alpPlugin.sdk.createLearner({name:string, birthday:date, gender:string, icon:string}).then(function(learner) {
    //success callback
});
```

Properties `birthday`, `gender`, and `icon` are optional. Property `birthday` is a JS Date object. Property `gender` can be `"male"`, `"female"`, or `"decline"` and defaults to `"decline"`

#### Modifying a Learner

```javascript
var learnerUpdates = {name:string, birthday:Date, gender:string, icon:string};
app.alpPlugin.sdk.updateLearner(learnerId, learnerUpdates).then(function(learner) {
    //success callback
});
```

All properties in the `learnerUpdates` variable are optional. Only included properties will be changed.

#### Deleting a Learner

```javascript
app.alpPlugin.sdk.deleteLearner(learnerId).then(function(learner) {
    //success callback
});
```

#### Get Learner by ID

```javascript
var learner = app.alpPlugin.sdk.getLearnerById(learnerId);
```

#### Get Learner by Provider ID

```javascript
var learner = app.alpPlugin.sdk.getLearnerByProviderId(providerId);
```

#### List Learners

```javascript
var learnerList = app.alpPlugin.sdk.getLearnerList();
```

var userSession
chrome.storage.sync.get('userSession', function(data){
    userSession = data.userSession
})

function createURL(params) {
    params = prepareParams(params);
    var query = '?';
    for (var key in params) {
        query += encodeURI(key)+'='+encodeURI(params[key])+'&';
    }
    if (query.slice(-1) === '&') {
        query = query.slice(0, -1)
    }
    return baseURL + query;
}
function prepareParams(params) {
    var chain = '',
        newParams = {};
    params.sort(function(a, b){
        if(a[0] < b[0]) return -1;
        if(a[0] > b[0]) return 1;
        return 0;
    });
    for (var i=0;i<params.length;i++) {
        chain += params[i][0]+''+params[i][1];
        newParams[params[i][0]] = params[i][1];
    }
    newParams['api_sig'] = MD5(chain+apiSecret);
    newParams['format'] = 'json';
    return newParams;
}
localStorage.lastAlarmTime = 0;
chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg === 'start-party') {
        for (var i = 0; i <= 9; i++) {
            startAlarm(1+0.1*i);
        }
    } else if (msg === 'stop-party') {
        chrome.alarms.clearAll();
    }
});
function startAlarm(min) {
    var next = (Date.now() + min*60000);
    var temp = parseInt(localStorage.lastAlarmTime, 10);
    if (next < temp+6000) {
        next = temp+6000;
    }
    localStorage.lastAlarmTime = next;
    chrome.alarms.create('al_'+next,{when:next});
    if (localStorage.processAlarmCount < 9) {
        localStorage.processAlarmCount++;
    } else {
        chrome.browserAction.setIcon({
            path: 'icon_party.png'
        }, function (){});
        $.ajax({
            url: createURL([
                    ['method','user.getrecenttracks'],
                    ['api_key',apiKey],
                    ['user',localStorage.partyID]
                ]),
            dataType: "json",
            success: function(data) {
                try {
                    if (!data.error) {
                        if (data.recenttracks.track.length > 1) {
                            var isPlaying = false;
                            if (data.recenttracks.track[0].hasOwnProperty('@attr')) {
                                isPlaying = true;
                            }
                            if (localStorage.lastTime == 0) {
                                localStorage.lastTime = data.recenttracks.track[isPlaying?1:0].date.uts;
                                localStorage.startTime = localStorage.lastTime;
                            } else if (data.recenttracks.track[isPlaying?1:0].date.uts > parseInt(localStorage.lastTime, 10)) {
                                localStorage.lastTime = data.recenttracks.track[isPlaying?1:0].date.uts;
                                localStorage.partyLengthCounter = 1 + parseInt(localStorage.partyLengthCounter, 10);
                                //scrobble
                                if (false === (localStorage['sett-disable-scrobble'] === 'true')) {
                                    console.log('Scrobble: '+data.recenttracks.track[isPlaying?1:0].artist['#text']+' - '+data.recenttracks.track[isPlaying?1:0].name);
                                    $.post(baseURL,prepareParams([
                                        ['method','track.scrobble'],
                                        ['api_key',apiKey],
                                        ['artist[0]',data.recenttracks.track[isPlaying?1:0].artist['#text']],
                                        ['track[0]',data.recenttracks.track[isPlaying?1:0].name],
                                        ['album[0]',data.recenttracks.track[isPlaying?1:0].album['#text']],
                                        ['timestamp[0]',localStorage.lastTime],
                                        ['chosenByUser[0]',0],
                                        ['sk',userSession]
                                    ]), function(data) {});
                                }
                            }
                            var imgSrc = '';
                            if (isPlaying && data.recenttracks.track[0].mbid !== localStorage.nowPlayingId) {
                                localStorage.nowPlayingId = data.recenttracks.track[0].mbid;
                                //now playing
                                if (false === (localStorage['sett-disable-scrobble'] === 'true')) {
                                    $.post(baseURL,prepareParams([
                                        ['method','track.updateNowPlaying'],
                                        ['api_key',apiKey],
                                        ['artist',data.recenttracks.track[0].artist['#text']],
                                        ['track',data.recenttracks.track[0].name],
                                        ['album',data.recenttracks.track[0].album['#text']],
                                        ['duration',300],
                                        ['sk',userSession]
                                    ]), function(data) {});
                                }
                                console.log('Now playing: '+data.recenttracks.track[0].artist['#text']+' - '+data.recenttracks.track[0].name);
                                chrome.runtime.sendMessage('update-party-playlist');
                                if (localStorage['sett-show-notifications'] === "true") {
                                    $.each(data.recenttracks.track[0].image,function(key,val){
                                        imgSrc = val['#text'];
                                        if (val['size'] === 'large') {
                                            return false;
                                        }
                                    });
                                    if (!imgSrc) {
                                        imgSrc = 'track_cover.png';
                                    }
                                    localStorage.notificationLink = data.recenttracks.track[0].url;
                                    chrome.notifications.clear('now-playing',function(){});
                                    chrome.notifications.create('now-playing', {
                                            type: 'basic',
                                            title: 'Now playing:',
                                            message: data.recenttracks.track[0].artist['#text']+' - '+data.recenttracks.track[0].name,
                                            iconUrl: imgSrc
                                        }, function(id) {
                                            if (chrome.runtime.lastError) {
                                                console.log("Create notification error:", chrome.runtime.lastError);
                                            }
                                        });
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
        });
    }
}
chrome.alarms.onAlarm.addListener(function() {
    startAlarm(1);
});
chrome.notifications.onClicked.addListener(function(id){
    window.open(localStorage.notificationLink,'_blank');
});
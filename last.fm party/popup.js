//analytics start
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-52555251-2']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://stats.g.doubleclick.net/dc.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
//analytics end

var lastFm_apiKey = 'a54aae94377c86e67aec869bc86bc7dc',
    lastFm_apiSecret = 'adbd7553cb5cb702f456fb7d63f79af8',
    $views = $('#views .view'),
    $liveButtons = $('.live-buttons'),
    $buttons = $('.button'),
    $userAdd = $('#user-add'),
    $userAddName = $('#user-name'),
    $usersView = $('#users'),
    $usersList = $('#users .list'),
    $settCheck = $('.sett-check'),
    $settText = $('.sett-text'),
    $userInfo = $('#party .user-info'),
    $tracksInfo = $('#party .tracks-info'),
    $userAddError = $('#users .user-add-error'),
    $partyInfoText = $('#party .info-text'),
    $socialFacebook = $('#social_facebook');
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
function isEmpty(el){
    return !$.trim(el.html());
}
function getJSONFromStorage(name) {
    try {
        var data = JSON.parse(localStorage[name]);
        return data?data:[];
    } catch (e) {
        return [];
    }
}
function action(name,param,param2) {
    switch (name) {
        case 'view':
            _gaq.push(['_trackEvent', 'view', param, localStorage.userName]);
            $views.addClass('intro');
            setTimeout(function(){
                $views.removeClass('intro');
            },50);
            $views.each(function(){
                var $this = $(this);
                $this.toggleClass('show',$this.data('name') === param);
            });
            if (param === 'users') {
                $usersList.empty();
                var data = getJSONFromStorage('users');
                if (data.length === 0) {
                    $.getJSON(createURL([
                            ['method','user.getFriends'],
                            ['api_key',apiKey],
                            ['user',localStorage.userName]
                        ]), function(data) {
                        if (!data.error) {
                            if (data.friends.user.length === 0) {
                                userAddError('Search for your friends.');
                            } else {
                                $.each(data.friends.user,function(key,val){
                                    $userAddName.val(val.name);
                                    $userAdd.submit();
                                    $userAddName.val('');
                                    userAddError('');
                                });
                            }
                        }
                    });
                } else {
                    $.each(data,function(key,val){
                        addUserToList(val.name,val.realname,val.imageurl);
                    });
                    addUserToListRunIntro(true);
                }
                $userAddName.focus();
                chrome.browserAction.setIcon({
                    path: 'icon.png'
                }, function (){});
                updateNowListeningUsers();
            } else if (param === 'party') {
                chrome.browserAction.setIcon({
                    path: 'icon_party.png'
                }, function (){});
                showPartyDetail();
            } else if (param === 'settings') {
                if (isEmpty($socialFacebook)) {
                    $socialFacebook.append('<iframe src="https://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fwww.facebook.com%2Flast.fm.party&amp;width&amp;layout=button_count&amp;action=like&amp;show_faces=true&amp;share=false&amp;height=21&amp;appId=737290722994545" scrolling="no" frameborder="0" style="border:none; overflow:hidden; height:21px;" allowTransparency="true" width="100%"></iframe>');
                }
            }
            break;
        case 'removeuser':
            $usersList.children('.user').each(function(key){
                var $this = $(this);
                if ($this.data('name') == param) {
                    $this.remove();
                    updateUsersStorage();
                    return false;
                }
            });
            break;
        case 'leavesettings':
            for (var key in localStorage) {
                if (key.substr(0,5) === 'sett-') {
                    _gaq.push(['_trackEvent', key.substr(5), localStorage[key], localStorage.userName]);
                }
            }
            if (localStorage.partyID) {
                action('view','party');
            } else {
                action('view','users');
            }
            break;
        case 'startparty':
            _gaq.push(['_trackEvent', 'party-start', param, localStorage.userName]);
            localStorage.processAlarmCount = 0;
            localStorage.lastTime = 0;
            localStorage.startTime = -1;
            localStorage.nowPlayingId = 'none';
            chrome.runtime.sendMessage('start-party');
            localStorage.partyID = param;
            $userAddName.val(param);
            $userAdd.submit();
            localStorage.partyLengthCounter = 0;
            action('view','party');
            break;
        case 'leaveparty':
            _gaq.push(['_trackEvent', 'party-stop', localStorage.partyLengthCounter, localStorage.userName]);
            chrome.runtime.sendMessage('stop-party');
            localStorage.removeItem('partyID');
            action('view','users');
            break;
        case 'logout':
            _gaq.push(['_trackEvent', 'logout', '-', localStorage.userName]);
            if (localStorage.partyID) {
                chrome.runtime.sendMessage('stop-party');
            }
            chrome.storage.sync.remove('userSession', function(){
                $.each(localStorage,function(key,val){
                    localStorage.removeItem(key);
                });
                action('view','logout');
            })
            break;
        case 'login':
            _gaq.push(['_trackEvent', 'login', '-', localStorage.userName]);
            window.open('http://www.last.fm/api/auth/?api_key='+lastFm_apiKey+'&cb='+encodeURI(window.location.origin+'/callback.html'),'_blank');
            break;
        default:
            alert(name + ' - ' + param);
    }
}

chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg === 'update-party-playlist') {
        updateTracks();
    }
});
$liveButtons.on('click','.button',function(e){
    e.preventDefault();
    buttonPress($(this));
});
$buttons.on('click',function(e){
    e.preventDefault();
    buttonPress($(this));
});
function buttonPress($this) {
    if (!$this.hasClass('blocked')) {
        var actions = $this.data('action').split(';');
        $.each(actions,function(key,val){
            var data = val.split('-');
            action(data[0],data[1]);
        });
    }
}

function showPartyDetail() {
    $userInfo.text('Loading ...');
    $.getJSON(createURL([
            ['method','user.getInfo'],
            ['api_key',apiKey],
            ['user',localStorage.partyID]
        ]), function(data) {
        if (data.error) {
            $userInfo.text('Something went wrong.');
        } else {
            $userInfo.empty();
            var imgSrc,
                name = data.user.realname;
            $.each(data.user.image,function(key,val){
                imgSrc = val['#text'];
                if (val['size'] === 'extralarge') {
                    return false;
                }
            });
            var html = '<a href="http://www.last.fm/user/'+data.user.name+'" target="_blank">';
            if (imgSrc) {
                html += '<img src="'+imgSrc+'">';
            }
            if (!name) {
                name = data.user.name;
            }
            html += '<div class="name"><div>'+name+'</div><div class="counter"><span class="counter-text" title="Songs played in the party"></span></div></div>'+(false === (localStorage['sett-disable-scrobble'] === 'true')?'':'<div class="disabled-scrobbling" title="The tracks won\'t be scrobbled to your profile.">?</div>')+'</a>';
            $userInfo.append(html);
        }
    })
    .fail(function() {
        $userInfo.text('Something went wrong.');
    });
    $tracksInfo.empty();
    updateTracks();
}
function updateTracks() {
    var startAfter = parseInt(localStorage.startTime, 10);
    if (startAfter !== -1 && !isNaN(startAfter)) {
        $.getJSON(createURL([
                ['method','user.getrecenttracks'],
                ['api_key',apiKey],
                ['user',localStorage.partyID]
            ]), function(data) {
            if (!data.error) {
                $tracksInfo.empty();
                if (parseInt(localStorage.partyLengthCounter, 10) !== 0) {
                    $userInfo.find('.counter-text').text(localStorage.partyLengthCounter);
                }
                var count = 0,
                    limit = localStorage['sett-history-length']?parseInt(localStorage['sett-history-length'], 10):5;
                $.each(data.recenttracks.track,function(key,val){
                    if (++count > limit) {
                        return false;
                    }
                    if (val['@attr'] || val.date.uts > startAfter) {
                        var imgSrc = false;
                        $.each(val.image,function(keyx,valx){
                            if ((val['@attr'] && valx['size'] === 'medium') || (!val['@attr'] && valx['size'] === 'small')) {
                                imgSrc = valx['#text'];
                                return false;
                            }
                        });
                        var html = '<a href="'+val.url+'" target="_blank" class="'+(val['@attr']?'now-playing':'')+'">';
                        if (imgSrc) {
                            html += '<img src="'+imgSrc+'" width="'+(val['@attr']?'64':'34')+'" height="'+(val['@attr']?'64':'34')+'">';
                        }
                        html += '<div class="artist">'+val.artist['#text'] + '</div><div class="track">' + val.name+'</div>';
                        html += '</a>';
                        $tracksInfo.append(html);
                    }
                });
            }
        });
    }
    $partyInfoText.empty();
    setTimeout(function(){
        if (isEmpty($tracksInfo)) {
            $partyInfoText.html('<div class="center">Played songs will appear here.</div>');
        }
    },1000);
}
function addUserToList(name,realname,imageurl,prepend) {
    var html = '<div class="user intro" data-name="'+name+'" '+(realname?'data-realname="'+realname+'"':'')+' data-imageurl="'+imageurl+'"><a href="http://www.last.fm/user/'+name+'" class="button opener" title="Join '+name+'!" data-action="startparty-'+name+'"><div class="img"'+(imageurl?' style="background-image: url('+imageurl+');"':'')+'></div>'+(realname?realname:name)+'</a><span class="button remove" title="Remove '+name+' from the list." data-action="removeuser-'+name+'">&#215;</span></div>';
    if (prepend) {
        $usersList.prepend(html);
    } else {
        $usersList.append(html);
    }
}
function addUserToListRunIntro(animate) {
    var addUserToListDelay = 200,
        $items = $usersList.find('.intro');
    if (animate === true) {
        $items.each(function(){
            var $this = $(this);
            setTimeout(function($item){
                $this.removeClass('intro');
            },addUserToListDelay,$this);
            addUserToListDelay+=40;
        });
    } else {
        $items.removeClass('intro');
    }
}
function updateUsersStorage() {
    var users = [];
    $usersList.children('.user').each(function(key){
        var $this = $(this);
        users.push({
            'name': $this.data('name'),
            'realname': $this.data('realname'),
            'imageurl': $this.data('imageurl')
        });
    });
    localStorage.users = JSON.stringify(users);
}
function userAddError(text) {
    $userAddError.html(text);
}
$userAdd.submit(function(event){
    event.preventDefault();
    userAddError('');
    if ($userAddName.val() !== '') {
        $userAdd.find('input').attr('disabled','disabled');
        $.getJSON(createURL([
                ['method','user.getInfo'],
                ['api_key',apiKey],
                ['user',$userAddName.val()]
            ]), function(data) {
            if (data.error) {
                if (data.error === 6) {
                    userAddError('No user with that name was found.');
                } else {
                    userAddError("Something went wrong.<br>("+data.message+")");
                }
            } else {
                $userAddName.val('');
                var imgSrc = '';
                $.each(data.user.image,function(key,val){
                    if (val['size'] === 'medium') {
                        imgSrc = val['#text'];
                        return false;
                    }
                });
                if (localStorage.userName !== data.user.name) {
                    $usersList.children('.user').each(function(key){
                        if ($(this).data('name') == data.user.name) {
                            action('removeuser',data.user.name);
                        }
                    });
                    addUserToList(data.user.name,data.user.realname,imgSrc,true);
                    addUserToListRunIntro(true);
                    updateUsersStorage();
                    updateNowListeningUsers();
                }
            }
        })
        .fail(function(){
            userAddError('Something went wrong.');
        })
        .always(function() {
            $userAdd.find('input').removeAttr('disabled','disabled');
            $userAddName.focus();
        });
    }
});

if (localStorage['just-authenticated'] === 'true') {
    _gaq.push(['_trackEvent', 'authenticated', localStorage.userName, localStorage.userName]);
    localStorage.removeItem('just-authenticated');

    // Settings defaults
    localStorage['sett-show-notifications'] = true
    localStorage['sett-show-lastPlayed'] = true
}

$settCheck.each(function(){
    var $this = $(this);
    if (localStorage[$this.attr('name')] === 'true') {
        $this.attr('checked','checked');
    } else {
        $this.removeAttr('checked');
    }
});
$settCheck.change(function(){
    var $this = $(this);
    localStorage[$this.attr('name')] = $this.prop('checked');
});
$settText.each(function(){
    var $this = $(this);
    if ($this.attr('name') in localStorage) {
        $this.val(localStorage[$this.attr('name')]);
    }
});
$settText.change(function(){
    var $this = $(this);
    localStorage[$this.attr('name')] = $this.val();
});

function updateNowListeningUsers() {
    if (localStorage['sett-show-lastPlayed'] !== 'true') {
        return
    }
    $usersList.children('.user').each(function(){
        var $thisUser = $(this);
        if ($thisUser.data('now-listening-checked')) {
            return true;
        } else {
            $thisUser.data('now-listening-checked',true);
            $.ajax({
                url: createURL([
                    ['method','user.getrecenttracks'],
                    ['api_key',apiKey],
                    ['user',$thisUser.data('name')]
                ]),
                dataType: "json"
            }).done(function(data) {
                try {
                    if (!data.error && data.recenttracks.track.length > 1 && data.recenttracks.track[0].hasOwnProperty('@attr')) {
                        $thisUser.addClass('now-listening');
                    }
                    $thisUser.addClass('with-lastPlayed');
                    $thisUser.find('.opener').append('<br><span class="lastTrack">'+ data.recenttracks.track[0].artist['#text'] + ' - ' + data.recenttracks.track[0].name +'</span>');
                } catch (e) {}
                updateNowListeningUsers();
            }).always(function() {
                if ($usersView.hasClass('show')) {
                    updateNowListeningUsers();
                }
            });
            return false;
        }
    });
}

function getUserSession(callback) {
    if (localStorage.userSession) {
        chrome.storage.sync.set({'userSession': localStorage.userSession}, function(data){
            var userSession = localStorage.userSession
            localStorage.removeItem('userSession');
            callback(userSession)
        })
    } else {
        chrome.storage.sync.get('userSession', function(data){
            callback(data.userSession)
        })
    }
}

getUserSession(function(userSession){
    if (userSession) {
        if (localStorage.partyID) {
            action('view','party');
        } else {
            action('view','users');
        }
    } else {
        action('view','authentificate');
    }
})

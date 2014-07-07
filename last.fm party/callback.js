$(function () {
	function getURLParameter(name) {
		return decodeURI(
			(RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
		);
	}
	function createURL(params) {
		params.sort(function(a, b){
			if(a[0] < b[0]) return -1;
			if(a[0] > b[0]) return 1;
			return 0;
		});
		var query = '?',
			api_sig = '';
		for (var i = 0; i < params.length; i++) {
			query += encodeURI(params[i][0])+'='+encodeURI(params[i][1])+'&';
			api_sig += params[i][0]+''+params[i][1];
		};
		return 'http://ws.audioscrobbler.com/2.0/'
				+ query + 'api_sig=' + MD5(api_sig+apiSecret) + '&format=json';
	}
	var userToken = getURLParameter('token'),
		$status = $('#status-message');

	function setStatus(text) {
		$status.html(text);
	}
	var apiSig = 'xx';
	$.getJSON(createURL([
			['method','auth.getSession'],
			['token',userToken],
			['api_key',apiKey]
		]), function(data) {
		try {
			if (data.error) {
				setStatus('Something went wrong.<br>('+data.message+')');
			} else {
				localStorage.userSession = data.session.key;
				localStorage.userName = data.session.name;
				$status.html('<b>Authentication was successful.</b><br>You can close this window.');
			}
		} catch (e) {}
	})
	.fail(function() {
		setStatus('Something went wrong. Please try again later.');
	});


	$('#close').click(function() {
		close();
    });
});
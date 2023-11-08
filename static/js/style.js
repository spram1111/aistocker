
    window.isAuthenticated = 0;
    window.clientUserId = 0;
    window.clientUserName = '';
    window.userCountryCode = '';
    window.logPageEvent = 1;
    window.userHasAdsParams = 0;
    window.utmSourceFromReferrer = 0;
    window.currentLang = 'ru';
    window.baseUrl = 'website-templates';
    window.currentUrl = 'shablony-veb-saytov';
    window.np_userId = '';
    window.isAmplitudeInitialized = false;
    window.sha256Email = '';

    function sendAnalyticsData(eventType, props, cb) {
        var json = { data: {} };
        json.userToken = np_userId;
        json.data.adsParams = $.cookie('AdsParameters');
        json.data.ga = $.cookie('_ga');
        json.data.gac = $.cookie('_gac_UA-88868916-2');
        json.data.userAgent = navigator.userAgent;
        json.data.eventType = eventType;
        json.data.props = props;
        $.ajax({
            'type': 'POST',
            'url': '/Feedback/SendAdsLog',
            'contentType': 'application/json; charset=utf-8',
            'data': JSON.stringify(json),
            'dataType': 'json',
            'complete': cb || function() {}
        });
    }

    function initializeAmplitudeUser() {
        if (isAmplitudeInitialized) {
            return;
        }
        isAmplitudeInitialized = true;

        if (clientUserId > 0)
        {
            identifyAmplitudeUser(clientUserId, clientUserName);
        }
        else
        {
            identifyAmplitudeUser(null);
        }
    }

    function sendAmplitudeAnalyticsData(eventName, eventProperties, userProperties, callback_function) {
        initializeAmplitudeUser();

        if (userProperties) {
            if(userProperties.utm_source || userProperties.utm_campaign) {
                var identify = new amplitude.Identify();
                identify.setOnce("utm_campaign", userProperties.utm_campaign);
                identify.setOnce("utm_source", userProperties.utm_source);
                identify.setOnce("utm_content", userProperties.utm_content);
                identify.setOnce("utm_term", userProperties.utm_term);
                identify.setOnce("utm_page", userProperties.utm_page);
                identify.setOnce("utm_page2", userProperties.utm_page);
                identify.setOnce("referrer", userProperties.referrer);

                amplitude.getInstance().identify(identify);

                userProperties.utm_source_last = userProperties.utm_source;
                userProperties.utm_campaign_last = userProperties.utm_campaign;
                userProperties.utm_content_last = userProperties.utm_content;
                userProperties.utm_term_last = userProperties.utm_term;
                userProperties.utm_page_last = userProperties.utm_page;
            }

            var userProps = objectWithoutProperties(userProperties, ["utm_campaign", "utm_source","utm_content", "utm_term", "utm_page", "referrer"]);
            amplitude.getInstance().setUserProperties(userProps);
        }

        eventProperties.WebSite = 'true';
        eventProperties.IsAuthenticated = window.isAuthenticated;
        eventProperties.country_code = getCountryCode();
        eventProperties.lang = window.currentLang || '';

        var fullPageUrl = window.location.pathname.split('?')[0];
        eventProperties.full_page_url = fullPageUrl;
        eventProperties.page_url = clearPageUrl(fullPageUrl);

        if (typeof callback_function === 'function') {
            amplitude.getInstance().logEvent(eventName, eventProperties, callback_function);
        } else {
            amplitude.getInstance().logEvent(eventName, eventProperties);
        }
    }

    function identifyAmplitudeUser(userId, token) {
        if (userId) {
            amplitude.getInstance().setUserProperties({
                "Token": token,
                "UserId": userId
            });
        }

        var identify = new amplitude.Identify();
        amplitude.getInstance().identify(identify);
        if (userId) {
            amplitude.getInstance().setUserId(userId);
        }
    }

    function sendAnalyticsFromUrl(referrer, pageType) {
        var hash = window.location.hash;

        var urlIsAvailable = typeof URL === "function" || (navigator.userAgent.indexOf('MSIE') !== -1 && typeof URL === 'object');
        if (!urlIsAvailable) {
            return;
        }

        var url = new URL(window.location.href);
        if (hash && hash.indexOf('utm_') >= 0) {
            url = new URL(window.location.origin + window.location.pathname + hash.replace('#', '?'));
        }

        if (!url.searchParams) {
            return;
        }

        var utmParams = getUtmParams(url);
        var gclidFromUrl = utmParams.gclid;
        var utmParamsFromUrl = !!utmParams.utmSource || !!utmParams.utmCampaign || !!utmParams.gclid;
        if (!utmParamsFromUrl && userHasAdsParams)
        {
            utmParams = getUtmParamsFromCookie();
        }

        var canLog = canLogToAmplitude();
        if (utmParamsFromUrl || utmSourceFromReferrer) {
            var fullPageUrl = window.location.pathname.split('?')[0];
            var pageUrl = clearPageUrl(fullPageUrl);
            var userProps = {
                "utm_source": utmParams.utmSource,
                "utm_campaign": utmParams.utmCampaign,
                "utm_content": utmParams.utmContent,
                "utm_term": utmParams.utmTerm,
                "utm_page": getUtmPageValue(pageUrl),
                "utm_lang": window.currentLang || '',
                "referrer": referrer
            };

            if (gclidFromUrl) {
                var landingUrl = pageUrl.startsWith('/') && pageUrl !== '/' ? pageUrl.substr(1) : pageUrl;
                userProps.landing_page = landingUrl;

                var event = {
                    'Page': landingUrl,
                    'Url': window.location.href,
                    'utm_campaign_event': utmParams.utmCampaign
                }
                sendAmplitudeAnalyticsData('Landing Page', event, userProps);
            } else {
                var eventProps = {
                    "utm_source": utmParams.utmSource,
                    "utm_campaign": utmParams.utmCampaign,
                    "utm_content": utmParams.utmContent,
                    "utm_term": utmParams.utmTerm
                };

                if (utmParams.utmSource === "elastic") {
                    sendAmplitudeAnalyticsData('Email Click', eventProps);
                }

                if (canLog) {
                    sendAmplitudeAnalyticsData('Campaign', eventProps, userProps);
                }
            }
        }

        if (logPageEvent && canLog || (pageType === 'Pricing Page' && !window.isForbiddenCountry())) {
            var pageEventProps = {
                'type': pageType,
                'accepted_country': isValidCountry(),
                'force_log': !canLog
            };

            sendAmplitudeAnalyticsData('Page View', pageEventProps);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setCountryCode('https://location.nicepagesrv.com/country');
        setUserIdCookie();
        updatePageViewCounter();

        if (typeof gtag === 'function' && typeof canSendViewConversion === 'function' && window.isAuthenticated && canSendViewConversion()) {
            if (sha256Email) {
                gtag('set', 'user_data', { 'sha256_email_address': sha256Email });
            }
            //Event snippet for 2 Page View conversion page
            gtag('event', 'conversion', { 'send_to': 'AW-797221335/GbWrCJ6Ht5wYENfDkvwC', 'transaction_id': clientUserId });

            setAdsPageViewCookie();
        }

        var referrer = '';
        var pageType = 'Templates Page';
        sendAnalyticsFromUrl(referrer, pageType);

        if (location.href.indexOf('/frame/') === -1) {
            PureCookie.initCookieConsent({
                description: 'By using this website, you automatically accept that we use cookies. Learn more about our ',
                link: '<a href="https://nicepage.com/Privacy" target="_blank"> privacy and cookies policy</a>.',
                buttonCaption: "Accept",
                opacity: 0.88,
            });
        }
    });




        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());

        var options = {};
        var awOptions = { 'allow_enhanced_conversions': true };
        if (clientUserId > 0) {
            options.user_id = clientUserId;
            awOptions.user_id = clientUserId;
        }
        // gtag('config', 'GA_TRACKING_ID', { 'optimize_id': 'OPT_CONTAINER_ID'});
        gtag('config', 'AW-797221335', awOptions);
        gtag('config', 'G-T7WWB0T53W', options);



    (function(e,t){var n=e.amplitude||{_q:[],_iq:{}};var r=t.createElement("script")
            ;r.type="text/javascript"
            ;r.integrity="sha384-d/yhnowERvm+7eCU79T/bYjOiMmq4F11ElWYLmt0ktvYEVgqLDazh4+gW9CKMpYW"
            ;r.crossOrigin="anonymous";r.async=true
            ;r.src="https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js"
            ;r.onload=function(){if(!e.amplitude.runQueuedFunctions){
                console.log("[Amplitude] Error: could not load SDK")}}
            ;var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)
            ;function s(e,t){e.prototype[t]=function(){
            this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}
        var o=function(){this._q=[];return this}
            ;var a=["add","append","clearAll","prepend","set","setOnce","unset"]
            ;for(var u=0;u<a.length;u++){s(o,a[u])}n.Identify=o;var c=function(){this._q=[]
                ;return this}
            ;var l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"]
            ;for(var p=0;p<l.length;p++){s(c,l[p])}n.Revenue=c
            ;var d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"]
            ;function v(e){function t(t){e[t]=function(){
                e._q.push([t].concat(Array.prototype.slice.call(arguments,0)))}}
            for(var n=0;n<d.length;n++){t(d[n])}}v(n);n.getInstance=function(e){
                e=(!e||e.length===0?"$default_instance":e).toLowerCase()
                    ;if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e])}return n._iq[e]}
            ;e.amplitude=n})(window,document);
    amplitude.getInstance().init("878f4709123a5451aff838c1f870b849");



var shareasaleSSCID=shareasaleGetParameterByName("sscid");function shareasaleSetCookie(e,a,r,s,t){if(e&&a){var o,n=s?"; path="+s:"",i=t?"; domain="+t:"",S="";r&&((o=new Date).setTime(o.getTime()+r),S="; expires="+o.toUTCString()),document.cookie=e+"="+a+S+n+i+"; SameSite=None;Secure"}}function shareasaleGetParameterByName(e,a){a||(a=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");var r=new RegExp("[?&]"+e+"(=([^&#]*)|&|#|$)").exec(a);return r?r[2]?decodeURIComponent(r[2].replace(/\+/g," ")):"":null}shareasaleSSCID&&shareasaleSetCookie("shareasaleSSCID",shareasaleSSCID,94670778e4,"/");


var submitSearchTimer = false;
document.addEventListener("DOMContentLoaded", function() {
    var thumbSlider = $('.thumbnail-slider');
    thumbSlider.thumbnailSlider();

    $('#search-button').on('click', function (e) {
        e.preventDefault();
        var searchTerm = $('#search').val();
        if (canLogToAmplitude()) {
            sendAmplitudeAnalyticsData('Page Search', { "Type": "Page", "Term": searchTerm });
        }
        setTimeout(function() {
            $('#search-form').submit();
        }, 200);
        return false;
    });

    SearchController.init('https://np-index.nicepagesrv.com/api/');

    $("#key").catcomplete({
        source: function (request, response) {
            SearchController.search({ q: request.term, lang: 'ru'},
                function (err, result) {
                    if (err) {
                        alert(err);
                        return;
                    }
                    result = result.filter(r => r.items && r.items.length > 0);
                    response(result);
            });
        },
        minLength: 1,
        select: function(event, ui) {
            if (!ui.item) {
                return;
            }

            if (canLogToAmplitude()) {
                sendAmplitudeAnalyticsData('Page Search', { "Type": "Page", "Term": ui.item.value });
            }
            setTimeout(function() {
                location.href = location.origin + ui.item.url;
            }, 200);
        }
    });

    $(window).resize(function() {
        $("#search").autocomplete("close");
    });
});

function submitSearchForm(e) {
    e.preventDefault();
    clearTimeout(submitSearchTimer);
    submitSearchTimer = setTimeout(function() {
        $('#term').val($('#key').val().trim().replace(/\s+/g, ' '));
        $('#key').attr('disabled', true);
        $('#search-form').submit();
    }, 0);
    return true;
}



    document.addEventListener("DOMContentLoaded", function () {
        if (typeof IOlazy === 'function') {
            var lazy = new IOlazy();
        }
    });

    function sendAnalyticsData(eventType, props, cb) {
        var json = { data: {} };
        json.userToken = np_userId;
        json.data.adsParams = $.cookie('AdsParameters');
        json.data.ga = $.cookie('_ga');
        json.data.gac = $.cookie('_gac_UA-88868916-2');
        json.data.userAgent = navigator.userAgent;
        json.data.eventType = eventType;
        json.data.props = props;
        $.ajax({
            'type': 'POST',
            'url': '/Feedback/SendAdsLog',
            'contentType': 'application/json; charset=utf-8',
            'data': JSON.stringify(json),
            'dataType': 'json',
            'complete': cb || function() {}
        });
    }

    function initializeAmplitudeUser() {
        if (isAmplitudeInitialized) {
            return;
        }
        isAmplitudeInitialized = true;

        if (clientUserId > 0)
        {
            identifyAmplitudeUser(clientUserId, clientUserName);
        }
        else
        {
            identifyAmplitudeUser(null);
        }
    }

    function sendAmplitudeAnalyticsData(eventName, eventProperties, userProperties, callback_function) {
        initializeAmplitudeUser();

        if (userProperties) {
            if(userProperties.utm_source || userProperties.utm_campaign) {
                var identify = new amplitude.Identify();
                identify.setOnce("utm_campaign", userProperties.utm_campaign);
                identify.setOnce("utm_source", userProperties.utm_source);
                identify.setOnce("utm_content", userProperties.utm_content);
                identify.setOnce("utm_term", userProperties.utm_term);
                identify.setOnce("utm_page", userProperties.utm_page);
                identify.setOnce("utm_page2", userProperties.utm_page);
                identify.setOnce("referrer", userProperties.referrer);

                amplitude.getInstance().identify(identify);

                userProperties.utm_source_last = userProperties.utm_source;
                userProperties.utm_campaign_last = userProperties.utm_campaign;
                userProperties.utm_content_last = userProperties.utm_content;
                userProperties.utm_term_last = userProperties.utm_term;
                userProperties.utm_page_last = userProperties.utm_page;
            }

            var userProps = objectWithoutProperties(userProperties, ["utm_campaign", "utm_source","utm_content", "utm_term", "utm_page", "referrer"]);
            amplitude.getInstance().setUserProperties(userProps);
        }

        if (!eventProperties) {
            eventProperties = {};
        }

        eventProperties.WebSite = 'true';
        eventProperties.IsAuthenticated = window.isAuthenticated;
        eventProperties.country_code = getCountryCode();
        eventProperties.lang = window.currentLang || '';

        var fullPageUrl = window.location.pathname.split('?')[0];
        eventProperties.full_page_url = fullPageUrl;
        eventProperties.page_url = clearPageUrl(fullPageUrl);

        if (typeof callback_function === 'function') {
            amplitude.getInstance().logEvent(eventName, eventProperties, callback_function);
        } else {
            amplitude.getInstance().logEvent(eventName, eventProperties);
        }
    }

    function identifyAmplitudeUser(userId, token) {
        if (userId) {
            amplitude.getInstance().setUserProperties({
                "Token": token,
                "UserId": userId
            });
        }

        var identify = new amplitude.Identify();
        amplitude.getInstance().identify(identify);
        if (userId) {
            amplitude.getInstance().setUserId(userId);
        }
    }

    function sendAnalyticsFromUrl(referrer, pageType) {
        var hash = window.location.hash;

        var urlIsAvailable = typeof URL === "function" || (navigator.userAgent.indexOf('MSIE') !== -1 && typeof URL === 'object');
        if (!urlIsAvailable) {
            return;
        }

        var url = new URL(window.location.href);
        if (hash && hash.indexOf('utm_') >= 0) {
            url = new URL(window.location.origin + window.location.pathname + hash.replace('#', '?'));
        }

        if (!url.searchParams) {
            return;
        }

        var utmParams = getUtmParams(url);
        var gclidFromUrl = utmParams.gclid;
        var utmParamsFromUrl = !!utmParams.utmSource || !!utmParams.utmCampaign || !!utmParams.gclid;
        if (!utmParamsFromUrl && userHasAdsParams)
        {
            utmParams = getUtmParamsFromCookie();
        }

        var canLog = canLogToAmplitude();
        if (utmParamsFromUrl || utmSourceFromReferrer) {
            var fullPageUrl = window.location.pathname.split('?')[0];
            var pageUrl = clearPageUrl(fullPageUrl);
            var userProps = {
                "utm_source": utmParams.utmSource,
                "utm_campaign": utmParams.utmCampaign,
                "utm_content": utmParams.utmContent,
                "utm_term": utmParams.utmTerm,
                "utm_page": getUtmPageValue(pageUrl),
                "utm_lang": window.currentLang || '',
                "referrer": referrer
            };

            if (gclidFromUrl) {
                var landingUrl = pageUrl.startsWith('/') && pageUrl !== '/' ? pageUrl.substr(1) : pageUrl;
                userProps.landing_page = landingUrl;

                var event = {
                    'Page': landingUrl,
                    'Url': window.location.href,
                    'utm_campaign_event': utmParams.utmCampaign
                }
                sendAmplitudeAnalyticsData('Landing Page', event, userProps);
            } else {
                var eventProps = {
                    "utm_source": utmParams.utmSource,
                    "utm_campaign": utmParams.utmCampaign,
                    "utm_content": utmParams.utmContent,
                    "utm_term": utmParams.utmTerm
                };

                if (utmParams.utmSource === "elastic") {
                    sendAmplitudeAnalyticsData('Email Click', eventProps);
                }

                if (canLog) {
                    sendAmplitudeAnalyticsData('Campaign', eventProps, userProps);
                }
            }
        }

        if (logPageEvent && canLog || (pageType === 'Pricing Page' && !window.isForbiddenCountry())) {
            var pageEventProps = {
                'type': pageType,
                'accepted_country': isValidCountry(),
                'force_log': !canLog
            };

            sendAmplitudeAnalyticsData('Page View', pageEventProps);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setCountryCode('https://location.nicepagesrv.com/country');
        setUserIdCookie();
        updatePageViewCounter();

        if (typeof gtag === 'function' && typeof canSendViewConversion === 'function' && window.isAuthenticated && canSendViewConversion()) {
            if (sha256Email) {
                gtag('set', 'user_data', { 'sha256_email_address': sha256Email });
            }
            //Event snippet for 2 Page View conversion page
            gtag('event', 'conversion', { 'send_to': 'AW-797221335/GbWrCJ6Ht5wYENfDkvwC', 'transaction_id': clientUserId });

            setAdsPageViewCookie();
        }

        var referrer = '';
        var pageType = 'Register Page';
        sendAnalyticsFromUrl(referrer, pageType);

        if (location.href.indexOf('/frame/') === -1) {
            PureCookie.initCookieConsent({
                description: 'By using this website, you automatically accept that we use cookies. Learn more about our ',
                link: '<a href="https://nicepage.com/Privacy" target="_blank"> privacy and cookies policy</a>.',
                buttonCaption: "Accept",
                opacity: 0.88,
            });
        }
    });



        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());

        var options = {};
        var awOptions = { 'allow_enhanced_conversions': true };
        if (clientUserId > 0) {
            options.user_id = clientUserId;
            awOptions.user_id = clientUserId;
        }
        // gtag('config', 'GA_TRACKING_ID', { 'optimize_id': 'OPT_CONTAINER_ID'});
        gtag('config', 'AW-797221335', awOptions);
        gtag('config', 'G-T7WWB0T53W', options);



    (function(e,t){var n=e.amplitude||{_q:[],_iq:{}};var r=t.createElement("script")
            ;r.type="text/javascript"
            ;r.integrity="sha384-d/yhnowERvm+7eCU79T/bYjOiMmq4F11ElWYLmt0ktvYEVgqLDazh4+gW9CKMpYW"
            ;r.crossOrigin="anonymous";r.async=true
            ;r.src="https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js"
            ;r.onload=function(){if(!e.amplitude.runQueuedFunctions){
                console.log("[Amplitude] Error: could not load SDK")}}
            ;var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)
            ;function s(e,t){e.prototype[t]=function(){
            this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}
        var o=function(){this._q=[];return this}
            ;var a=["add","append","clearAll","prepend","set","setOnce","unset"]
            ;for(var u=0;u<a.length;u++){s(o,a[u])}n.Identify=o;var c=function(){this._q=[]
                ;return this}
            ;var l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"]
            ;for(var p=0;p<l.length;p++){s(c,l[p])}n.Revenue=c
            ;var d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"]
            ;function v(e){function t(t){e[t]=function(){
                e._q.push([t].concat(Array.prototype.slice.call(arguments,0)))}}
            for(var n=0;n<d.length;n++){t(d[n])}}v(n);n.getInstance=function(e){
                e=(!e||e.length===0?"$default_instance":e).toLowerCase()
                    ;if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e])}return n._iq[e]}
            ;e.amplitude=n})(window,document);
    amplitude.getInstance().init("878f4709123a5451aff838c1f870b849");






        

        var appName = '';

                window.serverSettings = {
                    fbAppId: '964828064508900',
                    googleAppId: '13150095650-mo8psu2colep6uv90a2mu6r87u87s35a.apps.googleusercontent.com'
                };
                window.initGoogleSignIn = function () {
                    if (typeof window.initGoogleSignInClient === 'function') {
                        initGoogleSignInClient();
                    } else {
                        window.isGoogleInited = true;
                    }
                };


                appName = 0 ? 'desktop' : 'website';
            if (typeof gtag === "function") {
                gtag('event', 'registration');
            }

        var isEmailUnique = true;
        var lastEmail = '';

        jQuery(document).ready(function () {
            $('#Password').on('keyup change click',
                function () {
                    if ($(this).attr('type') !== 'password') {
                        $(this).attr('type', 'password');
                    }
                });

            var form = $('#register-form');
            var validator = $.data(form[0], 'validator');
            if (!validator) {
                form.removeData("validator");
                form.removeData("unobtrusiveValidation");
                $.validator.unobtrusive.parse("#register-form");
                validator = $.data(form[0], 'validator');
            }

            var settings = validator.settings;
            // remove validation checking onkeyup
            settings.onkeyup = false;

            var email = $('#Email');
            if (email.val() === '') {
                email.focus();
            } else {
                $('#Password').focus();
            }

            // hide errors on focus
            $('.form-group input').on('focus', function () {
                var $form = $('#register-form');
                var $validator = $form.validate();

                var formGroup = $(this).parent('.form-group');
                var $errors = formGroup.find(".field-validation-error span");

                // trick unobtrusive to think the elements were succesfully validated
                // this removes the validation messages
                $errors.each(function () { $validator.settings.success($(this)); });

                // clear errors from validation
                $validator.resetForm();
                //$('#registerbutton').prop('disabled', false);
            });

            $('#registerbutton').click(function (e) {
                e.preventDefault();

                var button = $(this);
                var $validator = $("#register-form").validate();
                // Form has errors. They need fixing before submit.
                if ($validator && !$validator.form()) {
                    return;
                }

                // Prevent multiple clicks to button.
                button.prop('disabled', true);

                if (typeof gtag === "function") {
                    var email = $('#Email').val();
                    if (email)
                        gtag('set', 'user_data', {'email': email});
                    gtag('event', 'conversion', {
                        'send_to': 'AW-797221335/kmscCLuI8dIBENfDkvwC',
                        'event_callback': onSignUp
                    });
                } else {
                    onSignUp();
                }
            });

            $('#Email').keyup(function () {
                isEmailUnique = true;
                lastEmail = '';
            }).focusout(function () {
                var email = $(this).val();
                if (lastEmail === email)
                    return;
                lastEmail = email;
                $.ajax({
                    type: 'POST',
                    url: "/Account/IsUniqueEmail?email=" + email,
                    success: function (data) {
                        isEmailUnique = data.success;
                        $("#Email").valid();
                    }
                });
            });
        });

        function onSignUp() {
            var userToken = '';
            try {
                userToken = localStorage.getItem('np_userId');
            } catch (err) { }

            if (typeof sendAnalyticsData === "function") {
                sendAnalyticsData('registration-completed-GA', { Source: 'website / ' + appName, Page: 'Register' });
            }

            setTimeout(function () {
                $('#userToken').val(userToken);
                $('#register-form').submit();
            }, 200);
        }

        $.validator.unobtrusive.adapters.addBool("mustbetrue", "required");

        $.validator.addMethod("passwordregexcheck",
            function (value, element, params) {
                var match = new RegExp(params).exec(value);
                return (match);
            });
        jQuery.validator.unobtrusive.adapters.addSingleVal("passwordregexcheck", "pattern");

        $.validator.addMethod('uniqueemailcheck', function () { return isEmailUnique; }, '');

        $.validator.unobtrusive.adapters.add('uniqueemail',
            {},
            function (options) {
                options.rules['uniqueemailcheck'] = true;
                options.messages['uniqueemailcheck'] = options.message;
            });




!function(e){if(!window.pintrk){window.pintrk = function () {
window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
      n=window.pintrk;n.queue=[],n.version="3.0";var
      t=document.createElement("script");t.async=!0,t.src=e;var
      r=document.getElementsByTagName("script")[0];
      r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '2619058937406', {em: '<user_email_address>'});
pintrk('page');



            document.addEventListener("DOMContentLoaded", function () {
                if (typeof IOlazy === 'function') {
                    var lazy = new IOlazy();
                }
            });

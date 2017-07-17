(function( $ ){

  $.fn.pad = function( options ) {
    var settings = {
      'host'              : 'http://beta.etherpad.org',
      'baseUrl'           : '/p/',
      'showControls'      : false,
      'showChat'          : false,
      'showLineNumbers'   : false,
      'userName'          : 'unnamed',
      'lang'              : '',
      'useMonospaceFont'  : false,
      'noColors'          : false,
      'userColor'         : false,
      'hideQRCode'        : false,
      'alwaysShowChat'    : false,
      'width'             : 100,
      'height'            : 100,
      'border'            : 0,
      'borderStyle'       : 'solid',
      'toggleTextOn'      : 'Disable Rich-text',
      'toggleTextOff'     : 'Enable Rich-text',
      'plugins'           : {},
      'rtl'               : false,
      // custom settings
      'isGroupPad'        : '',
      'sessionSettings'     : {}
    };

    var $self = this;
    if (!$self.length) return;
    if (!$self.attr('id')) throw new Error('No "id" attribute');

    var useValue = $self[0].tagName.toLowerCase() == 'textarea';
    var selfId = $self.attr('id');
    var epframeId = 'epframe'+ selfId;
    // This writes a new frame if required
    if ( !options.getContents ) {
      if ( options ) {
        $.extend( settings, options );
      }

      var pluginParams = '';
      for(var option in settings.plugins) {
        pluginParams += '&' + option + '=' + settings.plugins[option];
      }

      var iFrameLink = '<iframe id="' + epframeId;
      iFrameLink += '" name="' + epframeId;
      if(settings.sessionSettings.hasOwnProperty("apiKey")) {
        iFrameLink += '" src="' + settings.host + '/auth_session';
        iFrameLink += '?apiKey=' + settings.sessionSettings.apiKey;
        iFrameLink += '&authorName=' + encodeURIComponent(settings.sessionSettings.userName);
        iFrameLink += '&authorMapper=' + settings.sessionSettings.userId;
        iFrameLink += '&groupMapper=' + settings.sessionSettings.groupId;
        iFrameLink += '&validUntil=' + settings.sessionSettings.validUntil;
        iFrameLink += '&padName=' + settings.sessionSettings.padName;
        var validUntil = parseInt(localStorage.getItem('epSessionValidUntil'));
        if(isNaN(validUntil) || (new Date()).getTime() < validUntil) {
          iFrameLink += '&sessionID=' + localStorage.getItem('epSessionID');
        }
        iFrameLink += '&';
      } else {
        iFrameLink += '" src="' + settings.host + settings.baseUrl + settings.padId;
        iFrameLink += '?';
      }
      iFrameLink += 'showControls=' + settings.showControls;
      iFrameLink += '&showChat=' + settings.showChat;
      iFrameLink += '&showLineNumbers=' + settings.showLineNumbers;
      iFrameLink += '&useMonospaceFont=' + settings.useMonospaceFont;
      iFrameLink += '&userName=' + encodeURIComponent(settings.userName);
      if (settings.lang) {
        iFrameLink += '&lang=' + settings.lang;
      }
      iFrameLink += '&noColors=' + settings.noColors;
      iFrameLink += '&userColor=' + settings.userColor;
      iFrameLink += '&hideQRCode=' + settings.hideQRCode;
      iFrameLink += '&alwaysShowChat=' + settings.alwaysShowChat;
      iFrameLink += '&rtl=' + settings.rtl;
      iFrameLink += pluginParams;

      iFrameLink +='" style="border:' + settings.border;
      iFrameLink +='; border-style:' + settings.borderStyle;
      iFrameLink +=';" width="' + '100%';//settings.width;
      iFrameLink +='" height="' + settings.height;
      iFrameLink +='"></iframe>';
      iFrameLink = iFrameLink.replace(/([^:]\/)\/+/g, '$1');

      var $iFrameLink = $(iFrameLink);

      if (useValue) {
        var $toggleLink = $('<a href="#'+ selfId +'">'+ settings.toggleTextOn +'</a>').click(function(){
          var $this = $(this);
          $this.toggleClass('active');
          if ($this.hasClass('active')) $this.text(settings.toggleTextOff);
          $self.pad({getContents: true});
          return false;
        });
        $self
          .hide()
          .after($toggleLink)
          .after($iFrameLink)
        ;
      }
      else {
        $self.html(iFrameLink);
        var epFrame = $self.find('#' + epframeId);
        var isLocalStorageAvailable = true;
        // Safari, in Private Browsing Mode, looks like it supports localStorage but all calls to setItem
        // throw QuotaExceededError. We're going to detect this and just silently drop any calls to setItem
        // to avoid the entire page breaking, without having to do a check at each usage of Storage.
        if (typeof localStorage === "object") {
          try {
            localStorage.setItem('localStorage', 1);
            localStorage.removeItem('localStorage');
          } catch (e) {
            isLocalStorageAvailable = false;
            if(!!toastr && typeof toastr.warning === 'function') {
              toastr.warning('Your web browser does not support storing settings locally. ' +
                'A new Etherpad session will be created every time this page loads' +
                'while in "Private Browsing Mode".');
            }
          }
        }

        var receiveMessage = function(event) {
          var origin = (event.originalEvent.origin + "/").replace(/([^:]\/)\/+/g, "$1");
          if (origin !== settings.host)
            return;

          var data = event.originalEvent.data;
          if(data.action === 'redirect') {
            if(isLocalStorageAvailable) {
              localStorage.setItem('epSessionID', data.sessionID);
              localStorage.setItem('epSessionValidUntil', data.validUntil);
            }
            epFrame.attr('src', data.url);
          }
          if(data.action === 'refreshSession' && isLocalStorageAvailable) {
            localStorage.removeItem('epSessionID');
            localStorage.removeItem('epSessionValidUntil');
            var regexp = /^((?:.+&)|\?)(sessionID=s\.[^&]+)(?:$|(?:&(.+)))/g;
            epFrame.attr('src', epFrame.attr('src').replace(regexp, '$1$3'));
          }
        };
        $(window).on("message", receiveMessage);
      }
    }

    // This reads the etherpad contents if required
    else {
      var frameUrl = $('#'+ epframeId).attr('src').split('?')[0];
      var contentsUrl = frameUrl + "/export/html";
      var target = $('#'+ options.getContents);

      // perform an ajax call on contentsUrl and write it to the parent
      $.get(contentsUrl, function(data) {

        if (target.is(':input')) {
          target.val(data).show();
        }
        else {
          target.html(data);
        }

        $('#'+ epframeId).remove();
      });
    }


    return $self;
  };
})( jQuery );
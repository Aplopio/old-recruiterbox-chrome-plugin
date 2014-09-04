(function($) {
    this._RBP = this._RBP || {};

    _.templateFromId = function( id, data ){
        var template = _RBP.JST[ id ];
        return data ? template( data ) : template;
    };

    _RBP.utils = {
        sendMessageToExtension: function( request, callback ) {
            chrome.runtime.sendMessage(request, function( resp ) {
                console.log(resp);
                callback( resp );
            });
        }
    };

    _RBP.RboxManager = {
        _meta: {
            BASE_URI: 'http://demoaccount.rbox.com:8000',
            BASE_API_URI: 'http://demoaccount.rbox.com:8000/api/v1'
        },

        getCredentials: function( callback ) {
            var self = this;
            _RBP.utils.sendMessageToExtension(
                { action: "rbox-get-credentials" }, function(resp) {
                    callback(resp);
                });
        },

        isLoggedIn: function( callback ) {
            var self = this;
            self.getCredentials( function( data ) {
                callback( Boolean( data && data.api_key ), data );
            });
            //callback(true, {username: 'Sushant'});
            //callback(null, undefined);
        },

        exportAsCandidate: function( data, callback ) {
            var self = this;
            callback( { status: 'success' } );
            // var requestObj = {
            //     action: "rbox-export-as-candidates",
            //     data: data
            // };
            // _RBP.utils.sendMessageToExtension(
            //     requestObj, function(response) {
            //     console.log(response);
            // });
        },

        events: function() {
            var self = this;
            $(document).on('click', '.rbox-plugin-login-btn', function(e) {
                console.log('Login clicked');
                window.open(self._meta.BASE_URI + '/accounts/chrome_plugin_login',
                    'chrome_plugin_login', "width=380, height=480");
                e.preventDefault();
            });
        }     
    };

    _RBP.LinkedIn = {
        injectStyling: function() {
            $( 'head' ).append(
                _.templateFromId(
                    'jst-plugin-styling', {}
                )
            );
        },

        initScaffold: function() {
            $( '#wrapper' ).before(
                _.templateFromId(
                    'jst-plugin-body', {}
                )
            );
            _RBP.RboxManager.isLoggedIn( function( is_logged_in, credentials ) {
                var block_to_inject = 'jst-plugin-login-block';
                var block_context = {};
                if( is_logged_in ) {
                    block_to_inject = 'jst-plugin-export-block';
                    block_context = {
                        username: credentials.username
                    };
                }
                $( '.rbox-plugin-body' ).html(
                    _.templateFromId(
                        block_to_inject, {}
                    )
                );
            });
            
        },

        extractProfile: function() {
            var isDesiredContainer = function( container_id ) {
                var desired_background_fields = [
                    "background-experience-container",
                    "background-projects-container",
                    "background-education-container"
                ];
                return desired_background_fields.indexOf( container_id ) !== -1;
            };
            var content = {};
            content.profile_name = $( 'h1' ).find( '.full-name' ).text();
            var profile_html = '';
            $( '.background-content' ).children().each(
                function( index, container ) {
                    var $container = $( container );
                    if( isDesiredContainer( $container.attr( 'id' ) ) ) {
                        $container.find( 'script' ).remove();
                        profile_html = profile_html + $container.html();
                    }
                }
            );
            content.background_html = profile_html;
            return content;
        },

        events: function() {
            var self = this;
            $(document).ready(function() {
                self.injectStyling();
                self.initScaffold();
            }).on('click', '.rbox-plugin-export-btn, .rbox-plugin-reexport-btn', function(e) {
                var profile = self.extractProfile();
                console.log(profile);
                var successful_export_html = _.templateFromId(
                    'jst-plugin-successful-export', {} );
                $('.rbox-plugin-export-span').html(successful_export_html);
                // _RBP.RboxManager.exportAsCandidate(profile, function(resp) {
                    
                // });
                e && e.preventDefault();
            });
        }
    };

    
    _RBP.router = function() {
        var href = document.location.href
        if (href.match(/^https:\/\/www.linkedin.com\/.*/g)) {
            _RBP.LinkedIn.events();
        }
    };

    _RBP.events = function() {
        $(document).ready(function() {
            _RBP.router();
            _RBP.RboxManager.events();
        });
    };

    _RBP.main = function() {
        this.events();
    }

    _RBP.main();
})( jQuery );
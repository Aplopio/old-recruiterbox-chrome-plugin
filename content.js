(function($) {
    this._RBP = this._RBP || {};

    _.templateFromId = function( id, data ){
        var template = _RBP.JST[ id ];
        return data ? template( data ) : template;
    };

    _RBP.port = chrome.runtime.connect({ name: "RB_PORT" });

    _RBP.RboxManager = {
        _meta: {
            BASE_URI: 'https://app.recruiterbox.com',
            BASE_API_URI: 'https://app.recruiterbox.com/api/v1'
            // BASE_URI: 'http://demoaccount.rbox.com:8000',
            // BASE_API_URI: 'http://demoaccount.rbox.com:8000/api/v1'
        },

        getCredentialsCallback: function() {
            /* You need to assign callback to this field */
        },

        getCredentials: function( callback ) {
            var self = this;
            self.getCredentialsCallback = callback;
            _RBP.port.postMessage({
                request: "rbox_get_credentials"
            });
        },

        isLoggedIn: function( callback ) {
            var self = this;
            self.getCredentials( function( data ) {
                callback( Boolean( data && data.api_key ), data );
            });
        },

        exportAsCandidateCallback: function() {
            /* You need to assign callback to this field */
        },

        exportAsCandidateErrCallback: function() {
            /* You need to assign callback to this field */
        },

        getSourceObj: function() {
            return {
                channel: 'Chrome extension'
            };
        },

        exportAsCandidate: function( data, options, callback ) {
            options = options || {};
            var self = this;
            self.exportAsCandidateCallback = callback;
            if( options.errCallback ) {
                self.exportAsCandidateErrCallback = options.errCallback;
            }
            _RBP.port.postMessage({
                request: "rbox_export_as_candidate",
                profile_to_export: data
            });
        },

        events: function() {
            var self = this;
            $(document).on('click', '.rbox-plugin-login-btn', function(e) {
                console.log('Login clicked');
                window.open(self._meta.BASE_URI + '/accounts/chrome_plugin_login',
                    'chrome_plugin_login', "width=380, height=480");
                e.preventDefault();
            });

            var listener = function(event){
                if( event.origin !== self._meta.BASE_URI ) {
                    return;
                }
                if( event.data === 'rbox-login-success' ) {
                    window.location.reload(true);
                }
            }
             
            if (window.addEventListener){
                addEventListener("message", listener, false);
            } else {
                attachEvent("onmessage", listener);
            }
        }
    };

    _RBP.LinkedIn = {
        exported_profiles_key: 'rbox-exported-profiles',
        exported_profiles_rbox_urls_key : 'rbox-exported-profiles-rbox-urls',

        injectStyling: function() {
            var anchor = chrome.extension.getURL('css/style.css');
            $('<link rel="stylesheet" type="text/css" href="' + 
                anchor + '" >').appendTo("head");
        },

        initScaffold: function() {
            var self = this;
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
                        name: credentials.name,
                        client_name: credentials.client_name,
                        company_name: credentials.company_name
                    };
                }
                $( '.rbox-plugin-body' ).html(
                    _.templateFromId(
                        block_to_inject, block_context
                    )
                );
                if( is_logged_in ) {
                    var profile_id = self.getProfileIdentifier();
                    if( self.isProfileAlreadyExported( profile_id ) ) {
                        self.renderSuccessfulExport();
                    }
                }
            });
            
        },

        initLocalStorage: function () {
            var exported_profiles = localStorage.getItem(
                this.exported_profiles_key);
            var exported_profiles_rbox_urls = localStorage.getItem(
                this.exported_profiles_rbox_urls_key);
            if( !exported_profiles ) {
                localStorage.setItem(this.exported_profiles_key,
                    JSON.stringify( [] )
                );
            }
            if( !exported_profiles_rbox_urls ) {
                localStorage.setItem(this.exported_profiles_rbox_urls_key,
                    JSON.stringify( {} )
                );
            }
        },

        getProfileIdentifier: function() {
            var pub_urls = $('#top-card span.view-public-profile'),
                pub_url = pub_urls.length > 0 ? pub_urls[0] : null;
            if( pub_url ) {
                return pub_url.textContent;
            }
        },

        isProfileAlreadyExported: function( profile_id ) {
            var exported_profiles = JSON.parse(
                localStorage.getItem( this.exported_profiles_key )
            );
            return exported_profiles.indexOf(profile_id) !== -1;
        },

        addProfileToLocalStorage: function( profile_id, rbox_url ) {
            var exported_profiles = JSON.parse(
                localStorage.getItem( this.exported_profiles_key )
            );
            if( exported_profiles.indexOf( profile_id ) === -1 ) {
                exported_profiles.push( profile_id );
                localStorage.setItem( this.exported_profiles_key, 
                    JSON.stringify( exported_profiles )
                );
            }
            var rbox_urls = JSON.parse(
                localStorage.getItem(
                    this.exported_profiles_rbox_urls_key
                )
            );
            rbox_urls[profile_id] = rbox_url;
            localStorage.setItem( this.exported_profiles_rbox_urls_key,
                JSON.stringify(rbox_urls)
            );
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
            var $profile_html = $( profile_html );
            $profile_html.find( 'a' ).contents().unwrap();
            $profile_html = $( '<html></html>' ).html(
                $( '<body></body>' ).html( $profile_html )
            );
            content.background_html = $profile_html.html();

            content.profile_id = this.getProfileIdentifier();
            return content;
        },

        renderSuccessfulExport: function() {
            var rbox_urls = JSON.parse(
                localStorage.getItem(
                    this.exported_profiles_rbox_urls_key
                )
            );
            var profile_id = this.getProfileIdentifier();
            var rbox_url = rbox_urls[profile_id];
            var context = {
                view_url: _RBP.RboxManager._meta['BASE_URI'] + rbox_url
            }
            var successful_export_html = _.templateFromId(
                'jst-plugin-successful-export', context);
            $('.rbox-plugin-export-span').html( successful_export_html );
        },

        renderWaitingExport: function() {
            var waiting_export_html = _.templateFromId(
                'jst-plugin-waiting-export', {});
            $( '.rbox-plugin-export-span' ).html( waiting_export_html );
        },

        renderErroneousExport: function() {
            var error_html = _.templateFromId(
                'jst-plugin-erroneous-export', {});
            $( '.rbox-plugin-export-span' ).html( error_html );
        },

        events: function() {
            var self = this;
            $(document).ready(function() {
                self.initLocalStorage();
                self.injectStyling();
                self.initScaffold();
            }).on( 'click',
                '.rbox-plugin-export-btn, .rbox-plugin-reexport-btn',
                function(e) {
                    self.renderWaitingExport();
                    var profile = self.extractProfile();
                    var source_data = _RBP.RboxManager.getSourceObj();
                    source_data.source = 'LinkedIn';
                    var export_data = $.extend({}, profile,
                        { source_data: source_data });
                    _RBP.RboxManager.exportAsCandidate(export_data, {
                        errCallback: function() {
                            self.renderErroneousExport();
                        }
                    } , function( data ) {
                        var rbox_url = '/app/#candidates/view:' + data.id;
                        if( profile.profile_id ) {
                            self.addProfileToLocalStorage(
                                profile.profile_id, rbox_url );
                        }
                        self.renderSuccessfulExport();
                    });
                    e && e.preventDefault();
                }
            );
        }
    };

    
    _RBP.router = function() {
        var href = document.location.href
        var linkedin_url_1 = href.match(
            /^https:\/\/[a-z]*.linkedin.com\/profile\/view.*/g);
        var linkedin_url_2 = href.match(
            /^https:\/\/[a-z]*.linkedin.com\/in\/.*/g);
        if ( linkedin_url_1 || linkedin_url_2 ) {
            _RBP.LinkedIn.events();
        }
    };

    _RBP.events = function() {
        var self = this;
        self.port.onMessage.addListener( function( context ) {
            if( context.request === 'rbox_get_credentials' ) {
                _RBP.RboxManager.getCredentialsCallback( context.data );
            } else if( context.request === 'rbox_export_as_candidate' ) {
                if( context.error ) {
                    _RBP.RboxManager.exportAsCandidateErrCallback(
                        context.error );
                } else {
                    _RBP.RboxManager.exportAsCandidateCallback(
                        context.data );
                }
            }
        });

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


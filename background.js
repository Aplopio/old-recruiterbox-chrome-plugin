(function( $ ) {
    this._RBB = this._RBB || {};

    _RBB.utils = {
        getURL: function( base_url, params ) {
            return base_url + '?' + $.param(params);
        },

        getAuthorizationHeaders: function( access_token ) {
            return { 'Authorization': 'token ' + access_token };
        },

        postJSON: function( url, data, options, callback, errCallback ) {
            options = options || {};
            if( errCallback === undefined ) {
                errCallback = function() {
                    console.error('Something broke');
                    return;
                };
            }
            return $.ajax({
                url: url,
                headers: this.getAuthorizationHeaders( options.access_token ),
                data:JSON.stringify(data),
                type:'POST',
                contentType:'application/json',
                dataType: 'json',
                success: callback,
                error: function(XMLHttpRequest, textStatus, errorThrow) {
                    errCallback( XMLHttpRequest );
                }
            });
        },

        getRequest: function( url, options, callback, errCallback ) {
            options = options || {};
            return $.ajax({
                url: url,
                type: "GET",
                headers: this.getAuthorizationHeaders(
                    options.access_token ),
                success: callback,
                error: errCallback
            });
        },

        slugify: function( text ) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        }
    };

    _RBB.RboxManager = {
        _meta: {
            BASE_URI: 'https://app.recruiterbox.com',
            BASE_API_URI: 'https://app.recruiterbox.com/api/v1',
            BASE_PUBLIC_API_URI: 'https://app.recruiterbox.com/public_api/v1'
            // BASE_URI: 'http://app.rbox.com:8000',
            // BASE_API_URI: 'http://app.rbox.com:8000/api/v1'
            // BASE_PUBLIC_API_URI: 'http://app.rbox.com:8000/public_api/v1'
        },

        _cache: {},

        getURLWithCredentials: function( url, credentials ) {
            var params = $.extend(
                {}, {
                    username: credentials.username,
                    api_key: credentials.api_key
                }, { format: 'json' }
            );
            var url_with_credentials = _RBB.utils.getURL(
                url, params );
            return url_with_credentials;
        },

        getCredentials: function( callback ) {
            var self = this;
            $.get(self._meta.BASE_URI + '/public_api/v1/get_access_token',
                function( data ) {
                    self._cache.current_user_id = data.user_id;
                    self._cache.current_client_id = data.client_id;
                    self._cache.access_token = data.token;
                    callback( data );
                }
            ).error( function( data ) {
                callback( data );
            });
        },

        getUserInfo: function( callback ) {
            var self = this;
            var client_url = this._meta.BASE_API_URI + '/clients/' +
                this._cache.current_client_id + '/';
            var user_url = this._meta.BASE_API_URI + '/users/' +
                this._cache.current_user_id + '/';
            _RBB.utils.getRequest(client_url,
                { access_token: self._cache.access_token },
                function( client_data ) {
                    _RBB.utils.getRequest(user_url,
                        { access_token: self._cache.access_token },
                        function( user_data ) {
                            callback({
                                company_name: client_data.company_name,
                                user_name: user_data.name
                            });
                        }, function() {
                            /* Error handling for failed user fetch */
                        }
                    );
                }, function() {
                    /* Error handling for failed client fetch */
                }
            );
        },

        isLoggedIn: function( callback ) {
            this.getCredentials( function( data ) {
                callback({
                    is_logged_in: Boolean( data && data.token )
                });
            });
        },

        createRboxDocResource: function( html, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            var filename = options.filename || 'profile.html';
            _RBB.utils.postJSON(
                self._meta.BASE_API_URI + '/docs/', {
                    filename: filename,
                    filecontent: html
                }, { access_token: this._cache.access_token },
                callback, errCallback
            );
        },

        createRboxCandidateResource: function( data, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            _RBB.utils.postJSON(
                self._meta.BASE_PUBLIC_API_URI + '/candidates/', data, {
                    access_token: this._cache.access_token
                }, callback, errCallback
            );
        },

        exportAsCandidate: function( data, options, callback, errCallback ) {
            options = options || {};
            var self = this;
            var html = data.background_html;
            var profile_name = data.profile_name || 'no name';
            if( html ) {
                self.createRboxDocResource(
                    html, {
                        filename: _RBB.utils.slugify( profile_name ) + '.html'
                    },
                    function( doc ) {
                        var candidate_data = {
                            first_name: profile_name,
                            last_name: '',
                            resume: doc.resource_uri,
                            candidate_source: data.source_data.source
                        };
                        self.createRboxCandidateResource( candidate_data, {
                        }, callback, errCallback);
                    },
                    errCallback
                );
            }
        }
    };

})( jQuery );

chrome.runtime.onConnect.addListener( function( port ) {
    if( port.name == "RB_PORT" ) {
        port.onMessage.addListener( function( context ) {
            if( context.request === 'rbox_is_logged_in' ) {
                _RBB.RboxManager.isLoggedIn( function( data ) {
                    context.data = data;
                    port.postMessage( context );
                });
            } else if( context.request === 'rbox_get_user_info' ) {
                _RBB.RboxManager.getUserInfo( function( data ) {
                    context.data = data;
                    port.postMessage( context );
                });
            } else if( context.request === 'rbox_export_as_candidate' ) {
                _RBB.RboxManager.exportAsCandidate(
                    context.profile_to_export, {},
                    function( data ){
                        context.data = data;
                        port.postMessage( context );
                    },
                    function( error ) {
                        context.error = error;
                        port.postMessage( context );
                    }
                );
            }
        });
    }
});
